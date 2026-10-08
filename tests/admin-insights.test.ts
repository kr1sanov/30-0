import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { adminRange, modeWhere, runWhere } from '../src/lib/adminInsights.ts';

test('Moscow calendar boundaries keep today and seven-day metrics consistent', () => {
  const now = new Date('2026-10-08T21:30:00Z'); // October 9 in Moscow
  const today = adminRange(new URLSearchParams('period=today'), now);
  const week = adminRange(new URLSearchParams('period=7d'), now);
  assert.equal(today.from?.toISOString(), '2026-10-08T21:00:00.000Z');
  assert.equal(week.from?.toISOString(), '2026-10-02T21:00:00.000Z');
  assert.deepEqual(runWhere('classic', week.from, week.to), { multiplayerSeat: null, clubFilter: null, createdAt: { gte: week.from } });
});

test('custom periods include the entire last day and reject inverted dates', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  const range = adminRange(new URLSearchParams('period=custom&from=2026-10-01&to=2026-10-07'), now);
  assert.equal(range.from?.toISOString(), '2026-09-30T21:00:00.000Z');
  assert.equal(range.to?.toISOString(), '2026-10-07T21:00:00.000Z');
  assert.throws(() => adminRange(new URLSearchParams('period=custom&from=2026-10-08&to=2026-10-01'), now));
  assert.throws(() => adminRange(new URLSearchParams('period=custom&from=2026-02-30&to=2026-03-01'), now));
});

test('multiplayer is identified by seat rather than the default gameMode column', () => {
  assert.deepEqual(modeWhere('multiplayer'), { multiplayerSeat: { isNot: null } });
  assert.deepEqual(modeWhere('single_club'), { multiplayerSeat: null, clubFilter: { not: null } });
});
