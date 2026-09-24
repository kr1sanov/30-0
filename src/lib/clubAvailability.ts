import { canFillSlot } from '@/lib/positions';
import type { ClubSeasonWithPlayers } from '@/lib/wheel';

type ClubSeasonRecord = {
  id: string;
  club: { nameRu: string };
  season: { label: string };
  players: Array<{
    id: string;
    mainPosition: string;
    otherPositions: string | null;
    player: { fullName: string; nationality: string | null };
  }>;
};

/** Build wheel options from seasons that still have at least one eligible player. */
export function getClubSeasonOptions(
  clubSeasons: ClubSeasonRecord[],
  openPositions: string[],
  draftedPlayerNames: Set<string>,
  draftedPlayerSeasonIds: Set<string>,
  nationalityFilter?: string | null,
): ClubSeasonWithPlayers[] {
  const options: ClubSeasonWithPlayers[] = [];

  for (const clubSeason of clubSeasons) {
    const availablePositions = new Set<string>();
    for (const playerSeason of clubSeason.players) {
      if (draftedPlayerSeasonIds.has(playerSeason.id)) continue;
      if (draftedPlayerNames.has(playerSeason.player.fullName)) continue;
      if (nationalityFilter && playerSeason.player.nationality !== nationalityFilter) continue;

      const positions = [playerSeason.mainPosition, ...(playerSeason.otherPositions ?? '').split(',')]
        .map((position) => position.trim())
        .filter(Boolean);

      for (const playerPosition of positions) {
        if (openPositions.some((slotPosition) => canFillSlot(
          playerPosition as Parameters<typeof canFillSlot>[0],
          [],
          slotPosition as Parameters<typeof canFillSlot>[2],
        ).canFill)) {
          availablePositions.add(playerPosition);
        }
      }
    }

    if (availablePositions.size) {
      options.push({
        clubSeasonId: clubSeason.id,
        clubName: clubSeason.club.nameRu,
        seasonLabel: clubSeason.season.label,
        availablePositions: Array.from(availablePositions) as ClubSeasonWithPlayers['availablePositions'],
      });
    }
  }

  return options;
}
