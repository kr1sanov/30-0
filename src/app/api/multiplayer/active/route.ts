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
    seats.find(seat => seat.room.status === 'lobby' && seat.room.createdAt.getTime() > Date.now() - 7 * 86400000);
  const invitations = seats.filter(seat => seat.room.status === 'lobby' && seat.room.hostUserId !== userId &&
    seat.room.createdAt.getTime() > Date.now() - 7 * 86400000).map(seat => ({
      code: seat.roomCode, host: seat.room.seats.find(other => other.userId === seat.room.hostUserId)?.name ?? 'Игрок',
      joinedAt: seat.joinedAt.toISOString(),
    }));
  const completed = seats.filter(seat => seat.room.status === 'completed');
  const friends = new Map<string, { id: string; name: string; games: number; lastPlayed: string }>();
  for (const seat of completed) for (const other of seat.room.seats) {
    if (!other.userId || other.userId === userId || other.isBot) continue;
    const prior = friends.get(other.userId);
    if (prior) prior.games++;
    else friends.set(other.userId, { id: other.userId, name: other.name, games: 1, lastPlayed: seat.room.createdAt.toISOString() });
  }
  return NextResponse.json({
    activeRoom: active ? { code: active.roomCode, status: active.room.status,
      deadline: active.pickDeadline?.toISOString() ?? null, drafted: active.runId ? await db.gameSlot.count({ where: { runId: active.runId, playerSeasonId: { not: null } } }) : 0 } : null,
    invitations, friends: [...friends.values()].slice(0, 30),
    recentRooms: completed.slice(0, 5).map(seat => ({ code: seat.roomCode, date: seat.room.createdAt.toISOString(),
      participants: seat.room.seats.map(other => other.name) })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
