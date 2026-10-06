import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { FORMATIONS } from '@/lib/positions';
import { calculateSquadStrength, simulateMatch, simulateSeason, type SquadSlot } from '@/lib/simulation';

export const roomCode = () => Array.from(randomBytes(6), byte => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte % 32]).join('');
export const roomName = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 30) : '';
export const validEra = (start: number, end: number) => Number.isInteger(start) && Number.isInteger(end) && start >= 2010 && end <= 2026 && start <= end;
export const validFormation = (value: string) => FORMATIONS.some(formation => formation.id === value);

export async function publicRoom(code: string, userId: string) {
  const room = await db.multiplayerRoom.findUnique({ where: { code }, include: {
    seats: { orderBy: { joinedAt: 'asc' }, include: { run: { include: { slots: { orderBy: { slotPosition: 'asc' } } } } } },
  } });
  if (!room || !room.seats.some(seat => seat.userId === userId)) return null;
  const own = room.seats.find(seat => seat.userId === userId);
  return {
    code: room.code, status: room.status, maxPlayers: room.maxPlayers, ratingMode: room.ratingMode,
    eraStartYear: room.eraStartYear, eraEndYear: room.eraEndYear, withManager: room.withManager,
    isHost: room.hostUserId === userId,
    seats: room.seats.map(seat => ({ id: seat.id, name: seat.name, formation: seat.formation,
      ready: seat.ready, drafted: seat.run?.slots.filter(slot => slot.playerSeasonId).length ?? 0,
      result: seat.run?.completed ? { wins: seat.run.wins, draws: seat.run.draws, losses: seat.run.losses,
        points: seat.run.points, overallRating: seat.run.overallRating } : null,
      isYou: seat.userId === userId, isHost: seat.userId === room.hostUserId, isBot: seat.isBot,
      pickDeadline: seat.pickDeadline?.toISOString() ?? null, managerName: seat.managerName,
      managerRating: seat.managerRating,
    })),
    ownRun: own?.run ? { id: own.run.id, formation: own.run.formation, completed: own.run.completed,
      // The pitch coordinates follow formation slot order, not alphabetical position order.
      slots: [...own.run.slots].sort((a, b) => Number(a.slotPosition.split('_').at(-1)) - Number(b.slotPosition.split('_').at(-1))).map(slot => ({ slotPosition: slot.slotPosition, playerSeasonId: slot.playerSeasonId,
        playerLastName: slot.playerLastName, playerRating: room.ratingMode === 'prime' ? slot.playerPrimeRating : slot.playerRating })) } : null,
    results: room.resultJson ? JSON.parse(room.resultJson) : null,
  };
}

export async function createSeatRun(seat: { id: string; name: string; formation: string }, room: { ratingMode: string; eraStartYear: number; eraEndYear: number }, userId?: string) {
  const formation = FORMATIONS.find(value => value.id === seat.formation);
  if (!formation) throw new Error('Неизвестная схема');
  const run = await db.gameRun.create({ data: {
    formation: seat.formation, ratingMode: room.ratingMode, eraStartYear: room.eraStartYear,
    eraEndYear: room.eraEndYear, difficulty: 'normal', draftMode: 'squad_first',
    teamName: seat.name, ...(userId ? { userId } : {}),
    slots: { create: formation.slots.map((slot, index) => ({ slotPosition: `${slot.position}_${index}` })) },
  } });
  await db.multiplayerSeat.update({ where: { id: seat.id }, data: { runId: run.id, pickDeadline: new Date(Date.now() + 180_000) } });
  return run.id;
}

type Result = { id: string; name: string; points: number; wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number; rating: number; matches: { opponent: string; opponentId?: string; home: boolean; for: number; against: number }[] };

