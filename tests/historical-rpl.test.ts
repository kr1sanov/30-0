import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FORMATIONS, canFillSlot } from '../src/lib/positions.ts';

const folder = new URL('../docs/research/rpl-2010-2018/', import.meta.url);
const read = (name: string) => JSON.parse(readFileSync(new URL(name, folder), 'utf8'));
const registry = read('registry.json');
const seasons = Array.from({ length: 9 }, (_, i) => read(`season-${2010 + i}.json`));

test('every supplied row has one stable player identity and exact season ratings', () => {
  assert.deepEqual(seasons.map(s => s.year), [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018]);
  const entries = seasons.flatMap(s => s.clubs.flatMap(c => c.players.map(p => ({ season: s.year, club: c.sourceClubId, player: p }))));
  assert.equal(entries.length, 4991);
  assert.equal(new Set(entries.map(e => e.player.sourcePlayerId)).size, 1822);
  assert.equal(new Set(entries.map(e => `${e.season}:${e.club}:${e.player.sourcePlayerId}`)).size, 4991);
  assert.equal(Object.keys(registry.clubs).length, 29);
  for (const entry of entries) {
    assert.ok(registry.players[entry.player.sourcePlayerId]);
    assert.ok(registry.clubs[entry.club]);
    assert.equal(entry.player.rating >= 1 && entry.player.rating <= 99, true);
    assert.equal(entry.player.primeRating >= 1 && entry.player.primeRating <= 99, true);
  }
});

test('all core clubs have enough distinct real players to fill every formation', () => {
  const core = registry.eligibleClubManifest.filter((c: { eligible: boolean }) => c.eligible);
  assert.equal(core.length, 15);
  for (const club of core) {
    assert.ok(club.seasonAppearances >= 5);
    const pool = seasons.flatMap(s => s.clubs.filter(c => c.sourceClubId === club.clubId).flatMap(c => c.players));
    for (const formation of FORMATIONS) {
      const candidates = formation.slots.map(slot => [...new Map(pool
        .filter(p => canFillSlot(p.mainPosition, [], slot.position).canFill)
        .map(p => [p.sourcePlayerId, p])).keys()]);
      const matched = new Map<string, number>();
      function assign(slotIndex: number, visited: Set<string>): boolean {
        for (const playerId of candidates[slotIndex]) {
          if (visited.has(playerId)) continue;
          visited.add(playerId);
          const other = matched.get(playerId);
          if (other === undefined || assign(other, visited)) {
            matched.set(playerId, slotIndex);
            return true;
          }
        }
        return false;
      }
      assert.ok(candidates.every((_, index) => assign(index, new Set())), `${club.name} / ${formation.id}`);
    }
  }
});
