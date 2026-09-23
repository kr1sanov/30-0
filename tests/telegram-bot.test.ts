import test from 'node:test';
import assert from 'node:assert/strict';
import { telegramChatId } from '../src/lib/telegramBot.ts';

test('extracts a Telegram chat id only from a Telegram provider id', () => {
  assert.equal(telegramChatId('telegram_123456789'), '123456789');
  assert.equal(telegramChatId('telegram_0001'), null);
  assert.equal(telegramChatId('google_123456789'), null);
  assert.equal(telegramChatId('telegram_123-not-valid'), null);
});
