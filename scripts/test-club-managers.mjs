import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLUB_MANAGER_IDS, MANAGERS, getManagersForClub, getRandomManager } from '../src/lib/managers.ts';

const registry = JSON.parse(readFileSync(new URL('../docs/research/rpl-2010-2018/registry.json', import.meta.url), 'utf8'));
const eligible = Object.entries(registry.clubs).filter(([, club]) => club.seasonAppearances >= 5);
assert.equal(Object.keys(CLUB_MANAGER_IDS).length, eligible.length);
assert.equal(new Set(MANAGERS.map(manager => manager.id)).size, MANAGERS.length);

for (const [sourceId, club] of eligible) {
  const pool = getManagersForClub(`fifaindex-club-${sourceId}`);
  assert.ok(pool.length >= 2, `${club.canonicalName}: need verified managers`);
  assert.equal(pool.length, new Set(pool.map(manager => manager.id)).size);
  assert.equal(pool.length, CLUB_MANAGER_IDS[sourceId].length);
  for (let i = 0; i < 100; i++) {
    assert.ok(pool.includes(getRandomManager(`fifaindex-club-${sourceId}`)), club.canonicalName);
  }
}
assert.equal(getManagersForClub('fifaindex-club-unknown').length, 0);
assert.equal(getRandomManager('fifaindex-club-unknown'), undefined);
assert.ok(MANAGERS.includes(getRandomManager()));
console.log(`Verified ${MANAGERS.length} managers across ${eligible.length} One Club pools`);
