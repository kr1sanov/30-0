/** Tokens come exclusively from finishing first in a completed season. */
export function seasonReward(mode: string, position: number, hasHumanOpponent = false): number {
  if (position !== 1) return 0;
  if (mode === 'multiplayer') return hasHumanOpponent ? 35 : 15;
  if (mode === 'single_club') return 25;
  if (mode.startsWith('challenge_')) return 30;
  return mode === 'classic' ? 20 : 0;
}
