import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveRoom } from '@/lib/multiplayer';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(request, 'multiplayer:finish', { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  const { code } = await params;
  const seat = userId ? await db.multiplayerSeat.findUnique({ where: { roomCode_userId: { roomCode: code.toUpperCase(), userId } }, include: { run: { include: { slots: true } }, room: true } }) : null;
  if (!seat) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  if (seat.room.status !== 'drafting') return NextResponse.json({ error: 'Сезон уже запущен' }, { status: 409 });
  if (!seat.run || seat.run.slots.filter(slot => slot.playerSeasonId).length !== 11)
    return NextResponse.json({ error: 'Сначала соберите 11 игроков' }, { status: 400 });
  await db.multiplayerSeat.update({ where: { id: seat.id }, data: { ready: true } });
  const waiting = await db.multiplayerSeat.count({ where: { roomCode: seat.roomCode, ready: false } });
  if (!waiting) {
    try { await resolveRoom(seat.roomCode); }
    catch (error) { console.error('Multiplayer season:', error); return NextResponse.json({ error: 'Не удалось сыграть сезон' }, { status: 503 }); }
  }
  return NextResponse.json({ ok: true });
}
