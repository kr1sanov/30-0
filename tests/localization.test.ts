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

test('translates live season, manager, and award labels without losing results', () => {
  assert.equal(translateInterface('ТУР 6 / 30'), 'MATCHWEEK 6 / 30');
  assert.equal(translateInterface('Факел (д)'), 'Fakel (H)');
  assert.equal(translateInterface('Арсенал Тула (в)'), 'Arsenal Tula (A)');
  assert.equal(translateInterface('🏅 3/9 трофеев'), '🏅 3/9 trophies');
  assert.equal(translateInterface('✅ Сильные стороны'), '✅ Strengths');
  assert.equal(translateInterface('Крутить тренера'), 'Spin for manager');
});

test('keeps multiplayer entry, lobby and series UI in the selected language', () => {
  assert.equal(translateInterface('← Выбрать формат'), '← Choose a format');
  assert.equal(translateInterface('Мультиплеер · Бета-версия'), 'Multiplayer · Beta');
  assert.equal(translateInterface('Сыграй с другом'), 'Play with a friend');
  assert.equal(translateInterface('Собери'), 'Build a');
  assert.equal(translateInterface('команду из 11 игроков'), 'team of 11 players');
  assert.equal(translateInterface(', сыграй сезон и узнай, кто собрал лучший состав.'), ', play a season and see who built the best squad.');
  assert.equal(translateInterface('Твоё имя'), 'Your name');
  assert.equal(translateInterface('Твоя схема'), 'Your formation');
  assert.equal(translateInterface('Изменить'), 'Edit');
  assert.equal(translateInterface('Поделиться ссылкой'), 'Share link');
  assert.equal(translateInterface('В ожидании противника'), 'Waiting for an opponent');
  assert.equal(translateInterface('+ Добавить бота'), '+ Add bot');
  assert.equal(translateInterface('Все готовы · Драфт начнётся через 10 сек.'), 'Everyone is ready · Draft starts in 10 sec.');
  assert.equal(translateInterface('Раунд 2 · до 3 побед'), 'Round 2 · First to 3 wins');
  assert.equal(translateInterface('Сыграем в 30-0? Код: LJD8HZ'), 'Play 30–0 with me! Code: LJD8HZ');
  assert.equal(translateInterface('Бот 2'), 'Бот 2');
});

test('translates positions, formations and player labels while preserving names', () => {
  assert.equal(translateInterface('Глубокая оборона'), 'Deep defence');
  assert.equal(translateInterface('ЛФЗ'), 'LWB');
  assert.equal(translateInterface('Welliton, НП, рейтинг 85'), 'Welliton, ST, rating 85');
  assert.equal(translateInterface('Павлюченко, ЛЗ, рейтинг 75'), 'Павлюченко, LB, rating 75');
  assert.equal(translateInterface('ЦСКА'), 'ЦСКА');
  assert.equal(translateInterface('Собери 3 игроков из 🇷🇺 Россия'), 'Draft 3 players from 🇷🇺 Russia');
  assert.equal(translateInterface('Импорт завершён: добавлено 4, обновлено 6.'), 'Import complete: 4 added, 6 updated.');
});

test('translates informal copy on the home, profile and legal pages', () => {
  assert.equal(translateInterface('Включай плейлист и собери лучший состав РПЛ'), 'Put on a playlist and build the best RPL XI');
  assert.equal(translateInterface('Твой результат'), 'Your result');
  assert.equal(translateInterface('Поделись ссылкой — здесь появятся твои друзья.'), 'Share your link to see friends who join here.');
  assert.equal(translateInterface('Твои запросы'), 'Your requests');
  assert.equal(translateInterface('Не удалось собрать 11 игроков за три минуты.'), 'You did not fill all 11 positions in three minutes.');
  assert.equal(translateInterface('Выбери от 2 до 6 мест'), 'Choose between 2 and 6 seats');
  assert.equal(translateInterface('Собери состав только из эпохи 2010–2014. Плюс 2 игроков из 🇷🇺 Россия'), 'Build a squad from the 2010–2014 era. Include 2 players from 🇷🇺 Russia');
  assert.equal(translateInterface('Собери состав в схеме 4-3-3 + 2 из 🇧🇷'), 'Build a squad in a 4-3-3 formation + 2 from 🇧🇷');
});
