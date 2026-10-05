import test from 'node:test';
import assert from 'node:assert/strict';
import { getResumeScreen } from '../src/lib/gameResume.ts';

test('resumes an unfinished run at its last playable stage', () => {
  assert.equal(getResumeScreen(false, false, 'pre-match', 'home'), 'draft');
  assert.equal(getResumeScreen(false, true, 'pre-match', 'home'), 'pre-match');
  assert.equal(getResumeScreen(false, true, 'manager-choice', 'profile'), 'manager-choice');
  assert.equal(getResumeScreen(false, true, 'squad-complete', 'home'), 'squad-complete');
  assert.equal(getResumeScreen(false, true, null, 'home'), 'squad-complete');
  assert.equal(getResumeScreen(true, true, 'pre-match', 'home'), 'result');
});
