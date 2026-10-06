import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publicRoom, resolveRoom, roomName, validEra, validFormation } from '@/lib/multiplayer';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';
import { setRunAccessCookie } from '@/lib/runAccess';
import { draftBot } from '@/lib/multiplayerBots';

type Context = { params: Promise<{ code: string }> };
export const runtime = 'nodejs';

export async function GET(request: Request, { params }: Context) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const { code } = await params;
  const authorized = await db.multiplayerSeat.findUnique({ where: { roomCode_userId: { roomCode: code.toUpperCase(), userId } } });
  if (!authorized) return NextResponse.json({ error: 'Комната недоступна' }, { status: 404 });
  const expired = await db.multiplayerSeat.findMany({ where: { roomCode: code.toUpperCase(),
    isBot: false, pickDeadline: { lte: new Date() },
    room: { status: 'drafting' } }, include: { room: true } });
  for (const seat of expired) {
    if (!seat.runId) continue;
    const claimed = await db.multiplayerSeat.updateMany({ where: { id: seat.id, pickDeadline: seat.pickDeadline },
      data: { pickDeadline: null } });
    if (!claimed.count) continue;
    try {
      await draftBot(seat.runId, seat.room.eraStartYear, seat.room.eraEndYear, 11);
      await db.multiplayerSeat.update({ where: { id: seat.id }, data: { ready: true } });
    } catch (error) {
      console.error('Multiplayer auto finish:', error);
      await db.multiplayerSeat.update({ where: { id: seat.id }, data: { pickDeadline: seat.pickDeadline } });
    }
  }
  const waiting = await db.multiplayerSeat.count({ where: { roomCode: code.toUpperCase(), ready: false } });
  const activeClocks = await db.multiplayerSeat.count({ where: { roomCode: code.toUpperCase(), isBot: false, pickDeadline: { gt: new Date() } } });
  if (!waiting && !activeClocks) await resolveRoom(code.toUpperCase()).catch(error => console.error('Multiplayer resolve:', error));
  const room = await publicRoom(code.toUpperCase(), userId);
  if (!room) return NextResponse.json({ error: 'Комната недоступна' }, { status: 404 });
  const response = NextResponse.json(room, { headers: { 'Cache-Control': 'no-store' } });
  if (room.ownRun) setRunAccessCookie(response, room.ownRun.id);
  return response;
}

export async function PATCH(request: Request, { params }: Context) {
  const limited = enforceRateLimit(request, 'multiplayer:update', { limit: 50, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const { code } = await params;
  const room = await db.multiplayerRoom.findUnique({ where: { code: code.toUpperCase() }, include: { seats: true } });
  if (!room || !room.seats.some(seat => seat.userId === userId)) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Лобби закрыто' }, { status: 409 });
  try {
    const body = await request.json();
    if (body.action === 'seat') {
      const formation = String(body.formation);
      const name = roomName(body.name);
      if (!validFormation(formation) || name.length < 2) return NextResponse.json({ error: 'Проверьте имя и схему' }, { status: 400 });
      await db.multiplayerSeat.update({ where: { roomCode_userId: { roomCode: room.code, userId } },
        data: { formation, name, ready: Boolean(body.ready) } });
    } else if (body.action === 'settings' && room.hostUserId === userId) {
      const maxPlayers = Number(body.maxPlayers), eraStartYear = Number(body.eraStartYear), eraEndYear = Number(body.eraEndYear);
      if (!Number.isInteger(maxPlayers) || maxPlayers < room.seatCount || maxPlayers > 6 || maxPlayers < 2 ||
        !validEra(eraStartYear, eraEndYear) || !['season', 'prime'].includes(body.ratingMode)) {
        return NextResponse.json({ error: 'Неверные правила' }, { status: 400 });
      }
      await db.multiplayerRoom.update({ where: { code: room.code }, data: {
        maxPlayers, eraStartYear, eraEndYear, ratingMode: body.ratingMode, withManager: Boolean(body.withManager),
      } });
      await db.multiplayerSeat.updateMany({ where: { roomCode: room.code, isBot: false }, data: { ready: false } });
    } else if (body.action === 'bot' && room.hostUserId === userId) {
      const reserved = await db.multiplayerRoom.updateMany({ where: { code: room.code, status: 'lobby', seatCount: { lt: room.maxPlayers } }, data: { seatCount: { increment: 1 } } });
      if (!reserved.count) return NextResponse.json({ error: 'Все места заняты' }, { status: 409 });
      try { await db.multiplayerSeat.create({ data: { roomCode: room.code, isBot: true, name: `Бот ${room.seatCount}`, ready: true } }); }
      catch (error) { await db.multiplayerRoom.update({ where: { code: room.code }, data: { seatCount: { decrement: 1 } } }); throw error; }
    } else if (body.action === 'remove-bot' && room.hostUserId === userId) {
      const botId = typeof body.botId === 'string' ? body.botId : '';
      const bot = room.seats.find(seat => seat.id === botId && seat.isBot);
      if (!bot) return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });
      await db.$transaction(async tx => {
        const reserved = await tx.multiplayerRoom.updateMany({ where: { code: room.code, status: 'lobby' }, data: { seatCount: { decrement: 1 } } });
        if (!reserved.count) throw new Error('Лобби закрыто');
        const removed = await tx.multiplayerSeat.deleteMany({ where: { id: bot.id, roomCode: room.code, isBot: true } });
        if (!removed.count) throw new Error('Бот уже удалён');
      });
    } else return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    return NextResponse.json(await publicRoom(room.code, userId));
  } catch (error) { console.error('Multiplayer update:', error); return NextResponse.json({ error: 'Не удалось изменить комнату' }, { status: 500 }); }
}
