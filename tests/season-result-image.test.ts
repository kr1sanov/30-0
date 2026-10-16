import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { seasonResultImage } from '../src/lib/seasonResultImage.ts';
const run = { teamName: 'QA & <test>', points: 57, wins: 17, draws: 6, losses: 7, position: 3, goalsFor: 59, goalsAgainst: 31, user: { username: 'qa', displayName: 'QA' } };
test('Telegram cards render the existing logo and localized result in each mode with distinct colors', async () => {
  const fingerprints = new Set<string>();
  for (const gameMode of ['classic','single_club','multiplayer','challenge_cska_blitz']) {
    const ru = await seasonResultImage({ ...run, gameMode, challengeIssueId: gameMode.startsWith('challenge') ? '2026-10-17-cska_blitz' : null }, 'ru');
    const en = await seasonResultImage({ ...run, gameMode }, 'en');
    const meta = await sharp(ru).metadata();
    assert.equal(meta.width,1200);assert.equal(meta.height,760);assert.equal(meta.format,'png');
    assert.notDeepEqual(ru,en);
    const pixel = await sharp(ru).extract({ left: 700, top: 100, width: 1, height: 1 }).raw().toBuffer();
    fingerprints.add(pixel.toString('hex'));
    const logo = await sharp(ru).extract({ left: 64, top: 64, width: 88, height: 88 }).stats();
    assert.ok(logo.channels.some(channel => channel.stdev > 30));
  }
  assert.equal(fingerprints.size,4);
});
