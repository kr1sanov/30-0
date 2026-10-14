import { getRosterPositions } from './rosterPositions.ts';
import type { ClubSeasonWithPlayers } from '@/lib/wheel';

type ClubSeasonRecord = {
  id: string;
  sourceName?: string | null;
  club: { nameRu: string };
  season: { label: string; startYear: number };
  players: Array<{
    id: string;
    playerId: string;
    mainPosition: string;
    nationality?: string | null;
    otherPositions: string | null;
    player: { fullName: string; nationality: string | null };
  }>;
};

/** Build wheel options from seasons that still have at least one eligible player. */
export function getClubSeasonOptions(
  clubSeasons: ClubSeasonRecord[],
  openPositions: string[],
  draftedPlayerIds: Set<string>,
  draftedPlayerSeasonIds: Set<string>,
  nationalityFilter?: string | null,
): ClubSeasonWithPlayers[] {
  const options: ClubSeasonWithPlayers[] = [];

  for (const clubSeason of clubSeasons) {
    const availablePositions = new Set<string>();
    for (const playerSeason of clubSeason.players) {
      if (draftedPlayerSeasonIds.has(playerSeason.id)) continue;
      if (draftedPlayerIds.has(playerSeason.playerId)) continue;
      if (nationalityFilter && (playerSeason.nationality ?? playerSeason.player.nationality) !== nationalityFilter) continue;

      const positions = getRosterPositions(playerSeason, clubSeason.club.nameRu, clubSeason.season.startYear);
      for (const position of positions) {
        if (openPositions.includes(position)) availablePositions.add(position);
      }
    }

    if (availablePositions.size) {
      options.push({
        clubSeasonId: clubSeason.id,
        clubName: clubSeason.season.startYear < 2010
          ? clubSeason.sourceName || clubSeason.club.nameRu
          : clubSeason.club.nameRu,
        seasonLabel: clubSeason.season.label,
        availablePositions: Array.from(availablePositions) as ClubSeasonWithPlayers['availablePositions'],
      });
    }
  }

  return options;
}
