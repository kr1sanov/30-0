import test from 'node:test';
import assert from 'node:assert/strict';

test('registers the webhook and only /start in the private-chat command list', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = Object.fromEntries(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'NEXT_PUBLIC_BASE_URL', 'TELEGRAM_BOT_USERNAME']
    .map(key => [key, process.env[key]]));
  const calls: { method: string; body: Record<string, unknown> | null }[] = [];
  process.env.TELEGRAM_BOT_TOKEN = '123456789:abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12';
  process.env.TELEGRAM_WEBHOOK_SECRET = 'test-secret';
  process.env.NEXT_PUBLIC_BASE_URL = 'https://30-0.xn--p1ai';
  process.env.TELEGRAM_BOT_USERNAME = 'RPL30_bot';
  globalThis.fetch = (async (input, init) => {
    const method = String(input).split('/').at(-1) ?? '';
    calls.push({ method, body: init?.body ? JSON.parse(String(init.body)) : null });
    return Response.json(method === 'getMe' ? { ok: true, result: { username: 'RPL30_bot' } } : { ok: true, result: true });
  }) as typeof fetch;
  try {
    await import('../scripts/set-telegram-webhook.mjs');
    assert.equal(calls.filter(call => call.method === 'setWebhook').length, 1);
    const commands = calls.filter(call => call.method === 'setMyCommands');
    assert.deepEqual(commands.map(call => call.body?.language_code), ['', 'ru', 'en']);
    for (const call of commands) {
      assert.deepEqual(call.body?.scope, { type: 'all_private_chats' });
      assert.deepEqual((call.body?.commands as { command: string }[]).map(command => command.command), ['start']);
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
