import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectOneClubCandidates } from '../src/lib/rplClubSelection.ts';

const positions = ['ВР', 'ЦЗ', 'ПЗ', 'ЛЗ', 'ОП', 'ЦП', 'АП', 'ЛП', 'ЛВ', 'ПВ', 'НП', 'ЦН'];

function club(id: string, seasons: number, playerCount = 30, includeKeeper = true) {
  const squad = Array.from({ length: playerCount }, (_, index) => ({
    playerId: `player-${id}-${index}`,
    mainPosition: includeKeeper ? positions[index % positions.length] : positions[(index % (positions.length - 1)) + 1],
  }));
  return {
    id, nameRu: id, seasons: Array.from({ length: seasons }, () => ({ players: squad })),
  };
}

test('includes short archives with a complete squad and ranks by RPL seasons', () => {
  const result = selectOneClubCandidates([club('5 seasons', 5), club('9 seasons', 9), club('4 seasons', 4)]);
  assert.deepEqual(result.map((item) => item.nameRu), ['9 seasons', '5 seasons', '4 seasons']);
  assert.equal(result[0].playerCount, 30);
});

test('excludes clubs without an 11-player pool or goalkeeper data', () => {
  assert.deepEqual(selectOneClubCandidates([
    club('small roster', 26, 19),
    club('no keeper', 26, 30, false),
  ]), []);
});

test('counts distinct players across seasons, not every player-season row', () => {
  const onePlayerPool = club('same players', 25, 1);
  assert.deepEqual(selectOneClubCandidates([onePlayerPool]), []);
});

test('includes a single supplied season when it has enough players by line', () => {
  assert.equal(selectOneClubCandidates([club('single season', 1, 26)]).length, 1);
});
