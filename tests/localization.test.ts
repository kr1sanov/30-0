import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { translateInterface } from '../src/lib/enTranslations.ts';

test('translates result ordinals and preserves numeric values', () => {
  assert.equal(translateInterface('🏆 Итог: 1-е место · 78 очков'), '🏆 Result: 1st place · 78 points');
  assert.equal(translateInterface('2-е место · 71 очков · 22 побед'), '2nd place · 71 points · 22 wins');
  assert.equal(translateInterface('11-е место'), '11th place');
});

test('translates core game, account and legal interface', () => {
  assert.equal(translateInterface('Один клуб'), 'One club');
  assert.equal(translateInterface('Приглашённые по ссылке появятся здесь.'), 'Players who join through your link will appear here.');
  assert.equal(translateInterface('Политика конфиденциальности'), 'Privacy policy');
  assert.equal(translateInterface('  Сменить пароль  '), '  Change password  ');
  assert.equal(translateInterface('ЦСКА'), 'ЦСКА');
});
