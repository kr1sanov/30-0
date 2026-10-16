import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playerDisplayName } from '../src/lib/playerNames.ts';

test('source surnames keep single and composite football names intact', () => {
  assert.deepEqual(playerDisplayName('Welliton', 'Welliton'), { surname: 'Welliton', given: '' });
  assert.deepEqual(playerDisplayName('Vagner Love', 'Vagner Love'), { surname: 'Vagner Love', given: '' });
});

test('the surname is first for both Russian and English source ordering', () => {
  assert.deepEqual(playerDisplayName('Игнашевич Сергей', 'Игнашевич'), { surname: 'Игнашевич', given: 'Сергей' });
  assert.deepEqual(playerDisplayName('Sergei Ignashevich', 'Ignashevich'), { surname: 'Ignashevich', given: 'Sergei' });
});

test('historical imports with full names in lastName display only the surname', () => {
  for (const [full, surname] of [['Vladimir Moskvychev','Moskvychev'],['Дмитрий Скопинцев','Скопинцев'],['Denis Adamov','Adamov'],['Zelimkhan Bakaev','Bakaev'],['Kirill Kaplenko','Kaplenko']]) {
    assert.equal(playerDisplayName(full,full).surname,surname);
    assert.notEqual(playerDisplayName(full,full).given,'');
  }
});
