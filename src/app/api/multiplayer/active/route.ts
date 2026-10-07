import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const seats = await db.multiplayerSeat.findMany({
    where: { userId, room: { status: { in: ['lobby', 'drafting'] } } }, orderBy: { joinedAt: 'desc' }, take: 20,
    include: { room: true },
  });
  const active = seats.find(seat => seat.room.status === 'drafting') ??
    seats.find(seat => seat.room.status === 'lobby' && (seat.room.hostUserId === userId || seat.ready) &&
      seat.room.createdAt.getTime() > Date.now() - 7 * 86400000);
  return NextResponse.json({
    activeRoom: active ? { code: active.roomCode, status: active.room.status,
      deadline: active.pickDeadline?.toISOString() ?? null, drafted: active.runId ? await db.gameSlot.count({ where: { runId: active.runId, playerSeasonId: { not: null } } }) : 0 } : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
