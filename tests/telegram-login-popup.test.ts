import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTelegramLoginPopupUrl } from '../src/lib/telegramLoginPopup.ts';

const nonce = 'a'.repeat(64);

test('Telegram popup URL includes the app origin and same-origin callback', () => {
  const value = createTelegramLoginPopupUrl({
    clientId: '8197702906',
    origin: 'https://30-0.xn--p1ai',
    redirectUri: 'https://30-0.xn--p1ai/admin',
    nonce,
  });
  const url = new URL(value);

  assert.equal(url.origin, 'https://oauth.telegram.org');
  assert.equal(url.searchParams.get('response_type'), 'post_message');
  assert.equal(url.searchParams.get('origin'), 'https://30-0.xn--p1ai');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://30-0.xn--p1ai/admin');
  assert.equal(url.searchParams.get('scope'), 'openid profile');
  assert.equal(url.searchParams.get('nonce'), nonce);
});

test('Telegram popup URL rejects a callback on a different origin', () => {
  assert.throws(() => createTelegramLoginPopupUrl({
    clientId: '8197702906',
    origin: 'https://30-0.xn--p1ai',
    redirectUri: 'https://attacker.example/admin',
    nonce,
  }));
});

test('Telegram popup URL allows a local HTTP development origin', () => {
  const url = new URL(createTelegramLoginPopupUrl({
    clientId: '8197702906',
    origin: 'http://localhost:3000',
    redirectUri: 'http://localhost:3000/admin',
    nonce,
  }));
  assert.equal(url.searchParams.get('origin'), 'http://localhost:3000');
});
