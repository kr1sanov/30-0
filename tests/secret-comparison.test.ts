import { test } from 'node:test';
import assert from 'node:assert/strict';
import { secretsMatch } from '../src/lib/secretComparison.ts';
test('worker authentication rejects missing, wrong and multibyte secrets without throwing', () => {
  assert.equal(secretsMatch(undefined, ''), false);
  assert.equal(secretsMatch('', ''), false);
  assert.equal(secretsMatch('ab', 'ab'), true);
  assert.equal(secretsMatch('ab', 'ac'), false);
  assert.equal(secretsMatch('ab', 'яя'), false);
  assert.equal(secretsMatch('ab', 'a'), false);
});
