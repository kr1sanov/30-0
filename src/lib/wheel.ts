// ============================================================================
// 30-0 RPL — Wheel Spinning Logic
// ============================================================================
// Handles filtering which club-seasons are compatible with the remaining
// draft slots and performing the weighted random selection ("spin").
// ============================================================================

import type { Position } from './positions';
import { canFillSlot } from './positions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClubSeasonOption {
  clubSeasonId: string;
  clubName: string;
  seasonLabel: string;
}

export interface ClubSeasonWithPlayers extends ClubSeasonOption {
  /** Positions that the club-season's players can cover */
  availablePositions: Position[];
}

// ---------------------------------------------------------------------------
// filterCompatibleClubSeasons
// ---------------------------------------------------------------------------

/**
 * Filters club-seasons down to those that have at least one player who can
 * fill one of the remaining open positions.
 *
 * This prevents the wheel from landing on a club that provides no useful
 * players for the squad.
 *
 * @param openPositions  Position codes still needed in the squad (e.g. ['ЦЗ', 'НП'])
 * @param allClubSeasons All available club-season options with their position info
 */
export function filterCompatibleClubSeasons(
  openPositions: string[],
  allClubSeasons: ClubSeasonWithPlayers[],
): ClubSeasonWithPlayers[] {
  if (openPositions.length === 0) return [];

  return allClubSeasons.filter((cs) => {
    // A club-season is compatible if any of its available positions
    // can fill any of the open slots (even partially)
    for (const playerPos of cs.availablePositions) {
      for (const slotPos of openPositions) {
        const { canFill } = canFillSlot(playerPos, [], slotPos as Position);
        if (canFill) return true;
      }
    }
    return false;
  });
}

// ---------------------------------------------------------------------------
// Spin Weights
// ---------------------------------------------------------------------------

/**
 * Optional weight configuration to make certain clubs more or less likely
 * to appear.  Higher tier clubs (Zenit, CSKA, etc.) can be made rarer
 * in harder difficulties.
 */
export interface SpinWeights {
  /** Clubs to boost/reroll less (higher = more common) */
  boost?: Record<string, number>;
  /** Clubs to suppress (lower = less common) */
  suppress?: Record<string, number>;
  /** Base weight for all clubs (default 1) */
  base?: number;
}

// ---------------------------------------------------------------------------
// spinWheel
// ---------------------------------------------------------------------------

/**
 * Randomly selects a club-season from the given options, applying optional
 * weighting.
 *
 * The selection uses weighted random sampling — each option's weight is
 * `base` (default 1) multiplied by any boost/suppress factor defined in
 * `weights`. The result is proportional to weight.
 *
 * @param options  Pre-filtered list of compatible club-seasons
 * @param weights  Optional weighting configuration
 * @returns The selected club-season
 * @throws Error if options is empty
 */
export function spinWheel(
  options: ClubSeasonOption[],
  weights?: SpinWeights,
): ClubSeasonOption {
  if (options.length === 0) {
    throw new Error('Cannot spin wheel: no compatible club-seasons available');
  }

  // Short-circuit: if only one option, return it
  if (options.length === 1) return options[0];

  const base = weights?.base ?? 1;

  // Calculate weights for each option
  const optionWeights = options.map((opt) => {
    let w = base;
    if (weights?.boost?.[opt.clubSeasonId]) {
      w *= weights.boost[opt.clubSeasonId];
    }
    if (weights?.suppress?.[opt.clubSeasonId]) {
      w *= weights.suppress[opt.clubSeasonId];
    }
    return Math.max(w, 0.01); // ensure no zero-weight
  });

  // Weighted random selection
  const totalWeight = optionWeights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;

  for (let i = 0; i < options.length; i++) {
    roll -= optionWeights[i];
    if (roll <= 0) return options[i];
  }

  // Fallback (should not happen due to floating point, but just in case)
  return options[options.length - 1];
}

// ---------------------------------------------------------------------------
// spinWheelWithAnimation
// ---------------------------------------------------------------------------

/**
 * Simulates a "spinning wheel" effect by pre-computing the sequence of
 * highlighted options that will flash before landing on the final one.
 *
 * This is used for the visual spinning animation on the frontend — the
 * actual game logic result is identical to `spinWheel`.
 *
 * @param options   Compatible club-seasons
 * @param weights   Optional weighting
 * @param spinCount Number of "ticks" before landing (default 20–40)
 * @returns An object with the final result and the animation sequence
 */
export interface SpinAnimation {
  /** The final selected club-season */
  result: ClubSeasonOption;
  /** Ordered list of options that flash during the spin animation */
  sequence: ClubSeasonOption[];
  /** Index in `sequence` where the final result appears (always last) */
  finalIndex: number;
}

export function spinWheelWithAnimation(
  options: ClubSeasonOption[],
  weights?: SpinWeights,
  spinCount?: number,
): SpinAnimation {
  const result = spinWheel(options, weights);
  const count = spinCount ?? 20 + Math.floor(Math.random() * 20);

  // Generate a random sequence that ends with the actual result
  const sequence: ClubSeasonOption[] = [];
  for (let i = 0; i < count - 1; i++) {
    // Random option from the pool (not necessarily the result)
    const idx = Math.floor(Math.random() * options.length);
    sequence.push(options[idx]);
  }
  sequence.push(result); // Always end on the actual result

  return {
    result,
    sequence,
    finalIndex: sequence.length - 1,
  };
}
