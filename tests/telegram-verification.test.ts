import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { verifyMiniApp, verifyLoginWidget } from '../src/lib/telegramVerification.ts';

const token = '123456:test-only-not-a-real-token';
const now = 1800000000;
const user = { id: 1234567, first_name: 'Никита', username: 'test_player' };
function mini(extra: Record<string, string> = {}) {
  const fields = { auth_date: String(now), user: JSON.stringify(user), ...extra };
  const check = Object.entries(fields).sort().map(([k,v]) => `${k}=${v}`).join('\n');
  const key = createHmac('sha256', 'WebAppData').update(token).digest();
  return new URLSearchParams({ ...fields, hash: createHmac('sha256', key).update(check).digest('hex') }).toString();
}
function widget(extra: Record<string, unknown> = {}) {
  const fields = { ...user, auth_date: now, ...extra };
  const check = Object.entries(fields).sort().map(([k,v]) => `${k}=${v}`).join('\n');
  return { ...fields, hash: createHmac('sha256', createHash('sha256').update(token).digest()).update(check).digest('hex') };
}
test('Mini App accepts a valid signature and Cyrillic name', () => {
  assert.deepEqual(verifyMiniApp(mini(), token, now), {id:'1234567', firstName:'Никита', lastName:undefined, username:'test_player'});
});
test('Mini App rejects tampering', () => assert.equal(verifyMiniApp(mini().replace('1234567','7654321'), token, now), null));
test('Mini App rejects duplicate fields', () => assert.equal(verifyMiniApp(mini()+'&auth_date='+now, token, now), null));
test('Mini App rejects expired data', () => assert.equal(verifyMiniApp(mini({auth_date:String(now-301)}), token, now), null));
test('Mini App rejects future data', () => assert.equal(verifyMiniApp(mini({auth_date:String(now+31)}), token, now), null));
test('Mini App rejects malformed user JSON', () => assert.equal(verifyMiniApp(mini({user:'{'}), token, now), null));
test('Mini App rejects another bot', () => assert.equal(verifyMiniApp(mini(), 'other-token', now), null));
test('Mini App rejects missing configuration', () => assert.equal(verifyMiniApp(mini(), '', now), null));
test('Widget accepts valid data', () => assert.equal(verifyLoginWidget(widget(), token, now)?.id, '1234567'));
test('Widget rejects forged user', () => assert.equal(verifyLoginWidget({...widget(),id:42}, token, now), null));
test('Widget rejects expired data', () => assert.equal(verifyLoginWidget(widget({auth_date:now-301}), token, now), null));
test('Widget rejects malformed hash', () => assert.equal(verifyLoginWidget({...widget(),hash:'zz'}, token, now), null));
test('Widget rejects invalid ID', () => assert.equal(verifyLoginWidget(widget({id:-1}), token, now), null));
