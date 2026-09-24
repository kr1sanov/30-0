import assert from 'node:assert/strict';
import test from 'node:test';
import { addTelegramLoginOrigin } from '../src/lib/telegramLoginPopup.ts';

test('adds the HTTPS application origin to a Telegram SDK auth popup URL', () => {
  const authUrl = new URL('https://oauth.telegram.org/auth?response_type=post_message&client_id=123&redirect_uri=https%3A%2F%2Fexample.com%2Fadmin');
  const result = new URL(addTelegramLoginOrigin(authUrl, 'https://example.com'));

  assert.equal(result.searchParams.get('origin'), 'https://example.com');
  assert.equal(result.searchParams.get('response_type'), 'post_message');
  assert.equal(result.searchParams.get('redirect_uri'), 'https://example.com/admin');
});

test('allows localhost HTTP during development', () => {
  const result = new URL(addTelegramLoginOrigin('https://oauth.telegram.org/auth?client_id=123', 'http://localhost:3000'));
  assert.equal(result.searchParams.get('origin'), 'http://localhost:3000');
});

test('rejects a non-Telegram URL', () => {
  assert.throws(() => addTelegramLoginOrigin('https://attacker.example/auth', 'https://example.com'), /Unexpected Telegram login URL/);
});

test('rejects non-HTTPS application origins in production', () => {
  assert.throws(() => addTelegramLoginOrigin('https://oauth.telegram.org/auth', 'http://example.com'), /secure application origin/);
});

test('rejects an origin path, since Telegram expects an origin only', () => {
  assert.throws(() => addTelegramLoginOrigin('https://oauth.telegram.org/auth', 'https://example.com/admin'), /secure application origin/);
});
