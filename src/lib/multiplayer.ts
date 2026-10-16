import { simulateContributions, type SeasonPlayerStat } from './seasonAnalytics';
import { queueSeasonResult } from './seasonResultNotification';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { FORMATIONS } from '@/lib/positions';
import { calculateSquadStrength, simulateMatch, simulateSeason, type SquadSlot } from '@/lib/simulation';
import { ERA_MIN_YEAR, ERA_MAX_YEAR } from '@/lib/types';

export const roomCode = () => Array.from(randomBytes(6), byte => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte % 32]).join('');
export const roomName = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 30) : '';
export const validEra = (start: number, end: number) => Number.isInteger(start) && Number.isInteger(end) && start >= ERA_MIN_YEAR && end <= ERA_MAX_YEAR && start <= end;
export const validFormation = (value: string) => FORMATIONS.some(formation => formation.id === value);
export type SeriesScore = Record<string, { name: string; wins: number; seasonWins: number; points: number; isBot: boolean }>;

export async function syncLobbyCountdown(code: string) {
  const room = await db.multiplayerRoom.findUnique({ where: { code }, select: { status: true, draftStartAt: true } });
  if (!room || room.status !== 'lobby') return;
  await db.multiplayerSeat.updateMany({ where: { roomCode: code, isBot: false, ready: true, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(Date.now() - 12_000) } }] }, data: { ready: false } });
  const seats = await db.multiplayerSeat.findMany({ where: { roomCode: code }, select: { ready: true } });
  if (seats.length < 2 || seats.some(seat => !seat.ready)) {
    if (room.draftStartAt) await db.multiplayerRoom.updateMany({ where: { code, status: 'lobby' }, data: { draftStartAt: null } });
  } else if (!room.draftStartAt) {
    await db.multiplayerRoom.updateMany({ where: { code, status: 'lobby', draftStartAt: null }, data: { draftStartAt: new Date(Date.now() + 5_000) } });
  }
}

