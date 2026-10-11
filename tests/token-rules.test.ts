import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonReward } from '../src/lib/tokenRules.ts';

test('only season champions earn tokens, with mode-specific payouts', () => {
  for (const mode of ['classic', 'single_club', 'challenge_vagner', 'multiplayer']) {
    assert.equal(seasonReward(mode, 2, true), 0);
    assert.equal(seasonReward(mode, 0, true), 0);
  }
  assert.equal(seasonReward('classic', 1), 20);
  assert.equal(seasonReward('single_club', 1), 25);
  assert.equal(seasonReward('challenge_dzyuba', 1), 30);
  assert.equal(seasonReward('multiplayer', 1, true), 35);
  assert.equal(seasonReward('multiplayer', 1, false), 15);
  assert.equal(seasonReward('unknown', 1), 0);
});
