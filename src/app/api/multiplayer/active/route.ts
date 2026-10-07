import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const seats = await db.multiplayerSeat.findMany({
    where: { userId }, orderBy: { joinedAt: 'desc' }, take: 60,
    include: { room: { include: { seats: { select: { userId: true, name: true, isBot: true } } } } },
  });
  const active = seats.find(seat => seat.room.status === 'drafting') ??
    seats.find(seat => seat.room.status === 'lobby' && (seat.room.hostUserId === userId || seat.ready) &&
      seat.room.createdAt.getTime() > Date.now() - 7 * 86400000);
  const completed = seats.filter(seat => seat.room.status === 'completed');
  const seenGroups = new Set<string>();
  const recentRooms = completed.filter(seat => {
    const participants = seat.room.seats.filter(other => other.userId && !other.isBot)
      .map(other => other.userId!).sort().join(':');
    if (seenGroups.has(participants)) return false;
    seenGroups.add(participants);
    return true;
  }).slice(0, 5);
  return NextResponse.json({
    activeRoom: active ? { code: active.roomCode, status: active.room.status,
      deadline: active.pickDeadline?.toISOString() ?? null, drafted: active.runId ? await db.gameSlot.count({ where: { runId: active.runId, playerSeasonId: { not: null } } }) : 0 } : null,
    recentRooms: recentRooms.map(seat => ({ code: seat.roomCode, date: seat.room.createdAt.toISOString(),
      participants: seat.room.seats.filter(other => !other.isBot).map(other => other.name),
      bots: seat.room.seats.filter(other => other.isBot).length })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