export async function publicRoom(code: string, userId: string) {
  const room = await db.multiplayerRoom.findUnique({ where: { code }, include: {
    seats: { orderBy: { joinedAt: 'asc' }, include: { run: { include: { slots: { orderBy: { slotPosition: 'asc' } } } } } },
  } });
  if (!room || !room.seats.some(seat => seat.userId === userId)) return null;
  const own = room.seats.find(seat => seat.userId === userId);
  const friends = await db.friendship.findMany({ where: { status: 'accepted', OR: [{ fromId: userId }, { toId: userId }] }, select: { fromId: true, toId: true } });
  const friendIds = new Set(friends.map(item => item.fromId === userId ? item.toId : item.fromId));
  const invites = room.status === 'lobby' && room.hostUserId === userId
    ? await db.multiplayerInvite.findMany({ where: { roomCode: code, status: { in: ['pending', 'declined'] } } }) : [];
  const invitees = invites.length ? await db.user.findMany({ where: { id: { in: invites.map(invite => invite.toId) } }, select: { id: true, displayName: true, username: true } }) : [];
  const inviteeNames = new Map(invitees.map(person => [person.id, person.username ? `@${person.username}` : person.displayName]));
  return {
    code: room.code, status: room.status, draftStartAt: room.draftStartAt?.toISOString() ?? null, maxPlayers: room.maxPlayers, ratingMode: room.ratingMode,
    seriesTargetWins: room.seriesTargetWins, seriesRound: room.seriesRound,
    seriesScores: room.seriesScoreJson ? JSON.parse(room.seriesScoreJson) as SeriesScore : {},
    seriesWinnerKey: room.seriesWinnerKey, nextRoomCode: room.nextRoomCode,
    ownResultViewed: Boolean(own?.resultViewedAt),
    eraStartYear: room.eraStartYear, eraEndYear: room.eraEndYear, eraFilter: room.eraFilter,
    draftMode: room.draftMode, showRatings: room.showRatings, withManager: false,
    isHost: room.hostUserId === userId,
    invitations: invites.map(invite => ({ name: inviteeNames.get(invite.toId) ?? 'Игрок', status: invite.status })),
    seats: room.seats.map(seat => ({ id: seat.id, name: seat.name, formation: seat.formation,
      ready: seat.ready, forfeited: seat.forfeited, seriesMemberKey: seat.seriesMemberKey ?? seat.userId ?? `bot:${seat.id}`,
      drafted: seat.run?.slots.filter(slot => slot.playerSeasonId).length ?? 0,
      result: seat.run?.completed ? { wins: seat.run.wins, draws: seat.run.draws, losses: seat.run.losses,
        points: seat.run.points, overallRating: seat.run.overallRating } : null,
      isFriend: Boolean(seat.userId && friendIds.has(seat.userId)), isYou: seat.userId === userId, isHost: seat.userId === room.hostUserId, isBot: seat.isBot,
      pickDeadline: seat.pickDeadline?.toISOString() ?? null, managerName: null,
      managerRating: null,
    })),
    pendingSpin: own?.pendingSpinJson && room.status === 'drafting' ? JSON.parse(own.pendingSpinJson) : null,
    ownRun: own?.run ? { id: own.run.id, formation: own.run.formation, completed: own.run.completed,
      rerollsLeft: Math.max(0, own.run.rerollsTotal - own.run.rerollsUsed),
      // The pitch coordinates follow formation slot order, not alphabetical position order.
      slots: [...own.run.slots].sort((a, b) => Number(a.slotPosition.split('_').at(-1)) - Number(b.slotPosition.split('_').at(-1))).map(slot => ({ slotPosition: slot.slotPosition, playerSeasonId: slot.playerSeasonId,
        playerLastName: slot.playerLastName, playerName: slot.playerName, playerRating: room.ratingMode === 'prime' ? slot.playerPrimeRating : slot.playerRating,
        playerSeasonYear: slot.playerSeasonYear, playerPosition: slot.playerPosition,
        playerOtherPositions: slot.playerOtherPositions ? slot.playerOtherPositions.split(',').map(value => value.trim()) : [] })) } : null,
    results: room.status === 'completed' && room.resultJson ? JSON.parse(room.resultJson) : null,
  };
}

export async function createSeatRun(seat: { id: string; name: string; formation: string }, room: { code: string; seriesRound: number; ratingMode: string; draftMode: string; eraFilter: string; eraStartYear: number; eraEndYear: number }, userId?: string) {
  const formation = FORMATIONS.find(value => value.id === seat.formation);
  if (!formation) throw new Error('Неизвестная схема');
  const run = await db.gameRun.create({ data: {
    gameMode: 'multiplayer', multiplayerRoomCode: room.code, multiplayerRound: room.seriesRound,
    formation: seat.formation, ratingMode: room.ratingMode, eraStartYear: room.eraStartYear,
    eraEndYear: room.eraEndYear, eraFilter: room.eraFilter, difficulty: 'normal', draftMode: room.draftMode,
    teamName: seat.name, ...(userId ? { userId } : {}),
    slots: { create: formation.slots.map((slot, index) => ({ slotPosition: `${slot.position}_${index}` })) },
  } });
  await db.multiplayerSeat.update({ where: { id: seat.id }, data: { runId: run.id } });
  return run.id;
}

