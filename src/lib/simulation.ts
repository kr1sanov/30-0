// ============================================================================
// 30-0 RPL — Season Simulation Engine
// ============================================================================
// Pure logic: no React, no side effects. All randomness is deterministic
// given the Math.random() calls — wrap in a seeded RNG if reproducibility
// is needed.
// ============================================================================

import type { PositionCategory } from './positions';
import { getCategoryForPosition } from './positions';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export interface SquadSlot {
  position: string;
  playerName: string;
  playerRating: number;
  isCompatible: boolean; // false ⇒ 0.8 penalty applied
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
}

export interface TableEntry {
  position: number;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface SeasonResult {
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  position: number;
  table: TableEntry[];
  matches: MatchDetail[];
}

export interface MatchDetail {
  matchday: number;
  opponent: string;
  isHome: boolean;
  homeGoals: number;
  awayGoals: number;
  result: 'W' | 'D' | 'L';
}

export interface SquadStrength {
  overall: number;
  attack: number;
  midfield: number;
  defence: number;
  gk: number;
}

// ---------------------------------------------------------------------------
// RPL Team Names (used for generating opponents)
// ---------------------------------------------------------------------------

const RPL_TEAMS = [
  'Зенит',
  'Спартак',
  'ЦСКА',
  'Локомотив',
  'Краснодар',
  'Динамо М',
  'Ростов',
  'Рубин',
  'Ахмат',
  'Урал',
  'Оренбург',
  'Факел',
  'Крылья Советов',
  'Торпедо',
  'Химки',
  'Пари НН',
] as const;

// ---------------------------------------------------------------------------
// calculateSquadStrength
// ---------------------------------------------------------------------------

/**
 * Calculates squad strength by line (ATT / MID / DEF / GK) and a weighted
 * overall rating.
 *
 * Weighting:  ATT × 0.30  +  MID × 0.30  +  DEF × 0.30  +  GK × 0.10
 *
 * If a slot has `isCompatible === false` the player's rating is multiplied
 * by 0.8 before averaging.
 *
 * If `managerRating` is provided, +2 is added to the overall score.
 */
export function calculateSquadStrength(
  slots: SquadSlot[],
  managerRating?: number,
): SquadStrength {
  const buckets: Record<PositionCategory, number[]> = {
    gk: [],
    def: [],
    mid: [],
    att: [],
  };

  for (const slot of slots) {
    const category = getCategoryForPosition(slot.position as Parameters<typeof getCategoryForPosition>[0]);
    let rating = slot.playerRating;
    if (!slot.isCompatible) {
      rating = Math.round(rating * 0.8);
    }
    buckets[category].push(rating);
  }

  const avg = (arr: number[]): number =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const gk  = Math.round(avg(buckets.gk)  * 10) / 10;
  const def = Math.round(avg(buckets.def) * 10) / 10;
  const mid = Math.round(avg(buckets.mid) * 10) / 10;
  const att = Math.round(avg(buckets.att) * 10) / 10;

  let overall = att * 0.3 + mid * 0.3 + def * 0.3 + gk * 0.1;

  if (managerRating !== undefined && managerRating > 0) {
    overall += 2;
  }

  overall = Math.round(overall * 10) / 10;

  return { overall, attack: att, midfield: mid, defence: def, gk };
}

// ---------------------------------------------------------------------------
// Math Helpers
// ---------------------------------------------------------------------------

/** Standard logistic / sigmoid function */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Poisson-distributed random number using the inverse-transform method
 * (Knuth algorithm).
 */
export function poissonRandom(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// ---------------------------------------------------------------------------
// simulateMatch
// ---------------------------------------------------------------------------

/**
 * Simulates a single match between two teams.
 *
 * - Home team receives a +3 strength bonus.
 * - Win probability is derived via sigmoid from the strength difference.
 * - Goals follow a Poisson distribution with λ proportional to relative
 *   strength (baseline ≈ 1.2 goals per team per match).
 *
 * @param teamStrength     Player's team strength (0–100)
 * @param opponentStrength Opponent's strength (0–100)
 * @param isHome           Whether the player's team is at home
 */
export function simulateMatch(
  teamStrength: number,
  opponentStrength: number,
  isHome: boolean,
): MatchResult {
  const homeAdvantage = 3;

  const homeStr = isHome ? teamStrength + homeAdvantage : opponentStrength + homeAdvantage;
  const awayStr = isHome ? opponentStrength : teamStrength;

  // Expected goals — baseline 1.2, scaled by relative strength
  const ratio = homeStr / (homeStr + awayStr);
  const homeLambda = 0.7 + ratio * 1.2;   // range ≈ 0.7 – 1.9
  const awayLambda = 0.7 + (1 - ratio) * 1.2;

  const homeGoals = poissonRandom(homeLambda);
  const awayGoals = poissonRandom(awayLambda);

  return { homeGoals, awayGoals };
}

// ---------------------------------------------------------------------------
// generateOpponent
// ---------------------------------------------------------------------------

interface Opponent {
  name: string;
  strength: number;
}

/**
 * Generates a random RPL opponent with strength uniformly sampled
 * from [55, 85].
 */
function generateOpponent(): Opponent {
  const name = RPL_TEAMS[Math.floor(Math.random() * RPL_TEAMS.length)];
  const strength = 55 + Math.random() * 30; // 55–85
  return { name, strength: Math.round(strength * 10) / 10 };
}

// ---------------------------------------------------------------------------
// simulateSeason
// ---------------------------------------------------------------------------

/**
 * Simulates a full 30-match RPL season.
 *
 * For each matchday the player's team faces a randomly generated opponent.
 * The final league table is built from 16 teams: the player + 15 generated
 * "other" teams whose results are derived statistically.
 *
 * @param slots         The player's filled squad slots
 * @param managerRating Optional manager rating (adds +2 overall if given)
 */
export function simulateSeason(
  slots: SquadSlot[],
  managerRating?: number,
): SeasonResult {
  const strength = calculateSquadStrength(slots, managerRating);
  const teamName = 'Моя команда';

  // --- Simulate player's 30 matches ---
  const matches: MatchDetail[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (let i = 0; i < 30; i++) {
    const opponent = generateOpponent();
    const isHome = i % 2 === 0; // alternate home/away

    const result = simulateMatch(strength.overall, opponent.strength, isHome);

    const playerGoals = isHome ? result.homeGoals : result.awayGoals;
    const oppGoals    = isHome ? result.awayGoals : result.homeGoals;

    let outcome: 'W' | 'D' | 'L';
    if (playerGoals > oppGoals) { outcome = 'W'; wins++; }
    else if (playerGoals < oppGoals) { outcome = 'L'; losses++; }
    else { outcome = 'D'; draws++; }

    goalsFor += playerGoals;
    goalsAgainst += oppGoals;

    matches.push({
      matchday: i + 1,
      opponent: opponent.name,
      isHome,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      result: outcome,
    });
  }

  const playerPoints = wins * 3 + draws;

  // --- Generate the other 15 teams in the table ---
  const playerEntry: TableEntry = {
    position: 0,
    name: teamName,
    played: 30,
    won: wins,
    drawn: draws,
    lost: losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points: playerPoints,
  };

  // Generate realistic stats for other teams using a simple model
  const otherTeams: TableEntry[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 15; i++) {
    let name: string;
    do {
      name = RPL_TEAMS[Math.floor(Math.random() * RPL_TEAMS.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    // Generate a strength for this team and simulate their season
    const teamStr = 55 + Math.random() * 30;
    let tW = 0, tD = 0, tL = 0, tGF = 0, tGA = 0;

    for (let j = 0; j < 30; j++) {
      const oppStr = 55 + Math.random() * 30;
      const isH = j % 2 === 0;
      const homeStr = isH ? teamStr + 3 : oppStr + 3;
      const awayStr = isH ? oppStr : teamStr;
      const ratio = homeStr / (homeStr + awayStr);
      const hGoals = poissonRandom(0.7 + ratio * 1.2);
      const aGoals = poissonRandom(0.7 + (1 - ratio) * 1.2);

      const myGoals = isH ? hGoals : aGoals;
      const theirGoals = isH ? aGoals : hGoals;

      if (myGoals > theirGoals) tW++;
      else if (myGoals < theirGoals) tL++;
      else tD++;

      tGF += myGoals;
      tGA += theirGoals;
    }

    otherTeams.push({
      position: 0,
      name,
      played: 30,
      won: tW,
      drawn: tD,
      lost: tL,
      goalsFor: tGF,
      goalsAgainst: tGA,
      goalDifference: tGF - tGA,
      points: tW * 3 + tD,
    });
  }

  // --- Build and sort the full table ---
  const fullTable = [playerEntry, ...otherTeams];

  // Sort by: points → goal difference → goals for → name
  fullTable.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name, 'ru');
  });

  // Assign positions
  for (let i = 0; i < fullTable.length; i++) {
    fullTable[i].position = i + 1;
  }

  // Find player's position
  const playerFinal = fullTable.find((e) => e.name === teamName)!;

  return {
    wins,
    draws,
    losses,
    points: playerPoints,
    goalsFor,
    goalsAgainst,
    position: playerFinal.position,
    table: fullTable,
    matches,
  };
}
