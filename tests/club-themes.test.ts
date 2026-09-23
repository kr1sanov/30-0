import test from 'node:test';
import assert from 'node:assert/strict';
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
