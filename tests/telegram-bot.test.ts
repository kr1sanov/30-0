import test from 'node:test';
import assert from 'node:assert/strict';
import { sendTelegramMessageDetailed, telegramChatId } from '../src/lib/telegramBot.ts';

test('extracts a Telegram chat id only from a Telegram provider id', () => {
  assert.equal(telegramChatId('telegram_123456789'), '123456789');
  assert.equal(telegramChatId('telegram_0001'), null);
  assert.equal(telegramChatId('google_123456789'), null);
  assert.equal(telegramChatId('telegram_123-not-valid'), null);
});

test('reports when Telegram has not seen the admin start the bot', async () => {
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.TELEGRAM_BOT_TOKEN = '123456789:abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12';
  globalThis.fetch = (async () => new Response(JSON.stringify({ ok: false, description: "Forbidden: bot can't initiate conversation with a user" }), { status: 403 })) as typeof fetch;
  try {
    assert.deepEqual(await sendTelegramMessageDetailed('361912433', 'test'), { ok: false, reason: 'start_required' });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;
  }
});

test('does not expose Telegram credentials in send failures', async () => {
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.TELEGRAM_BOT_TOKEN = '123456789:abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12';
  globalThis.fetch = (async () => new Response(JSON.stringify({ ok: false, description: 'Unauthorized' }), { status: 401 })) as typeof fetch;
  try {
    assert.deepEqual(await sendTelegramMessageDetailed('361912433', 'test'), { ok: false, reason: 'unavailable' });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;
  }
});
