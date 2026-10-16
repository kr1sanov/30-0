import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  archiveUnlockedUntil, challengeSucceeded, findWeeklyChallenge,
  issuesForWeek, listWeeklyChallenges, currentChallengeWindow,
} from '../src/lib/weeklyChallenges.ts';

test('Saturday 11:59 Moscow keeps old issues; 12:00 archives them and publishes new ones', () => {
  const before = new Date('2026-10-17T08:59:59.000Z');
  const after = new Date('2026-10-17T09:00:00.000Z');
  assert.deepEqual(listWeeklyChallenges(before).active.map(item => item.id), ['2026-10-10-vagner', '2026-10-10-dzyuba']);
  assert.deepEqual(listWeeklyChallenges(before).archive, []);
  assert.deepEqual(listWeeklyChallenges(after).active.map(item => item.id), ['2026-10-17-cska_blitz', '2026-10-17-akron_keeper']);
  assert.deepEqual(listWeeklyChallenges(after).archive.map(item => item.id), ['2026-10-10-vagner', '2026-10-10-dzyuba']);
  assert.equal(currentChallengeWindow(after).endsAt, '2026-10-24T09:00:00.000Z');
  assert.equal(findWeeklyChallenge('2026-10-24-vagner', after), null);
  assert.equal(findWeeklyChallenge('2026-10-10-vagner', after)?.mode, 'challenge_vagner');
});

test('each weekly issue has objective conditions and a stable identity', () => {
  const launch = issuesForWeek(0)[1];
  assert.equal(challengeSucceeded(launch, { position: 1, goalsFor: 59, losses: 0, points: 70 }), false);
  assert.equal(challengeSucceeded(launch, { position: 1, goalsFor: 60, losses: 3, points: 70 }), true);
  const blitz = issuesForWeek(1)[0];
  const matches = [3,3,3,1,1].map((goals, i) => ({ isHome: true, homeGoals: goals, awayGoals: i < 3 ? 0 : 1 }));
  assert.equal(challengeSucceeded(blitz, { position: 12, goalsFor: 40, losses: 10, points: 40, matches }), true);
  assert.equal(challengeSucceeded(blitz, { position: 1, goalsFor: 100, losses: 0, points: 90 }), false);
  matches[0].awayGoals = 1;
  assert.equal(challengeSucceeded(blitz, { position: 1, goalsFor: 100, losses: 0, points: 90, matches }), false);
});

test('referral unlock expires precisely 24 hours after the latest authenticated attribution', () => {
  const joined = new Date('2026-10-17T10:00:00Z');
  const records = [{ createdAt: new Date('2026-09-01T00:00:00Z'), referralJoinedAt: joined }];
  assert.equal(archiveUnlockedUntil(records, new Date('2026-10-18T09:59:59Z')), '2026-10-18T10:00:00.000Z');
  assert.equal(archiveUnlockedUntil(records, new Date('2026-10-18T10:00:00Z')), null);
  assert.equal(archiveUnlockedUntil([], joined), null);
});

test('keeper challenge needs a complete season and exact clean-sheet/conceded limits', () => {
  const issue = issuesForWeek(1)[1];
  const matches = Array.from({ length: 30 }, (_, i) => ({ isHome: true, homeGoals: 1, awayGoals: i < 15 ? 0 : 1 }));
  const result = { position: 8, goalsFor: 30, losses: 0, points: 60, matches };
  assert.equal(challengeSucceeded(issue, result), true);
  matches[15].awayGoals = 2;
  assert.equal(challengeSucceeded(issue, result), false);
});
