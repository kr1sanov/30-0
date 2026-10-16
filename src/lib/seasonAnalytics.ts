export interface AnalyticsPlayer { name: string; position: string; rating: number }
export interface SeasonPlayerStat { name: string; team: string; goals: number; assists: number }
/** Simulated contributions use the actual drafted/imported roster and exact team GF.
 * Stable seeds keep statistics identical after refresh; goalkeepers never score.
 */
export function simulateContributions(team: string, roster: AnalyticsPlayer[], goals: number, seed: string) {
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  const random = () => { state = Math.imul(state ^ state >>> 15, 1 | state); state ^= state + Math.imul(state ^ state >>> 7, 61 | state); return ((state ^ state >>> 14) >>> 0) / 4294967296; };
  const players = roster.filter(p => p.position !== 'ВР');
  const stats: SeasonPlayerStat[] = players.map(p => ({ name: p.name, team, goals: 0, assists: 0 }));
  const choose = (assist: boolean, except = -1) => {
    const weights = players.map((p, i) => i === except ? 0 : Math.max(1, p.rating) * (assist ? /ЦП|АП|ЛП|ПП|ПВ|ЛВ/.test(p.position) ? 4 : 1 : /НП|ЦН|ПВ|ЛВ/.test(p.position) ? 5 : /ЦП|АП|ЛП|ПП/.test(p.position) ? 2 : 0.5));
    let value = random() * weights.reduce((a,b) => a+b,0);
    return weights.findIndex(weight => (value -= weight) < 0);
  };
  const scorers: string[] = [];
  if (players.length) for (let goal = 0; goal < Math.max(0, Math.floor(goals)); goal++) {
    const scorer = choose(false); stats[scorer].goals++; scorers.push(stats[scorer].name);
    if (players.length > 1 && random() < 0.78) { const assister = choose(true, scorer); if (assister >= 0) stats[assister].assists++; }
  }
  return { stats, scorers };
}
