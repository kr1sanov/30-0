import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войди через Telegram' }, { status: 401 });
  const seats = await db.multiplayerSeat.findMany({
    where: { userId, OR: [
      { room: { status: 'lobby' } },
      { room: { status: 'drafting' } },
      { resultViewedAt: null, room: { status: 'completed' } },
    ] }, orderBy: { joinedAt: 'desc' }, take: 20,
    select: { roomCode: true, pickDeadline: true, runId: true, room: { select: { status: true, hostUserId: true, seats: { select: { name: true } } } } },
  });
  const hostedCodes = seats.filter(seat => seat.room.status === 'lobby' && seat.room.hostUserId === userId).map(seat => seat.roomCode);
  const [invites, history] = await Promise.all([
    hostedCodes.length ? db.multiplayerInvite.findMany({ where: { roomCode: { in: hostedCodes }, status: { in: ['pending', 'declined'] } } }) : [],
    db.multiplayerSeat.findMany({ where: { userId, resultViewedAt: { not: null }, room: { status: 'completed' } }, orderBy: { joinedAt: 'desc' }, take: 20,
      include: { room: { select: { code: true, seriesRootCode: true, updatedAt: true, seats: { select: { name: true } } } } } }),
  ]);
  const invitees = invites.length ? await db.user.findMany({ where: { id: { in: invites.map(invite => invite.toId) } }, select: { id: true, displayName: true, username: true } }) : [];
  const names = new Map(invitees.map(person => [person.id, person.username ? `@${person.username}` : person.displayName]));
  const runIds = seats.flatMap(seat => seat.runId ? [seat.runId] : []);
  const counts = runIds.length ? await db.gameSlot.groupBy({ by: ['runId'],
    where: { runId: { in: runIds }, playerSeasonId: { not: null } }, _count: { _all: true } }) : [];
  const draftedCounts = new Map(counts.map(row => [row.runId, row._count._all]));
  const activeRooms = seats.map(seat => ({
    code: seat.roomCode, status: seat.room.status,
    deadline: seat.pickDeadline?.toISOString() ?? null,
    drafted: seat.runId ? draftedCounts.get(seat.runId) ?? 0 : 0,
    participants: seat.room.seats.map(member => member.name),
    invitations: invites.filter(invite => invite.roomCode === seat.roomCode).map(invite => ({ name: names.get(invite.toId) ?? 'Игрок', status: invite.status })),
  }));
  return NextResponse.json({
    activeRooms,
    historyRooms: history.filter((seat, index) => history.findIndex(other => (other.room.seriesRootCode ?? other.roomCode) === (seat.room.seriesRootCode ?? seat.roomCode)) === index).map(seat => ({ code: seat.roomCode, date: seat.room.updatedAt, participants: seat.room.seats.map(member => member.name) })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
