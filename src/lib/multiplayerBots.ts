import { db } from '@/lib/db';
import { canFillSlot, type Position } from '@/lib/positions';

// Bots use real player-season records and the same positional compatibility as humans.
export async function draftBot(runId: string, startYear: number, endYear: number, limit = 11) {
  const run = await db.gameRun.findUniqueOrThrow({ where: { id: runId }, include: { slots: true } });
  const candidates = await db.playerSeason.findMany({ where: { clubSeason: { season: { startYear: { gte: startYear, lte: endYear } } } },
    include: { player: true, clubSeason: { include: { season: true } } } });
  if (!candidates.length) throw new Error('Нет игроков для бота');
  const already = await db.playerSeason.findMany({ where: { id: { in: run.slots.flatMap(slot => slot.playerSeasonId ? [slot.playerSeasonId] : []) } }, select: { playerId: true } });
  const chosen = new Set(already.map(value => value.playerId));
  for (const slot of run.slots.filter(value => !value.playerSeasonId).slice(0, limit)) {
    const position = slot.slotPosition.split('_')[0] as Position;
    const eligible = candidates.filter(candidate => !chosen.has(candidate.playerId) && canFillSlot(candidate.mainPosition as Position,
      (candidate.otherPositions?.split(',').map(x => x.trim()) || []) as Position[], position).canFill);
    if (!eligible.length) throw new Error(`Боту недоступна позиция ${position}`);
    const candidate = eligible[Math.floor(Math.random() * eligible.length)];
    chosen.add(candidate.playerId);
    const penalty = canFillSlot(candidate.mainPosition as Position,
      (candidate.otherPositions?.split(',').map(x => x.trim()) || []) as Position[], position).penalty;
    await db.gameSlot.update({ where: { id: slot.id }, data: {
      playerSeasonId: candidate.id, playerSeasonYear: candidate.clubSeason.season.startYear,
      playerName: candidate.player.alias || candidate.player.fullName,
      playerLastName: candidate.player.alias || candidate.player.lastName,
      playerRating: candidate.rating, playerPrimeRating: candidate.primeRating || candidate.rating,
      playerPosition: candidate.mainPosition, playerOtherPositions: candidate.otherPositions,
      playerNationality: candidate.nationality || candidate.player.nationality,
      isCompatible: penalty === 1,
    } });
  }
}
