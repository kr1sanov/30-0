import type { DraftSlot, GameConfig } from './types';

/** Award only from recorded squad fields and team season totals. */
export function squadAchievementIds(slots: DraftSlot[], config: GameConfig, result: {
  goalsFor: number; wins: number; position: number;
}): string[] {
  const selected = slots.filter(slot => slot.playerId || slot.playerName);
  if (selected.length !== 11) return [];
  const nationalityCount = (names: string[]) => selected.filter(slot =>
    names.includes((slot.playerNationality ?? '').trim().toLowerCase())).length;
  const brazilian = nationalityCount(['бразилия', 'brazilian', 'brazil']);
  const russian = nationalityCount(['россия', 'russian', 'russia']);
  const club = (config.clubName ?? '').toLowerCase();
  const oneClub = config.gameMode === 'single_club' && !!config.clubFilter;
  return [
    ...(brazilian >= 3 && result.goalsFor >= 50 ? ['samba_attack'] : []),
    ...(russian >= 7 && result.position === 1 ? ['russian_core'] : []),
    ...(oneClub && /цска|cska/.test(club) && result.wins >= 20 ? ['army_season'] : []),
    ...(oneClub && /зенит|zenit/.test(club) && result.goalsFor >= 60 ? ['neva_attack'] : []),
  ];
}
