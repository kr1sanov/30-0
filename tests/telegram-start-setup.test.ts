import test from 'node:test';
import assert from 'node:assert/strict';

test('switches to outbound polling without dropping pending /start updates', async () => {
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
    const deleted = calls.filter(call => call.method === 'deleteWebhook');
    assert.equal(deleted.length, 1);
    assert.deepEqual(deleted[0].body, { drop_pending_updates: false });
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

test('website deploy preserves an existing Serverless webhook', async () => {
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousTransport = process.env.TELEGRAM_BOT_TRANSPORT;
  process.env.TELEGRAM_BOT_TOKEN = '123456789:abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12';
  delete process.env.TELEGRAM_BOT_TRANSPORT;
  const calls: string[] = [];
  globalThis.fetch = (async input => {
    const method = String(input).split('/').at(-1)!; calls.push(method);
    return Response.json({ ok: true, result: method === 'getMe' ? { username: 'RPL30_bot' } : method === 'getWebhookInfo' ? { url: 'https://app123.tgcloud.ai/webhook' } : true });
  }) as typeof fetch;
  try {
    const modulePath = '../scripts/set-telegram-webhook.mjs?preserve-serverless';
    await import(modulePath);
    assert.equal(calls.includes('deleteWebhook'), false);
    assert.equal(calls.filter(method => method === 'setMyCommands').length, 3);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = previousToken;
    if (previousTransport === undefined) delete process.env.TELEGRAM_BOT_TRANSPORT; else process.env.TELEGRAM_BOT_TRANSPORT = previousTransport;
  }
});
