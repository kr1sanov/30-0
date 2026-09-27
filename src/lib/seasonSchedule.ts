export interface LeagueOpponent { name: string; strength: number }

export function buildSeasonSchedule(opponents: LeagueOpponent[]) {
  if (opponents.length !== 15 || new Set(opponents.map(o => o.name)).size !== 15) {
    throw new Error('A complete league season with 15 unique opponents is required');
  }
  if (opponents.some(o => !Number.isFinite(o.strength) || o.strength <= 0)) {
    throw new Error('Opponent strengths must be valid ratings');
  }
  return [true, false].flatMap(isHome => opponents.map(opponent => ({ opponent, isHome })));
}
