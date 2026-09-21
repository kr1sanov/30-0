import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, sessionUser, sameOrigin, SESSION_COOKIE, SESSION_SECONDS } from '../src/lib/telegramSession.ts';
process.env.TELEGRAM_SESSION_SECRET = 'test-only-session-secret-at-least-32-characters';
const now = 1800000000;
const request = (token: string) => new Request('https://example.com/api/runs', { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
test('session round trip', () => assert.equal(sessionUser(request(createSession('user-1', now)), now), 'user-1'));
test('session expiry is enforced', () => assert.equal(sessionUser(request(createSession('user-1', now)), now + SESSION_SECONDS), null));
test('session body tampering fails', () => {
  const token = createSession('user-1', now);
  const forged = Buffer.from(JSON.stringify({sub:'user-2',exp:now+100})).toString('base64url') + '.' + token.split('.')[1];
  assert.equal(sessionUser(request(forged), now), null);
});
test('unsigned cookie fails', () => assert.equal(sessionUser(request('user-1'), now), null));
test('duplicate session cookie fails', () => {
  const token = createSession('user-1', now);
  assert.equal(sessionUser(new Request('https://example.com', {headers:{cookie:`${SESSION_COOKIE}=${token}; ${SESSION_COOKIE}=${token}`}}), now), null);
});
test('cross-origin mutation rejected', () => assert.equal(sameOrigin(new Request('https://example.com', {headers:{origin:'https://attacker.example'}})), false));
test('same-origin mutation accepted', () => assert.equal(sameOrigin(new Request('https://example.com', {headers:{origin:'https://example.com'}})), true));
