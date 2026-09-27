import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashAdminPassword, verifyAdminPassword } from '../src/lib/adminPassword.ts';

test('admin password uses a salted hash and rejects wrong input', () => {
  const hash = hashAdminPassword('strong random temporary password 123');
  assert.notEqual(hash, hashAdminPassword('strong random temporary password 123'));
  assert.equal(verifyAdminPassword('strong random temporary password 123', hash), true);
  assert.equal(verifyAdminPassword('strong random temporary password 12', hash), false);
  assert.equal(verifyAdminPassword('anything', 'malformed'), false);
});
