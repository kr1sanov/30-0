import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CLUB_THEME, clubThemeStyle, getClubTheme } from '../src/lib/clubThemes.ts';

test('provides distinct readable themes for light, dark, and vivid clubs', () => {
  const light = getClubTheme('Торпедо Москва');
  const dark = getClubTheme('Динамо Москва');
  const vivid = getClubTheme('Спартак Москва');

  assert.equal(light.onPrimary, '#111827');
  assert.equal(dark.onPrimary, '#FFFFFF');
  assert.equal(vivid.primary, '#E31E24');
  assert.notEqual(light.primary, dark.primary);
  assert.notEqual(dark.primary, vivid.primary);
});

test('falls back safely and exposes centralized CSS variables', () => {
  assert.deepEqual(getClubTheme('Неизвестный клуб'), DEFAULT_CLUB_THEME);
  const style = clubThemeStyle('Зенит');
  assert.equal(style['--club-primary'], '#00AEEF');
  assert.equal(style['--primary'], '#00AEEF');
  assert.equal(style['--club-on-primary'], '#031923');
});

test('historical club names use their own two-colour themes', () => {
  assert.deepEqual(getClubTheme('FC Ufa'), getClubTheme('Уфа'));
  assert.deepEqual(getClubTheme('Arsenal Tula'), getClubTheme('Арсенал Тула'));
  assert.deepEqual(getClubTheme('Anzhi Makhachkala'), getClubTheme('Анжи'));
  assert.deepEqual(getClubTheme('Tom Tomsk'), getClubTheme('Томь'));
  for (const club of ['FC Ufa', 'Arsenal Tula', 'Anzhi Makhachkala', 'Tom Tomsk']) {
    assert.notDeepEqual(getClubTheme(club), DEFAULT_CLUB_THEME);
  }
});

test('every imported 2010–2021 club has a mapped theme', () => {
  const registry = JSON.parse(readFileSync(new URL('../docs/research/rpl-2010-2018/registry.json', import.meta.url), 'utf8'));
  const names = new Set<string>(registry.eligibleClubManifest.filter((club: { eligible: boolean }) => club.eligible).map((club: { name: string }) => club.name));
  for (const year of [2019, 2020, 2021]) {
    const season = JSON.parse(readFileSync(new URL(`../docs/research/rpl-2019-2021/season-${year}.json`, import.meta.url), 'utf8'));
    Object.keys(season.clubCounts).forEach(name => names.add(name));
  }
  for (const name of names) assert.notDeepEqual(getClubTheme(name), DEFAULT_CLUB_THEME, name);
});

test('additional historical clubs do not share the default palette', () => {
  const names = ['FC Moscow', 'Shinnik Yaroslavl', 'Luch-Energiya Vladivostok', 'Spartak Nalchik', 'Saturn Ramenskoye', 'Mordovia Saransk', 'Volga', 'Sibir Novosibirsk'];
  const palettes = names.map(name => getClubTheme(name));
  for (const palette of palettes) assert.notDeepEqual(palette, DEFAULT_CLUB_THEME);
  assert.equal(new Set(palettes.map(theme => `${theme.primary}:${theme.secondary}`)).size, names.length);
});
