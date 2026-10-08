import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';

export const runtime = 'nodejs';

function longestWinStreak(matches: { for: number; against: number }[]) {
  let longest = 0, current = 0;
  for (const match of matches) {
    current = match.for > match.against ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войди через Telegram' }, { status: 401 });
  const { code } = await params;
  const final = await db.multiplayerRoom.findUnique({ where: { code: code.toUpperCase() }, select: {
    code: true, seriesRootCode: true, seriesWinnerKey: true, status: true, seriesTargetWins: true,
    seats: { select: { userId: true } },
  } });
  if (!final?.seats.some(seat => seat.userId === userId)) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  if (final.status !== 'completed' || !final.seriesWinnerKey || !final.seriesTargetWins)
    return NextResponse.json({ error: 'Серия ещё не завершена' }, { status: 409 });

  const root = final.seriesRootCode ?? final.code;
  const rooms = await db.multiplayerRoom.findMany({ where: { OR: [{ code: root }, { seriesRootCode: root }], status: 'completed' },
    orderBy: { seriesRound: 'asc' }, include: { seats: { include: { run: { include: { slots: true } } } } } });
  const rounds = rooms.map(room => {
    type Result = { id: string; name: string; rating: number; wins: number; points: number; goalsFor: number; matches: { for: number; against: number }[] };
    const results = JSON.parse(room.resultJson ?? '[]') as Result[];
    return { round: room.seriesRound, code: room.code, winner: results[0]?.name ?? '',
      squads: results.map((result, index) => {
        const seat = room.seats.find(item => item.id === result.id);
        return { memberKey: seat?.seriesMemberKey ?? seat?.userId ?? `bot:${result.id}`, name: result.name,
          rank: index + 1, rating: Math.round(result.rating), points: result.points,
          wins: result.wins, goalsFor: result.goalsFor, winStreak: longestWinStreak(result.matches),
          formation: seat?.formation ?? '', players: (seat?.run?.slots ?? [])
            .sort((a, b) => Number(a.slotPosition.split('_').at(-1)) - Number(b.slotPosition.split('_').at(-1)))
            .map(slot => ({ position: slot.slotPosition.split('_')[0], name: slot.playerName || slot.playerLastName || '—', rating: slot.playerRating ?? 0 })),
        };
      }) };
  });
  const allSquads = rounds.flatMap(round => round.squads);
  const bestSquad = allSquads.reduce<(typeof allSquads)[number] | null>((best, squad) => !best || squad.rating > best.rating ? squad : best, null);
  const bestStreak = allSquads.reduce<(typeof allSquads)[number] | null>((best, squad) => !best || squad.winStreak > best.winStreak ? squad : best, null);
  return NextResponse.json({ rounds, bestSquad: bestSquad ? { name: bestSquad.name, rating: bestSquad.rating } : null,
    bestStreak: bestStreak ? { name: bestStreak.name, wins: bestStreak.winStreak } : null },
  { headers: { 'Cache-Control': 'no-store' } });
}
