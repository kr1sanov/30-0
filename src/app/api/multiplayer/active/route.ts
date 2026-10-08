import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войди через Telegram' }, { status: 401 });
  const seats = await db.multiplayerSeat.findMany({
    where: { userId, OR: [{ room: { status: 'drafting' } }, { resultViewedAt: null, room: { status: 'completed' } }] }, orderBy: { joinedAt: 'desc' }, take: 20,
    include: { room: true },
  });
  const active = seats.find(seat => seat.room.status === 'drafting') ?? seats.find(seat => seat.room.status === 'completed');
  return NextResponse.json({
    activeRoom: active ? { code: active.roomCode, status: active.room.status,
      deadline: active.pickDeadline?.toISOString() ?? null, drafted: active.runId ? await db.gameSlot.count({ where: { runId: active.runId, playerSeasonId: { not: null } } }) : 0 } : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
