// ============================================================================
// 30-0 RPL — Season Simulation Engine (v2)
// ============================================================================
// Improved algorithm matching 38-0.app spec:
//   - Balance penalty for weak zones
//   - Sigmoid-based win probability
//   - ATT × 0.30 + MID × 0.25 + DEF × 0.30 + GK × 0.15
//   - January Transfer Window event (match 15)
//   - Trophy calculation
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

export interface Trophy {
  id: string;
  icon: string;
  name: string;
  description: string;
  earned: boolean;
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
  trophies: Trophy[];
  bestWinStreak: number;
  januaryTransferModifier?: number; // strength change from transfer window
}

export interface MatchDetail {
  matchday: number;
  opponent: string;
  isHome: boolean;
  homeGoals: number;
  awayGoals: number;
  result: 'W' | 'D' | 'L';
  scorers?: string[]; // e.g., ["Иванов 23'", "Петров 67'"]
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
// calculateImbalancePenalty
// ---------------------------------------------------------------------------

/**
 * Calculates a penalty for squad imbalance. If one zone is significantly
 * weaker than the others, the whole team suffers.
 *
 * The penalty is proportional to the maximum deviation from the mean of
 * the four zone ratings.
 */
function calculateImbalancePenalty(
  attack: number,
  midfield: number,
  defence: number,
  gk: number,
): number {
  const mean = (attack + midfield + defence + gk) / 4;
  const deviations = [
    Math.abs(attack - mean),
    Math.abs(midfield - mean),
    Math.abs(defence - mean),
    Math.abs(gk - mean),
  ];
  const maxDeviation = Math.max(...deviations);
  // Penalty scales with how imbalanced the squad is
  // A perfectly balanced squad: penalty = 0
  // A squad with a 20-point deviation: penalty ≈ 3
  return Math.round(maxDeviation * 0.15 * 10) / 10;
}

// ---------------------------------------------------------------------------
// calculateSquadStrength
// ---------------------------------------------------------------------------

/**
 * Calculates squad strength by line (ATT / MID / DEF / GK) and a weighted
 * overall rating.
 *
 * Weighting:  ATT × 0.30  +  MID × 0.25  +  DEF × 0.30  +  GK × 0.15
 *
 * Balance penalty: if one zone is much weaker than others, the overall is
 * reduced proportionally.
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

  // Balance penalty — weak zones penalize the whole team
  const balancePenalty = calculateImbalancePenalty(att, mid, def, gk);

  // Weighted overall with new weights: ATT 0.30, MID 0.25, DEF 0.30, GK 0.15
  let overall = att * 0.30 + mid * 0.25 + def * 0.30 + gk * 0.15;

  // Apply balance penalty
  overall -= balancePenalty;

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
// simulateMatch (v2 — sigmoid-based win probability)
// ---------------------------------------------------------------------------

/**
 * Simulates a single match between two teams using the 38-0 algorithm.
 *
 * - Home team receives a +3 strength bonus.
 * - Win probability is derived via sigmoid from the strength difference.
 * - Draw probability decreases with strength gap (minimum 5%).
 * - Goals follow a Poisson distribution.
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

  // Sigmoid-based win probability
  const delta = homeStr - awayStr;
  const homeWinProb = sigmoid(delta * 0.12);
  const drawProb = Math.max(0.20 - Math.abs(delta) * 0.003, 0.05);
  const awayWinProb = Math.max(1 - homeWinProb - drawProb, 0.02);

  // Normalize probabilities
  const total = homeWinProb + drawProb + awayWinProb;
  const normHome = homeWinProb / total;
  const normDraw = drawProb / total;

  // Determine outcome
  const roll = Math.random();
  let homeGoals: number;
  let awayGoals: number;

  if (roll < normHome) {
    // Home win — generate goals favoring home team
    const homeLambda = 1.4 + Math.abs(delta) * 0.02;
    const awayLambda = 0.6 + Math.max(0, 0.3 - Math.abs(delta) * 0.01);
    homeGoals = poissonRandom(homeLambda);
    awayGoals = poissonRandom(awayLambda);
    // Ensure home wins
    if (homeGoals <= awayGoals) homeGoals = awayGoals + 1 + Math.floor(Math.random() * 2);
  } else if (roll < normHome + normDraw) {
    // Draw — similar goals
    const lambda = 0.8 + Math.random() * 0.4;
    homeGoals = poissonRandom(lambda);
    awayGoals = homeGoals; // Force draw
  } else {
    // Away win — generate goals favoring away team
    const homeLambda = 0.6 + Math.max(0, 0.3 - Math.abs(delta) * 0.01);
    const awayLambda = 1.4 + Math.abs(delta) * 0.02;
    homeGoals = poissonRandom(homeLambda);
    awayGoals = poissonRandom(awayLambda);
    // Ensure away wins
    if (awayGoals <= homeGoals) awayGoals = homeGoals + 1 + Math.floor(Math.random() * 2);
  }

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
// calculateTrophies
// ---------------------------------------------------------------------------

/**
 * Calculates which trophies the player earned based on the season result.
 * Uses previous best points to determine "Взлёт" trophy.
 */
export function calculateTrophies(
  wins: number,
  draws: number,
  losses: number,
  goalsFor: number,
  goalsAgainst: number,
  position: number,
  bestWinStreak: number,
  previousBestPoints: number,
  currentPoints: number,
): Trophy[] {
  const trophies: Trophy[] = [
    {
      id: 'perfect_30_0',
      icon: '🏆',
      name: '30-0',
      description: 'Выиграть все 30 матчей',
      earned: wins === 30 && draws === 0 && losses === 0,
    },
    {
      id: 'invincible',
      icon: '🛡️',
      name: 'Непобедимый',
      description: '0 поражений за сезон',
      earned: losses === 0,
    },
    {
      id: 'champion',
      icon: '🥇',
      name: 'Чемпион',
      description: 'Занять 1-е место',
      earned: position === 1,
    },
    {
      id: 'top4',
      icon: '⭐',
      name: 'Топ-4',
      description: 'Попасть в топ-4',
      earned: position <= 4,
    },
    {
      id: 'goal_machine',
      icon: '⚽',
      name: 'Голевая машина',
      description: '60+ голов за сезон',
      earned: goalsFor >= 60,
    },
    {
      id: 'iron_defense',
      icon: '🧱',
      name: 'Железная оборона',
      description: '20 или менее пропущенных',
      earned: goalsAgainst <= 20,
    },
    {
      id: 'iron_curtain',
      icon: '🥅',
      name: 'Железный занавес',
      description: '10 или менее пропущенных',
      earned: goalsAgainst <= 10,
    },
    {
      id: 'personal_best',
      icon: '📈',
      name: 'Взлёт',
      description: 'Новый личный рекорд очков',
      earned: previousBestPoints > 0 && currentPoints > previousBestPoints,
    },
    {
      id: 'win_streak',
      icon: '🔥',
      name: 'Серия побед',
      description: '5+ побед подряд',
      earned: bestWinStreak >= 5,
    },
  ];

  return trophies;
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
 * January Transfer Window: on match 15, if enabled, a random +/- 2
 * strength modifier is applied.
 *
 * @param slots               The player's filled squad slots
 * @param managerRating       Optional manager rating (adds +2 overall if given)
 * @param januaryTransfer     Whether January Transfer Window is enabled
 * @param previousBestPoints  Player's previous best points (for Взлёт trophy)
 */
export function simulateSeason(
  slots: SquadSlot[],
  managerRating?: number,
  januaryTransfer?: boolean,
  previousBestPoints?: number,
): SeasonResult {
  const strength = calculateSquadStrength(slots, managerRating);
  const teamName = 'Моя команда';

  // Track dynamic strength (can change after transfer window)
  let currentStrength = strength.overall;
  let januaryTransferModifier: number | undefined;

  // --- Simulate player's 30 matches ---
  const matches: MatchDetail[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let bestWinStreak = 0;
  let currentWinStreak = 0;

  for (let i = 0; i < 30; i++) {
    // January Transfer Window event on match 15
    if (i === 14 && januaryTransfer) {
      const modifier = Math.random() > 0.5
        ? Math.round((Math.random() * 2 + 1) * 10) / 10  // +1 to +3
        : -Math.round((Math.random() * 2 + 1) * 10) / 10; // -1 to -3
      currentStrength = Math.max(40, Math.min(99, currentStrength + modifier));
      januaryTransferModifier = modifier;
    }

    const opponent = generateOpponent();
    const isHome = i % 2 === 0; // alternate home/away

    const result = simulateMatch(currentStrength, opponent.strength, isHome);

    const playerGoals = isHome ? result.homeGoals : result.awayGoals;
    const oppGoals    = isHome ? result.awayGoals : result.homeGoals;

    let outcome: 'W' | 'D' | 'L';
    if (playerGoals > oppGoals) {
      outcome = 'W';
      wins++;
      currentWinStreak++;
      bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
    } else if (playerGoals < oppGoals) {
      outcome = 'L';
      losses++;
      currentWinStreak = 0;
    } else {
      outcome = 'D';
      draws++;
      currentWinStreak = 0;
    }

    goalsFor += playerGoals;
    goalsAgainst += oppGoals;

    // Generate goal scorers for player's team
    const scorers: string[] = [];
    if (playerGoals > 0) {
      const attackerNames = slots
        .filter(s => {
          const cat = getCategoryForPosition(s.position as Parameters<typeof getCategoryForPosition>[0]);
          return cat === 'att' || cat === 'mid';
        })
        .map(s => s.playerName.split(' ').pop() || s.playerName); // Last name only

      const allNames = slots.map(s => s.playerName.split(' ').pop() || s.playerName);

      for (let g = 0; g < playerGoals; g++) {
        const minute = Math.floor(Math.random() * 90) + 1;
        // Prefer attackers/midfielders for goals
        const name = attackerNames.length > 0 && Math.random() > 0.2
          ? attackerNames[Math.floor(Math.random() * attackerNames.length)]
          : allNames[Math.floor(Math.random() * allNames.length)];
        scorers.push(`${name} ${minute}'`);
      }
      // Sort by minute
      scorers.sort((a, b) => {
        const minA = parseInt(a.match(/(\d+)'/)?.[1] || '0');
        const minB = parseInt(b.match(/(\d+)'/)?.[1] || '0');
        return minA - minB;
      });
    }

    matches.push({
      matchday: i + 1,
      opponent: opponent.name,
      isHome,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
      result: outcome,
      scorers,
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
      const matchResult = simulateMatch(teamStr, oppStr, j % 2 === 0);

      const myGoals = j % 2 === 0 ? matchResult.homeGoals : matchResult.awayGoals;
      const theirGoals = j % 2 === 0 ? matchResult.awayGoals : matchResult.homeGoals;

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

  // Sort by: points → goal difference → goals for → head-to-head (name as tiebreaker)
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

  // --- Calculate trophies ---
  const trophies = calculateTrophies(
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    playerFinal.position,
    bestWinStreak,
    previousBestPoints ?? 0,
    playerPoints,
  );

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
    trophies,
    bestWinStreak,
    januaryTransferModifier,
  };
}
