import { test } from 'node:test';
import assert from 'node:assert/strict';
import { singleFlight, serialRefresh, cachedValue } from '../src/lib/asyncWork.ts';
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };

test('slow overlapping polls share one read and resume after completion', async () => {
  let calls = 0;
  const wait = deferred<number>();
  const read = singleFlight(() => { calls++; return wait.promise; });
  const replies = Array.from({ length: 20 }, () => read());
  await Promise.resolve();
  assert.equal(calls, 1);
  wait.resolve(42);
  assert.deepEqual(await Promise.all(replies), Array(20).fill(42));
  await read(); assert.equal(calls, 2);
});

test('snapshot expires after completion and a failed refresh is retryable', async () => {
  let now = 0, calls = 0;
  const read = cachedValue(async () => { calls++; if (calls === 2) throw new Error('offline'); return calls; }, 100, () => now);
  assert.deepEqual(await Promise.all([read(), read(), read()]), [1,1,1]);
  now = 99; assert.equal(await read(), 1);
  now = 100; await assert.rejects(read(), /offline/);
  assert.equal(await read(), 3);
});

test('post-mutation refresh runs after the stale poll without overlapping or serving stale data', async () => {
  let calls = 0;
  const old = deferred<number>(), fresh = deferred<number>(), started = deferred<void>();
  const refresh = serialRefresh(() => { calls++; if (calls === 1) return old.promise; started.resolve(); return fresh.promise; });
  const poll = refresh(); await Promise.resolve();
  const afterPick = refresh(true), afterSettings = refresh(true);
  assert.equal(calls, 1);
  old.resolve(1); assert.equal(await poll, 1);
  await started.promise; assert.equal(calls, 2);
  fresh.resolve(2); assert.deepEqual(await Promise.all([afterPick, afterSettings]), [2, 2]);
});
