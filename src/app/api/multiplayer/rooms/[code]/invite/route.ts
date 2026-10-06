import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(request, 'multiplayer:invite', { limit: 12, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  const { code } = await params;
  const targetId = String((await request.json().catch(() => ({}))).userId ?? '');
  const room = await db.multiplayerRoom.findUnique({ where: { code: code.toUpperCase() }, include: { seats: true } });
  if (!userId || !room || room.hostUserId !== userId || room.status !== 'lobby')
    return NextResponse.json({ error: 'Приглашение недоступно' }, { status: 403 });
  if (!targetId || targetId === userId) return NextResponse.json({ error: 'Выберите друга' }, { status: 400 });
  if (room.seats.some(seat => seat.userId === targetId)) return NextResponse.json({ ok: true });
  // Only people who have already played a completed room together may receive a direct invitation.
  const shared = await db.multiplayerRoom.findFirst({ where: { status: 'completed', AND: [
    { seats: { some: { userId } } }, { seats: { some: { userId: targetId } } },
  ] }, include: { seats: { where: { userId: targetId }, select: { name: true } } } });
  if (!shared) return NextResponse.json({ error: 'Общих игр не найдено' }, { status: 403 });
  const reserved = await db.multiplayerRoom.updateMany({ where: { code: room.code, status: 'lobby', seatCount: { lt: room.maxPlayers } }, data: { seatCount: { increment: 1 } } });
  if (!reserved.count) return NextResponse.json({ error: 'Все места заняты' }, { status: 409 });
  try {
    await db.multiplayerSeat.create({ data: { roomCode: room.code, userId: targetId, name: shared.seats[0]?.name || 'Друг' } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await db.multiplayerRoom.update({ where: { code: room.code }, data: { seatCount: { decrement: 1 } } });
    throw error;
  }
}