type Result = { playerStats?: SeasonPlayerStat[]; id: string; name: string; points: number; wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number; rating: number; forfeited: boolean; matches: { opponent: string; opponentId?: string; home: boolean; for: number; against: number }[] };

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
    const rating = calculateSquadStrength(slots, undefined).overall;
    const seasonResult = simulateSeason(slots, undefined, false, 0, opponents);
    // Replace the first 2*(n-1) regular fixtures with shared head-to-head
    // fixtures, keeping the season at 30 matches per participant.
    const replaced = 2 * (room.seats.length - 1);
    const retained = seasonResult.matches.slice(replaced);
    return { id: seat.id, name: seat.name, rating, forfeited: seat.forfeited, points: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, matches: retained.map(match => ({ opponent: match.opponent, home: match.isHome,
        for: match.isHome ? match.homeGoals : match.awayGoals,
        against: match.isHome ? match.awayGoals : match.homeGoals })) };
  });
  for (let i = 0; i < results.length; i++) for (let j = i+1; j < results.length; j++) {
    for (const homeIndex of [i, j]) {
      const awayIndex = homeIndex === i ? j : i;
      const match = simulateMatch(results[homeIndex].rating, results[awayIndex].rating, true);
      // Spread direct fixtures through the season instead of appending them at the end.
      const round = Math.min(29, Math.floor((results[homeIndex].matches.length + 1) * (homeIndex === i ? 1 : 2) / 3));
      results[homeIndex].matches.splice(round, 0, { opponent: results[awayIndex].name, opponentId: results[awayIndex].id, home: true, for: match.homeGoals, against: match.awayGoals });
      results[awayIndex].matches.splice(round, 0, { opponent: results[homeIndex].name, opponentId: results[homeIndex].id, home: false, for: match.awayGoals, against: match.homeGoals });
    }
  }
  for (const result of results) for (const match of result.matches) {
    result.goalsFor += match.for; result.goalsAgainst += match.against;
    if (match.for > match.against) result.wins++;
    else if (match.for < match.against) result.losses++;
    else result.draws++;
  }
  for (const result of results) result.points = result.wins * 3 + result.draws;
  results.sort((a,b) => Number(a.forfeited)-Number(b.forfeited) || b.points-a.points || (b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst) || b.goalsFor-a.goalsFor || a.id.localeCompare(b.id));
  for (const result of results) {
    const seat = room.seats.find(seat => seat.id === result.id)!;
    result.playerStats = simulateContributions(result.name, seat.run!.slots.map(slot => ({ name: slot.playerName || '', position: slot.slotPosition.split('_')[0], rating: slot.playerRating || 0 })), result.goalsFor, `${seat.runId}:${result.id}`).stats;
  }
  const scores: SeriesScore = room.seriesScoreJson ? JSON.parse(room.seriesScoreJson) : {};
  let seriesWinnerKey: string | null = null;
  if (room.seriesTargetWins > 0) {
    for (const result of results) {
      const seat = room.seats.find(value => value.id === result.id)!;
      const key = seat.seriesMemberKey ?? seat.userId ?? `bot:${seat.id}`;
      const previous = scores[key];
      scores[key] = { name: result.name, isBot: seat.isBot, wins: (previous?.wins ?? 0) + Number(result.id === results[0].id),
        seasonWins: (previous?.seasonWins ?? 0) + result.wins, points: (previous?.points ?? 0) + result.points };
      if (scores[key].wins >= room.seriesTargetWins) seriesWinnerKey = key;
    }
  }
  const changed = await db.multiplayerRoom.updateMany({ where: { code, status: 'drafting' }, data: { status: 'completed', resultJson: JSON.stringify(results),
    ...(room.seriesTargetWins > 0 ? { seriesScoreJson: JSON.stringify(scores), seriesWinnerKey } : {}) } });
  if (!changed.count) return false;
  await db.$transaction(results.map((result, index) => db.gameRun.update({ where: { id: room.seats.find(seat => seat.id === result.id)!.runId! }, data: {
    completed: true, completedAt:new Date(), wins: result.wins, draws: result.draws, losses: result.losses, points: result.points,
    goalsFor: result.goalsFor, goalsAgainst: result.goalsAgainst, position: index + 1, overallRating: Math.round(result.rating),
  } })));
  await Promise.all(room.seats.filter(seat=>seat.runId&&!seat.isBot).map(seat=>queueSeasonResult(seat.runId!).catch(()=>console.error('Result notification queued for retry'))));
  return true;
}
