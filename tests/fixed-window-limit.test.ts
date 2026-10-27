import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FixedWindowLimit } from '../src/lib/fixedWindowLimit.ts';
const options = { limit: 2, windowMs: 5_000 };
test('limits survive interleaved keys and reset exactly at the window boundary', () => {
  const limiter = new FixedWindowLimit();
  assert.equal(limiter.consume('alice', options, 0).allowed, true);
  assert.equal(limiter.consume('bob', options, 1).allowed, true);
  assert.equal(limiter.consume('alice', options, 2).allowed, true);
  assert.deepEqual(limiter.consume('alice', options, 4999), { allowed: false, resetAt: 5000 });
  assert.deepEqual(limiter.consume('alice', options, 5000), { allowed: true, resetAt: 10000 });
});
test('address floods cannot evict active limits or grow the store without bound', () => {
  const limiter = new FixedWindowLimit(2);
  limiter.consume('alice', options, 0); limiter.consume('bob', options, 0);
  for (let i = 0; i < 100; i++) assert.equal(limiter.consume('flood-'+i, options, 1).allowed, false);
  assert.equal(limiter.consume('alice', options, 2).allowed, true);
  assert.equal(limiter.consume('alice', options, 3).allowed, false);
  assert.equal(limiter.consume('carol', options, 5000).allowed, true);
});
