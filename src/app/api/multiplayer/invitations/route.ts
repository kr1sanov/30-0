import { after } from 'next/server';
import { queueSocialNotification, flushSocialNotifications, escapeTelegramHtml } from '@/lib/socialNotifications';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { roomCode } from '@/lib/multiplayer';
import { ERA_CONFIG } from '@/lib/types';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const invitations = await db.multiplayerInvite.findMany({ where: { toId: userId, status: 'pending', createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } }, orderBy: { createdAt: 'desc' }, take: 30 });
  const rooms = await db.multiplayerRoom.findMany({ where: { code: { in: invitations.map(inv => inv.roomCode) }, status: 'lobby' }, select: { code: true, seatCount: true, maxPlayers: true } });
  const available = new Set(rooms.filter(room => room.seatCount < room.maxPlayers).map(room => room.code));
  const users = await db.user.findMany({ where: { id: { in: invitations.map(inv => inv.fromId) } }, select: { id: true, displayName: true, username: true } });
  const people = new Map(users.map(user => [user.id, user]));
  return NextResponse.json({ invitations: invitations.filter(inv => available.has(inv.roomCode)).map(inv => ({ id: inv.id, code: inv.roomCode, from: people.get(inv.fromId), createdAt: inv.createdAt })) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'multiplayer:invitation', { limit: 12, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const { toId, code } = await request.json().catch(() => ({ toId: null, code: null }));
  if (typeof toId !== 'string' || toId.length > 100 || toId === userId) return NextResponse.json({ error: 'Выбери другого игрока' }, { status: 400 });
  const [recipient, sender] = await Promise.all([
    db.user.findUnique({ where: { id: toId }, select: { id: true } }),
    db.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
  ]);
  if (!recipient || !sender) return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
  let room = typeof code === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(code) ? await db.multiplayerRoom.findUnique({ where: { code } }) : null;
  if (code && (!room || room.status !== 'lobby' || room.seatCount >= room.maxPlayers || !await db.multiplayerSeat.findUnique({ where: { roomCode_userId: { roomCode: room.code, userId } } })))
    return NextResponse.json({ error: 'Лобби недоступно' }, { status: 409 });
  if (!room) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        room = await db.multiplayerRoom.create({ data: { code: roomCode(), hostUserId: userId, maxPlayers: 2, eraStartYear: ERA_CONFIG.all.minYear, eraEndYear: ERA_CONFIG.all.maxYear, seats: { create: { userId, name: sender.displayName } } } });
        break;
      } catch (error) { if ((error as { code?: string }).code !== 'P2002') throw error; }
    }
  }
  if (!room) return NextResponse.json({ error: 'Не удалось создать лобби' }, { status: 503 });
  if (await db.multiplayerSeat.findUnique({ where: { roomCode_userId: { roomCode: room.code, userId: toId } } })) return NextResponse.json({ code: room.code, status: 'joined' });
  const previous = await db.multiplayerInvite.findUnique({ where: { roomCode_toId: { roomCode: room.code, toId } } });
  const activeRoom = room;
  await db.$transaction(async tx => {
    const invitation = await tx.multiplayerInvite.upsert({ where: { roomCode_toId: { roomCode: activeRoom.code, toId } }, create: { roomCode: activeRoom.code, toId, fromId: userId }, update: previous?.status === 'pending' ? {} : { fromId: userId, status: 'pending', createdAt: new Date() } });
    if (previous?.status !== 'pending') await queueSocialNotification(`invite:${invitation.id}:${invitation.createdAt.getTime()}`, toId, `${escapeTelegramHtml(sender.displayName)} invites you to play 30-0.`, `room_${activeRoom.code}`, tx);
  });
  after(flushSocialNotifications);
  return NextResponse.json({ code: room.code, status: 'pending' });
}

export async function PATCH(request: Request) {
  const limited = enforceRateLimit(request, 'multiplayer:invitation-response', { limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const { id, action } = await request.json().catch(() => ({ id: null, action: null }));
  if (typeof id !== 'string' || id.length > 100 || !['accept', 'decline'].includes(action)) return NextResponse.json({ error: 'Некорректное приглашение' }, { status: 400 });
  try {
    const invitation = await db.multiplayerInvite.findFirst({ where: { id, toId: userId, status: 'pending' } });
    if (!invitation) return NextResponse.json({ error: 'Приглашение уже обработано' }, { status: 409 });
    if (action === 'decline') {
      await db.multiplayerInvite.updateMany({ where: { id, toId: userId, status: 'pending' }, data: { status: 'declined' } });
      return NextResponse.json({ status: 'declined' });
    }
    const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    if (!user) return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    await db.$transaction(async tx => {
      const claimed = await tx.multiplayerInvite.updateMany({ where: { id, toId: userId, status: 'pending' }, data: { status: 'accepted' } });
      if (!claimed.count) throw new Error('Приглашение уже обработано');
      const seat = await tx.multiplayerSeat.findUnique({ where: { roomCode_userId: { roomCode: invitation.roomCode, userId } } });
      if (!seat) {
        const reserved = await tx.multiplayerRoom.updateMany({ where: { code: invitation.roomCode, status: 'lobby', seatCount: { lt: 6 } }, data: { seatCount: { increment: 1 } } });
        if (!reserved.count) throw new Error('Лобби уже закрыто');
        const room = await tx.multiplayerRoom.findUnique({ where: { code: invitation.roomCode }, select: { seatCount: true, maxPlayers: true } });
        if (!room || room.seatCount > room.maxPlayers) throw new Error('Все места заняты');
        await tx.multiplayerSeat.create({ data: { roomCode: invitation.roomCode, userId, name: user.displayName } });
      }
    });
    return NextResponse.json({ code: invitation.roomCode, status: 'accepted' });
  } catch (error) { return NextResponse.json({ error: (error as Error).message || 'Не удалось присоединиться' }, { status: 409 }); }
}
