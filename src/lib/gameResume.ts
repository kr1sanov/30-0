import type { GameScreen } from './types';

/** Restore a playable stage; a pending network simulation returns to scouting. */
export function getResumeScreen(hasResult: boolean, allFilled: boolean, previousStage: GameScreen | null, current: GameScreen): GameScreen {
  if (hasResult) return 'result';
  if (!allFilled) return 'draft';
  const stage = previousStage ?? current;
  return stage === 'pre-match' || stage === 'manager-choice' || stage === 'squad-complete'
    ? stage : 'squad-complete';
}
