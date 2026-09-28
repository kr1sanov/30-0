import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRosterCsv, ROSTER_COLUMNS } from '../src/lib/rosterImport.ts';

test('downloadable FIFA 10 example is a valid import with actual source links', () => {
  const text = readFileSync('public/examples/roster-import-example.csv', 'utf8');
  const rows = parseRosterCsv(text);
  assert.equal(rows.length, 6);
  assert.equal(new Set(rows.map(row => row.clubName)).size, 2);
  assert.equal(rows[0].fullName, 'Vyacheslav Malafeev');
  assert.equal(rows[0].rating, 83);
  assert.ok(rows.every(row => row.sourceUrl?.startsWith('https://fifaindex.com/')));
});

test('quoted CSV names survive a comma and embedded quote', () => {
  const row = ['"Club, A"', '', '"Jo ""The One"" Doe"', 'Doe', 'Jo', '', '', 'ЦЗ', 'ЛЗ|ЛФЗ', '74', '80', '', ''];
  const result = parseRosterCsv(`${ROSTER_COLUMNS.join(',')}\r\n${row.join(',')}\r\n`);
  assert.equal(result[0].clubName, 'Club, A');
  assert.equal(result[0].fullName, 'Jo "The One" Doe');
  assert.equal(result[0].otherPositions, 'ЛЗ,ЛФЗ');
});

test('invalid position, inverted ratings and duplicate rows abort the whole file', () => {
  const make = (position: string, rating: string, prime: string) =>
    `${ROSTER_COLUMNS.join(',')}\nКлуб,,Иван Иванов,Иванов,Иван,,,${position},,${rating},${prime},,`;
  assert.throws(() => parseRosterCsv(make('WRONG', '70', '80')), /позиция/);
  assert.throws(() => parseRosterCsv(make('ВР', '80', '70')), /прайм/);
  const valid = make('ВР', '70', '80');
  assert.throws(() => parseRosterCsv(`${valid}\n${valid.split('\n')[1]}`), /дважды/);
});
