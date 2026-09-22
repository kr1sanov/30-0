import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyTelegramIdTokenWithKeys } from '../src/lib/telegramOidc.ts';
import { buildTelegramLoginUrl } from '../src/lib/telegramLogin.ts';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
const keys = [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }];
const now = 1_800_000_000;
const clientId = '8197702906';
const nonce = '0123456789abcdef0123456789abcdef';

function token(overrides: Record<string, unknown> = {}, headerOverrides: Record<string, unknown> = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test-key', ...headerOverrides })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: 'https://oauth.telegram.org', aud: clientId, sub: 'telegram-subject', id: 1234567,
    name: 'Никита', preferred_username: 'test_player', nonce, iat: now, exp: now + 300, ...overrides,
  })).toString('base64url');
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), privateKey).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

test('accepts Telegram RS256 ID token', () => {
  assert.deepEqual(verifyTelegramIdTokenWithKeys(token(), clientId, nonce, keys, now), {
    id: '1234567', firstName: 'Никита', lastName: undefined, username: 'test_player',
  });
});
test('rejects wrong issuer', () => assert.equal(verifyTelegramIdTokenWithKeys(token({iss:'https://attacker.example'}), clientId, nonce, keys, now), null));
test('rejects wrong audience', () => assert.equal(verifyTelegramIdTokenWithKeys(token({aud:'1'}), clientId, nonce, keys, now), null));
test('rejects wrong nonce', () => assert.equal(verifyTelegramIdTokenWithKeys(token({nonce:'another-nonce-that-is-long-enough'}), clientId, nonce, keys, now), null));
test('rejects expired token', () => assert.equal(verifyTelegramIdTokenWithKeys(token({exp:now}), clientId, nonce, keys, now), null));
test('rejects stale token', () => assert.equal(verifyTelegramIdTokenWithKeys(token({iat:now-301}), clientId, nonce, keys, now), null));
test('rejects algorithm substitution', () => assert.equal(verifyTelegramIdTokenWithKeys(token({}, {alg:'HS256'}), clientId, nonce, keys, now), null));
test('rejects unknown signing key', () => assert.equal(verifyTelegramIdTokenWithKeys(token({}, {kid:'unknown'}), clientId, nonce, keys, now), null));
test('rejects forged signature', () => {
  const [header, payload, signature] = token().split('.');
  const forgedBytes = Buffer.from(signature, 'base64url');
  forgedBytes[0] ^= 1;
  const forged = `${header}.${payload}.${forgedBytes.toString('base64url')}`;
  assert.equal(verifyTelegramIdTokenWithKeys(forged, clientId, nonce, keys, now), null);
});

test('builds Telegram popup URL with an explicit production origin', () => {
  const url = new URL(buildTelegramLoginUrl({
    clientId: Number(clientId),
    nonce,
    origin: 'https://30-0.xn--p1ai',
    pathname: '/',
  }));
  assert.equal(url.origin, 'https://oauth.telegram.org');
  assert.equal(url.pathname, '/auth');
  assert.equal(url.searchParams.get('response_type'), 'post_message');
  assert.equal(url.searchParams.get('client_id'), clientId);
  assert.equal(url.searchParams.get('redirect_uri'), 'https://30-0.xn--p1ai/');
  assert.equal(url.searchParams.get('origin'), 'https://30-0.xn--p1ai');
  assert.equal(url.searchParams.get('scope'), 'openid profile');
  assert.equal(url.searchParams.get('nonce'), nonce);
  assert.equal(url.searchParams.get('lang'), 'ru');
});