// Resolve the room once, from the same squads. Each head-to-head fixture is
// generated once and mirrored into both participants' match lists.
export async function resolveRoom(code: string) {
  const room = await db.multiplayerRoom.findUnique({ where: { code }, include: { seats: { include: { run: { include: { slots: true } } } } } });
  if (!room || room.status !== 'drafting' || room.seats.some(seat => !seat.run || seat.run.slots.filter(slot => slot.playerSeasonId).length !== 11)) return false;
  const season = await db.season.findFirst({ where: { startYear: { gte: room.eraStartYear, lte: room.eraEndYear }, clubSeasons: { some: { players: { some: {} } } } },
    orderBy: { startYear: 'desc' }, include: { clubSeasons: { include: { club: true, players: { select: { rating: true } } } } } });
  const clubs = season?.clubSeasons.filter(club => club.players.length).slice(0, 15) ?? [];
  if (clubs.length < 15) throw new Error('Для сезона нужно 16 клубов в базе');
  const opponents = clubs.map(club => ({ name: club.club.nameEn || club.club.nameRu,
    strength: club.players.map(player => player.rating).sort((a,b) => b-a).slice(0,11).reduce((a,b) => a+b,0) / Math.min(11,club.players.length) }));
  const results: Result[] = room.seats.map(seat => {
    const slots: SquadSlot[] = seat.run!.slots.map(slot => ({ position: slot.slotPosition.split('_')[0],
      playerName: slot.playerName || '', playerRating: (room.ratingMode === 'prime' ? slot.playerPrimeRating : slot.playerRating) || 0,
      isCompatible: slot.isCompatible }));
    const rating = calculateSquadStrength(slots, seat.managerRating || undefined).overall;
    const seasonResult = simulateSeason(slots, seat.managerRating || undefined, false, 0, opponents);
    // Replace the first 2*(n-1) regular fixtures with shared head-to-head
    // fixtures, keeping the season at 30 matches per participant.
    const replaced = 2 * (room.seats.length - 1);
    const retained = seasonResult.matches.slice(replaced);
    return { id: seat.id, name: seat.name, rating, points: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, matches: retained.map(match => ({ opponent: match.opponent, home: match.isHome,
        for: match.isHome ? match.homeGoals : match.awayGoals,
        against: match.isHome ? match.awayGoals : match.homeGoals })) };
  });
  for (let i = 0; i < results.length; i++) for (let j = i+1; j < results.length; j++) {
    for (const homeIndex of [i, j]) {
      const awayIndex = homeIndex === i ? j : i;
      const match = simulateMatch(results[homeIndex].rating, results[awayIndex].rating, true);
      results[homeIndex].matches.push({ opponent: results[awayIndex].name, opponentId: results[awayIndex].id, home: true, for: match.homeGoals, against: match.awayGoals });
      results[awayIndex].matches.push({ opponent: results[homeIndex].name, opponentId: results[homeIndex].id, home: false, for: match.awayGoals, against: match.homeGoals });
    }
  }
  for (const result of results) for (const match of result.matches) {
    result.goalsFor += match.for; result.goalsAgainst += match.against;
    if (match.for > match.against) result.wins++;
    else if (match.for < match.against) result.losses++;
    else result.draws++;
  }
  for (const result of results) result.points = result.wins * 3 + result.draws;
  results.sort((a,b) => b.points-a.points || (b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst) || b.goalsFor-a.goalsFor);
  const changed = await db.multiplayerRoom.updateMany({ where: { code, status: 'drafting' }, data: { status: 'completed', resultJson: JSON.stringify(results) } });
  if (!changed.count) return false;
  await db.$transaction(results.map((result, index) => db.gameRun.update({ where: { id: room.seats.find(seat => seat.id === result.id)!.runId! }, data: {
    completed: true, wins: result.wins, draws: result.draws, losses: result.losses, points: result.points,
    goalsFor: result.goalsFor, goalsAgainst: result.goalsAgainst, position: index + 1, overallRating: Math.round(result.rating),
  } })));
  return true;
}
