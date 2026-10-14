import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_POSITIONS, POSITION_NAMES, canFillSlotStrict, expandPositionRoles } from '../src/lib/positions.ts';
import { getRosterPositions } from '../src/lib/rosterPositions.ts';
import { getClubSeasonOptions } from '../src/lib/clubAvailability.ts';
import { filterCompatibleClubSeasons } from '../src/lib/wheel.ts';
import { translateInterface } from '../src/lib/enTranslations.ts';

const season = (position: string, name = 'Player', other: string | null = null) => ({
  id: 'season', club: { nameRu: 'Зенит' }, season: { label: '2017/18', startYear: 2017 },
  players: [{ id: 'card', playerId: 'person', mainPosition: position, otherPositions: other,
    player: { fullName: name, nationality: 'Россия' } }],
});

test('every wheel option has a card that the pitch can accept, even on the last slot', () => {
  for (const main of ALL_POSITIONS) for (const remaining of ALL_POSITIONS) {
    const record = season(main);
    const options = filterCompatibleClubSeasons([remaining], getClubSeasonOptions([record], [remaining], new Set(), new Set()));
    assert.equal(options.length > 0, canFillSlotStrict(main, [], remaining), `${main} → ${remaining}`);
  }
  assert.equal(getClubSeasonOptions([season('ЦП')], ['ПВ'], new Set(), new Set()).length, 0);
  assert.equal(getClubSeasonOptions([season('ПП')], ['ПВ'], new Set(), new Set()).length, 1);
});

test('equivalent roles keep the same flank and do not grant unrelated positions', () => {
  assert.deepEqual(expandPositionRoles('ПП'), ['ПП', 'ПВ']);
  assert.ok(canFillSlotStrict('ЛВ', [], 'ЛП'));
  assert.ok(canFillSlotStrict('ПЗ', [], 'ПФЗ'));
  assert.equal(canFillSlotStrict('ЛВ', [], 'ПВ'), false);
  assert.equal(canFillSlotStrict('ЛВ', [], 'НП'), false);
  assert.deepEqual(expandPositionRoles('ВР'), ['ВР']);
  assert.deepEqual(expandPositionRoles('bad', [' ЛВ ', 'ЛВ']), ['ЛВ', 'ЛП']);
});

test('verified additional roles are restricted to the player, club and seasons', () => {
  const driussi = season('ЛВ', 'Sebastián Driussi');
  assert.ok(getRosterPositions(driussi.players[0], 'Зенит', 2017).includes('НП'));
  assert.equal(getRosterPositions(driussi.players[0], 'Зенит', 2025).includes('НП'), false);
  assert.equal(getRosterPositions(driussi.players[0], 'Спартак', 2017).includes('НП'), false);
  const zhirkov = season('ЛП', 'Yuriy Zhirkov');
  assert.ok(getRosterPositions(zhirkov.players[0], 'Зенит', 2017).includes('ЛЗ'));
  assert.equal(getClubSeasonOptions([driussi], ['НП'], new Set(), new Set()).length, 1);
  assert.equal(getClubSeasonOptions([driussi], ['НП'], new Set(['person']), new Set()).length, 0);
  assert.equal(getClubSeasonOptions([driussi], ['НП'], new Set(), new Set(['card'])).length, 0);
  assert.equal(getClubSeasonOptions([driussi], ['НП'], new Set(), new Set(), 'Бразилия').length, 0);
});

test('all full pitch position labels have English translations', () => {
  for (const label of Object.values(POSITION_NAMES)) assert.doesNotMatch(translateInterface(label), /[А-Яа-яЁё]/, label);
});
