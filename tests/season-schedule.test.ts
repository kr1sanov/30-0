import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeasonSchedule } from '../src/lib/seasonSchedule.ts';

test('30 rounds have one home and one away match for each source club', () => {
  const opponents = Array.from({ length: 15 }, (_, i) => ({ name: `Club ${i + 1}`, strength: 65 + i }));
  const rounds = buildSeasonSchedule(opponents);
  assert.equal(rounds.length, 30);
  for (const opponent of opponents) {
    assert.deepEqual(rounds.filter(r => r.opponent.name === opponent.name).map(r => r.isHome), [true, false]);
  }
  assert.throws(() => buildSeasonSchedule([...opponents.slice(0, 14), opponents[0]]));
  assert.throws(() => buildSeasonSchedule(opponents.slice(0, 14)));
});
