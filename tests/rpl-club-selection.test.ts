import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSeasonPeriods, selectOneClubCandidates } from '../src/lib/rplClubSelection.ts';

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

test('requires more than seven roster seasons and ranks eligible clubs', () => {
  const result = selectOneClubCandidates([club('7 seasons', 7), club('9 seasons', 9), club('8 seasons', 8)]);
  assert.deepEqual(result.map((item) => item.nameRu), ['9 seasons', '8 seasons']);
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

test('hidden clubs are excluded from the game but remain manageable in admin', () => {
  const hidden = { ...club('hidden', 9, 26), oneClubHidden: true };
  assert.deepEqual(selectOneClubCandidates([hidden]), []);
  assert.equal(selectOneClubCandidates([hidden], true)[0].oneClubHidden, true);
});

test('lists only recorded periods, keeping gaps in the archive visible', () => {
  assert.equal(formatSeasonPeriods([2010, 2007, 2006, 2010, 2012, 2013]), '2006–2007, 2010, 2012–2013');
});
