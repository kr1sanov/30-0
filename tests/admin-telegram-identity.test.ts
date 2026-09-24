import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminOwnerTelegramIdentity } from '../src/lib/adminTelegramIdentity.ts';

test('accepts the configured Telegram owner ID and username', () => {
  assert.equal(isAdminOwnerTelegramIdentity('361912433', 'kr1sanov'), true);
  assert.equal(isAdminOwnerTelegramIdentity('361912433', '@KR1SANOV'), true);
});

test('rejects an ID or username mismatch independently', () => {
  assert.equal(isAdminOwnerTelegramIdentity('361912434', 'kr1sanov'), false);
  assert.equal(isAdminOwnerTelegramIdentity('361912433', 'someone_else'), false);
  assert.equal(isAdminOwnerTelegramIdentity('361912433', undefined), false);
});
