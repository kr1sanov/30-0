import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateContributions } from '../src/lib/seasonAnalytics.ts';
const roster = [{ name: 'GK', position: 'ВР', rating: 99 }, { name: 'Striker', position: 'НП', rating: 80 }, { name: 'Midfielder', position: 'ЦП', rating: 80 }, { name: 'Defender', position: 'ЦЗ', rating: 80 }];
test('contributions preserve exact team goals and remain stable after refresh', () => {
  const data = simulateContributions('Team', roster, 65, 'run-1');
  assert.deepEqual(data, simulateContributions('Team', roster, 65, 'run-1'));
  assert.equal(data.stats.reduce((sum,p) => sum+p.goals,0),65);
  assert.equal(data.scorers.length,65);
  assert.ok(data.stats.reduce((sum,p) => sum+p.assists,0)<=65);
  assert.ok(data.stats.every(p => p.name !== 'GK'));
});
test('zero goals cannot produce any assists', () => {
  assert.ok(simulateContributions('Team',roster,0,'run-2').stats.every(p => p.goals === 0 && p.assists === 0));
});
