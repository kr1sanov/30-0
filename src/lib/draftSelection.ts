import type { GameRun, GameSlot } from '@prisma/client';
import { db } from './db';
import { draftPoolSelect } from './draftPoolQuery';
import { getClubSeasonOptions } from './clubAvailability';
import { spinWheel } from './wheel';
import { getRosterPositions } from './rosterPositions';

type DraftRun = Pick<GameRun, 'clubFilter' | 'eraStartYear' | 'eraEndYear' | 'nationalityFilter' | 'difficulty'> & {
  slots: Pick<GameSlot, 'playerSeasonId'>[];
};

export class DraftConflict extends Error {}

/** Shared, uncached selection: manual roster edits apply on the very next spin. */
export async function selectDraftPlayers(run: DraftRun, openPositions: string[]) {
  const draftedCardIds = new Set(run.slots.flatMap(slot => slot.playerSeasonId ? [slot.playerSeasonId] : []));
  const draftedPlayerIds = new Set(draftedCardIds.size ? (await db.playerSeason.findMany({
    where: { id: { in: [...draftedCardIds] } }, select: { playerId: true },
  })).map(card => card.playerId) : []);

  // One Club deliberately uses the club's entire history, as before. A second
  // fallback query for that same history could never add another candidate.
  const pool = await db.clubSeason.findMany({
    where: run.clubFilter ? { clubId: run.clubFilter } : {
      season: { startYear: { gte: run.eraStartYear ?? 2006, lte: run.eraEndYear ?? 2026 } },
    },
    select: { ...draftPoolSelect, players: {
      ...draftPoolSelect.players,
      where: { playerId: { notIn: [...draftedPlayerIds] }, player: { mergedIntoId: null } },
    } },
  });
  const candidates = getClubSeasonOptions(pool, openPositions, draftedPlayerIds, draftedCardIds, run.nationalityFilter);
  if (!candidates.length) return null;
  const selected = spinWheel(candidates);
  const clubSeason = await db.clubSeason.findUnique({
    where: { id: selected.clubSeasonId },
    include: { club: true, season: true, players: { include: { player: true } } },
  });
  if (!clubSeason) throw new DraftConflict('Состав изменился. Повтори прокрут');
  const eligible = clubSeason.players.filter(card => !card.player.mergedIntoId &&
    !draftedCardIds.has(card.id) && !draftedPlayerIds.has(card.playerId) &&
    (!run.nationalityFilter || (card.nationality ?? card.player.nationality) === run.nationalityFilter)
  );
  const players = eligible.map(card => ({
    playerSeasonId: card.id,
    fullName: card.player.alias || card.player.fullName,
    lastName: card.player.alias || card.player.lastName,
    rating: run.difficulty === 'hard' ? 0 : card.rating,
    primeRating: card.primeRating || card.rating,
    primeSeason: card.primeSeason || clubSeason.season.label,
    mainPosition: card.mainPosition,
    otherPositions: getRosterPositions(card, clubSeason.club.nameRu, clubSeason.season.startYear).filter(pos => pos !== card.mainPosition),
    nationality: card.nationality ?? card.player.nationality,
  }));
  // A concurrent admin edit may have removed the only usable role after selection.
  if (!getClubSeasonOptions([{ ...clubSeason, players: eligible }], openPositions, draftedPlayerIds, draftedCardIds, run.nationalityFilter).length) {
    throw new DraftConflict('Состав изменился. Повтори прокрут');
  }
  return { clubSeasonId: clubSeason.id, clubName: selected.clubName, seasonLabel: clubSeason.season.label, players };
}
