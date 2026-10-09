import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войди через Telegram' }, { status: 401 });
  const seats = await db.multiplayerSeat.findMany({
    where: { userId, OR: [
      { room: { status: 'lobby', seatCount: { gte: 2 } } },
      { room: { status: 'drafting' } },
      { resultViewedAt: null, room: { status: 'completed' } },
    ] }, orderBy: { joinedAt: 'desc' }, take: 20,
    include: { room: { include: { seats: { select: { name: true, isBot: true } } } } },
  });
  const activeRooms = await Promise.all(seats.map(async seat => ({
    code: seat.roomCode, status: seat.room.status,
    deadline: seat.pickDeadline?.toISOString() ?? null,
    drafted: seat.runId ? await db.gameSlot.count({ where: { runId: seat.runId, playerSeasonId: { not: null } } }) : 0,
    participants: seat.room.seats.map(member => member.name),
  })));
  return NextResponse.json({
    activeRooms,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
