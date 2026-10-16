import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { localizePlayerName } from '../src/lib/footballNames.ts';
import { localizedClubName } from '../src/lib/clubDisplayName.ts';
import { playerDisplayName } from '../src/lib/playerNames.ts';
import { translateInterface } from '../src/lib/enTranslations.ts';
import ts from 'typescript';

function sourceNames() {
  const players = new Set<string>(); const clubs = new Set<string>();
  for (const dir of readdirSync('docs/research', { withFileTypes: true }).filter(d=>d.isDirectory() && d.name.startsWith('rpl-'))) {
    const path = `docs/research/${dir.name}`;
    for (const file of readdirSync(path)) {
      if (/^season-.*\.json$/.test(file)) {
        const data = JSON.parse(readFileSync(`${path}/${file}`, 'utf8'));
        for (const p of data.players ?? []) players.add(p.name ?? p.sourceName);
        for (const c of data.clubs ?? []) { clubs.add(c.sourceName); for (const p of c.players) players.add(p.sourceName); }
        for (const club of Object.keys(data.clubCounts ?? {})) clubs.add(club);
      } else if (file.endsWith('.md')) {
        for (const line of readFileSync(`${path}/${file}`, 'utf8').split('\n')) {
          if (line.startsWith('## ')) clubs.add(line.slice(3).trim());
          const cells = line.split('|').map(c=>c.trim());
          if (line.startsWith('|') && /^\d+$/.test(cells[3] ?? '')) players.add(cells[1]);
        }
      }
    }
  }
  return { players, clubs };
}

test('all supplied editions have Russian player and club labels; English sources stay intact', () => {
  const { players, clubs } = sourceNames();
  assert.ok(players.size > 3000);
  for (const name of players) {
    assert.ok(!/\p{Script=Latin}/u.test(localizePlayerName(name,'ru')), name);
    if (!/[А-Яа-яЁё]/.test(name)) assert.equal(localizePlayerName(name,'en'), name);
  }
  for (const name of clubs) {
    assert.ok(/[А-Яа-яЁё]/.test(localizedClubName(name,'ru')), name);
    assert.ok(!/[А-Яа-яЁё]/.test(localizedClubName(name,'en')), name);
  }
});

test('familiar Russian spellings, accents and compound shirt names survive switching', () => {
  assert.equal(localizePlayerName('Artem Dzyuba','ru'), 'Артём Дзюба');
  assert.equal(localizePlayerName('Igor Akinfeev','ru'), 'Игорь Акинфеев');
  assert.equal(localizePlayerName('Hulk','ru'), 'Халк');
  assert.equal(localizePlayerName('Darko Todorovic','ru'), 'Дарко Тодорович');
  assert.equal(localizePlayerName('Вагнер Лав','en'), 'Vagner Love');
  assert.equal(localizePlayerName('Zé Luís','en'), 'Zé Luís');
  assert.deepEqual(playerDisplayName('Vagner Love','Love'), {surname:'Vagner Love',given:''});
  assert.deepEqual(playerDisplayName('Douglas Santos','Santos'), {surname:'Douglas Santos',given:''});
  assert.deepEqual(playerDisplayName('Sergey Ignashevich','Ignashevich'), {surname:'Ignashevich',given:'Sergey'});
  assert.deepEqual(playerDisplayName('Sergey Ignashevich',''), {surname:'Ignashevich',given:'Sergey'});
  assert.equal(localizePlayerName('Сергей Игнашевич','en'), 'Sergey Ignashevich');
});

test('club aliases switch consistently, including newcomers and historical names', () => {
  assert.equal(localizedClubName('FC Khimki','ru'),'Химки');
  assert.equal(localizedClubName('Dinamo Makhachkala','ru'),'Динамо Махачкала');
  assert.equal(localizedClubName('Балтика','en'),'Baltika Kaliningrad');
  assert.equal(translateInterface('Акрон'),'Akron Togliatti');
  assert.equal(localizedClubName('Terek Grozny','ru'),'Терек Грозный');
  assert.equal(localizedClubName('Akhmat Grozny','ru'),'Ахмат Грозный');
  assert.equal(localizedClubName('Unlisted club','en'),'Unlisted club');
});

test('visible static interface labels and button strings have English translations', () => {
  const missed: string[] = [];
  const allowed = new Set(['Language / Язык','ЛЗ|ЛФЗ','https://30-0.рф']);
  function scan(dir: string) {
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const file=`${dir}/${entry.name}`;
      if(entry.isDirectory()) { scan(file); continue; }
      if(!file.endsWith('.tsx')) continue;
      const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
      function visit(node: ts.Node) {
        if(ts.isStringLiteral(node) || ts.isJsxText(node)) {
          const text=node.text.trim();
          if(/[А-Яа-яЁё]/.test(text) && text.length>3 && !allowed.has(text) && translateInterface(text)===text) missed.push(`${file}: ${text}`);
        }
        ts.forEachChild(node,visit);
      }
      visit(source);
    }
  }
  scan('src/components'); scan('src/app');
  assert.deepEqual(missed,[]);
});


test('dynamic names and already translated positions have English accessible labels', () => {
  assert.equal(translateInterface('Игорь Акинфеев, ВР, рейтинг 82'), 'Igor Akinfeev, GK, rating 82');
  assert.equal(translateInterface('Igor Akinfeev, GK, рейтинг 82'), 'Igor Akinfeev, GK, rating 82');
  assert.equal(translateInterface('Выбрать клуб FC Khimki'), 'Choose club Khimki');
  assert.equal(translateInterface('Выбран клуб Балтика'), 'Selected club Baltika Kaliningrad');
  assert.equal(translateInterface('Псевдоним Артём Дзюба'), 'Alias Artem Dzyuba');
  assert.equal(translateInterface('Рейтинг Artem Dzyuba'), 'Rating Artem Dzyuba');
  assert.equal(translateInterface('Позиция Artem Dzyuba'), 'Position Artem Dzyuba');
  assert.equal(translateInterface('Прайм Artem Dzyuba'), 'Prime Artem Dzyuba');
});
