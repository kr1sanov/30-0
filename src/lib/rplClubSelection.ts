export interface OneClubCandidate {
  id: string;
  nameRu: string;
  nameEn?: string | null;
  city?: string | null;
  oneClubHidden?: boolean;
  seasons: Array<{ season?: { startYear: number }; players: Array<{ playerId: string; mainPosition: string }> }>;
}

/** Show gaps in the roster archive rather than implying every year is present. */
export function formatSeasonPeriods(years: number[]): string {
  const sorted = [...new Set(years)].filter(Number.isFinite).sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    ranges.push(i === j ? `${sorted[i]}` : `${sorted[i]}–${sorted[j]}`);
    i = j + 1;
  }
  return ranges.join(', ');
}

/** Rank clubs by unique season appearances across available roster editions. */
export function selectOneClubCandidates<T extends OneClubCandidate>(clubs: T[], includeHidden = false) {
  const minSeasons = 8;
  const minPlayers = 20;
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
    const years = club.seasons.map(s => s.season?.startYear ?? NaN).filter(Number.isFinite);
    return {
      id: club.id, nameRu: club.nameRu, nameEn: club.nameEn, city: club.city,
      oneClubHidden: club.oneClubHidden ?? false,
      seasonCount: club.seasons.length, playerCount: players.size,
      periods: formatSeasonPeriods(years),
      hasGoalkeeper, hasDefenders, hasMidfielders, hasAttackers,
    };
  }).filter((club) => (includeHidden || !club.oneClubHidden) && club.seasonCount >= minSeasons && club.playerCount >= minPlayers && club.hasGoalkeeper && club.hasDefenders && club.hasMidfielders && club.hasAttackers)
    .sort((a, b) => b.seasonCount - a.seasonCount || b.playerCount - a.playerCount || a.nameRu.localeCompare(b.nameRu, 'ru'));
}
