import { expandPositionRoles, type Position } from './positions.ts';

/** Season-scoped additions verified against Zenit's official match reports.
 * 2018-01-25 / 2018-04-14: Zhirkov in defence and midfield.
 * 2019-03-31: Driussi on the left flank and in central attack.
 * Full sources and the scope are documented in docs/research/position-roles.md.
 */
export function getRosterPositions(record: {
  mainPosition: string; otherPositions?: string | null;
  player: { fullName: string };
}, clubName: string, startYear: number): Position[] {
  const other = (record.otherPositions ?? '').split(',');
  if (/^(Зенит|Zenit(?: St\.? Petersburg)?)$/i.test(clubName) && startYear >= 2017 && startYear <= 2018) {
    const name = record.player.fullName.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    if (/^(yuri[y]? zhirkov|юрий жирков)$/.test(name)) other.push('ЛЗ', 'ЛП');
    if (/^(sebastian driussi|себастьян дриусси)$/.test(name)) other.push('ЛВ', 'НП');
  }
  return expandPositionRoles(record.mainPosition, other);
}
