export interface OneClubCandidate {
  id: string;
  nameRu: string;
  nameEn?: string | null;
  city?: string | null;
  seasons: Array<{ players: Array<{ playerId: string; mainPosition: string }> }>;
}

/** Rank clubs by RPL appearances in 2000–2026 and keep clubs with draft-ready player pools. */
export function selectOneClubCandidates<T extends OneClubCandidate>(clubs: T[]) {
  const minSeasons = Math.min(15, Math.max(1, ...clubs.map((club) => club.seasons.length)));
  const minPlayers = minSeasons === 1 ? 25 : 30;
  return clubs.map((club) => {
    const players = new Map<string, string>();
    for (const season of club.seasons) {
      for (const player of season.players) {
        if (!players.has(player.playerId)) players.set(player.playerId, player.mainPosition);
      }
    }
    const positions = new Set(players.values());
    const hasGoalkeeper = positions.has('ВР');
    const hasDefenders = ['ЦЗ', 'ПЗ', 'ЛЗ', 'ПФЗ', 'ЛФЗ'].some((position) => positions.has(position));
    const hasMidfielders = ['ОП', 'ЦП', 'АП', 'ЛП', 'ПП'].some((position) => positions.has(position));
    const hasAttackers = ['ЛВ', 'ПВ', 'НП', 'ЦН'].some((position) => positions.has(position));
    return {
      id: club.id, nameRu: club.nameRu, nameEn: club.nameEn, city: club.city,
      seasonCount: club.seasons.length, playerCount: players.size,
      hasGoalkeeper, hasDefenders, hasMidfielders, hasAttackers,
    };
  }).filter((club) => club.seasonCount >= minSeasons && club.playerCount >= minPlayers && club.hasGoalkeeper && club.hasDefenders && club.hasMidfielders && club.hasAttackers)
    .sort((a, b) => b.seasonCount - a.seasonCount || b.playerCount - a.playerCount || a.nameRu.localeCompare(b.nameRu, 'ru'));
}
