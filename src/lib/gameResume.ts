import type { GameScreen } from './types';

/** Restore a playable stage without reintroducing removed scouting UI. */
export function getResumeScreen(hasResult: boolean, allFilled: boolean, previousStage: GameScreen | null, current: GameScreen): GameScreen {
  if (hasResult) return 'result';
  if (!allFilled) return 'draft';
  const stage = previousStage ?? current;
  return stage === 'manager-choice' || stage === 'squad-complete'
    ? stage : 'squad-complete';
}
