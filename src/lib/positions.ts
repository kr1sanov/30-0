// ============================================================================
// 30-0 RPL — Position Compatibility & Formation Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Position Types
// ---------------------------------------------------------------------------

/** Broad category a position belongs to */
export type PositionCategory = 'gk' | 'def' | 'mid' | 'att';

/** All 15 positions used in RPL football, in Russian abbreviations */
export type Position =
  | 'ВР'   // Вратарь — Goalkeeper
  | 'ЦЗ'   // Центральный защитник — Centre-back
  | 'ПЗ'   // Правый защитник — Right-back
  | 'ЛЗ'   // Левый защитник — Left-back
  | 'ПФЗ'  // Правый фланговый защитник — Right wing-back
  | 'ЛФЗ'  // Левый фланговый защитник — Left wing-back
  | 'ОП'   // Опорный полузащитник — Defensive midfielder
  | 'ЦП'   // Центральный полузащитник — Central midfielder
  | 'АП'   // Атакующий полузащитник — Attacking midfielder
  | 'ЛП'   // Левый полузащитник — Left midfielder
  | 'ПП'   // Правый полузащитник — Right midfielder
  | 'ЛВ'   // Левый вингер — Left winger
  | 'ПВ'   // Правый вингер — Right winger
  | 'НП'   // Нападающий — Striker
  | 'ЦН';  // Центральный нападающий — Centre-forward

/** All positions as a readonly array for iteration */
export const ALL_POSITIONS: readonly Position[] = [
  'ВР', 'ЦЗ', 'ПЗ', 'ЛЗ', 'ПФЗ', 'ЛФЗ',
  'ОП', 'ЦП', 'АП', 'ЛП', 'ПП', 'ЛВ', 'ПВ',
  'НП', 'ЦН',
] as const;

// ---------------------------------------------------------------------------
// Position → Category mapping
// ---------------------------------------------------------------------------

export const POSITION_CATEGORY: Record<Position, PositionCategory> = {
  'ВР':  'gk',
  'ЦЗ':  'def',
  'ПЗ':  'def',
  'ЛЗ':  'def',
  'ПФЗ': 'def',
  'ЛФЗ': 'def',
  'ОП':  'mid',
  'ЦП':  'mid',
  'АП':  'mid',
  'ЛП':  'mid',
  'ПП':  'mid',
  'ЛВ':  'att',
  'ПВ':  'att',
  'НП':  'att',
  'ЦН':  'att',
};

// ---------------------------------------------------------------------------
// Category → Display color
// ---------------------------------------------------------------------------

export const POSITION_COLOR: Record<PositionCategory, string> = {
  gk:  '#f97316', // orange
  def: '#3b82f6', // blue
  mid: '#22c55e', // green
  att: '#ef4444', // red
};

// ---------------------------------------------------------------------------
// Position Compatibility Matrix
// ---------------------------------------------------------------------------
// For each position, lists which slot positions it can play in and at what
// level:  'full' = no penalty, 'partial' = 0.8× rating penalty.
// Key = player's position, Value = map of slot positions to compatibility.
// ---------------------------------------------------------------------------

type CompatibilityMap = Record<Position, Partial<Record<Position, 'full' | 'partial'>>>;

const COMPATIBILITY: CompatibilityMap = {
  // ---- Goalkeeper ----
  'ВР': {
    'ВР': 'full',
  },

  // ---- Defenders ----
  'ЦЗ': {
    'ЦЗ': 'full',
    'ОП': 'partial',
  },
  'ПЗ': {
    'ПЗ':  'full',
    'ПФЗ': 'full',
    'ПП':  'partial',
  },
  'ЛЗ': {
    'ЛЗ':  'full',
    'ЛФЗ': 'full',
    'ЛП':  'partial',
  },
  'ПФЗ': {
    'ПФЗ': 'full',
    'ПЗ':  'full',
    'ПП':  'partial',
    'ПВ':  'partial',
  },
  'ЛФЗ': {
    'ЛФЗ': 'full',
    'ЛЗ':  'full',
    'ЛП':  'partial',
    'ЛВ':  'partial',
  },

  // ---- Midfielders ----
  'ОП': {
    'ОП': 'full',
    'ЦП': 'full',
    'ЦЗ': 'partial',
  },
  'ЦП': {
    'ЦП': 'full',
    'ОП': 'partial',
    'АП': 'partial',
  },
  'АП': {
    'АП': 'full',
    'ЦП': 'full',
    'ЦН': 'partial',
    'НП': 'partial',
  },
  'ЛП': {
    'ЛП':  'full',
    'ЛВ':  'full',
    'ЛЗ':  'partial',
    'ЛФЗ': 'partial',
  },
  'ПП': {
    'ПП':  'full',
    'ПВ':  'full',
    'ПЗ':  'partial',
    'ПФЗ': 'partial',
  },

  // ---- Attackers ----
  'ЛВ': {
    'ЛВ': 'full',
    'ЛП': 'full',
    'НП': 'partial',
    'ЦН': 'partial',
  },
  'ПВ': {
    'ПВ': 'full',
    'ПП': 'full',
    'НП': 'partial',
    'ЦН': 'partial',
  },
  'НП': {
    'НП': 'full',
    'ЦН': 'full',
    'АП': 'partial',
  },
  'ЦН': {
    'ЦН': 'full',
    'НП': 'full',
    'АП': 'partial',
  },
};

// ---------------------------------------------------------------------------
// getPositionCompatibility
// ---------------------------------------------------------------------------

/**
 * Returns how well a player with `playerPos` can play in `slotPos`.
 * - 'full'    → no penalty
 * - 'partial' → 0.8× rating penalty
 * - 'none'    → cannot fill that slot
 */
export function getPositionCompatibility(
  playerPos: Position,
  slotPos: Position,
): 'full' | 'partial' | 'none' {
  const map = COMPATIBILITY[playerPos];
  if (!map) return 'none';
  return map[slotPos] ?? 'none';
}

// ---------------------------------------------------------------------------
// getCompatiblePositions
// ---------------------------------------------------------------------------

/** Returns all slot positions a player with the given position can fill. */
export function getCompatiblePositions(pos: Position): Position[] {
  const map = COMPATIBILITY[pos];
  if (!map) return [];
  return (Object.keys(map) as Position[]).filter((slotPos) => map[slotPos] !== undefined);
}

// ---------------------------------------------------------------------------
// getCategoryForPosition
// ---------------------------------------------------------------------------

/** Returns the position category (gk/def/mid/att) for a given position. */
export function getCategoryForPosition(pos: Position): PositionCategory {
  return POSITION_CATEGORY[pos];
}

// ---------------------------------------------------------------------------
// canFillSlot
// ---------------------------------------------------------------------------

/**
 * Determines whether a player can fill a slot, considering both their main
 * position and any secondary positions.
 *
 * @returns `canFill` and the penalty multiplier (1 = no penalty, 0.8 = partial).
 */
export function canFillSlot(
  playerMainPos: Position,
  playerOtherPos: Position[],
  slotPos: Position,
): { canFill: boolean; penalty: number } {
  // Check main position first
  const mainCompat = getPositionCompatibility(playerMainPos, slotPos);
  if (mainCompat === 'full') return { canFill: true, penalty: 1 };
  if (mainCompat === 'partial') return { canFill: true, penalty: 0.8 };

  // Check other positions — look for best compatibility
  let bestPenalty = 0;
  for (const otherPos of playerOtherPos) {
    const compat = getPositionCompatibility(otherPos as Position, slotPos);
    if (compat === 'full') return { canFill: true, penalty: 1 };
    if (compat === 'partial' && bestPenalty < 0.8) {
      bestPenalty = 0.8;
    }
  }

  if (bestPenalty > 0) return { canFill: true, penalty: bestPenalty };
  return { canFill: false, penalty: 0 };
}

// ---------------------------------------------------------------------------
// Formation Definitions
// ---------------------------------------------------------------------------

export interface FormationSlot {
  position: Position;
  label: string;
}

export interface Formation {
  id: string;
  name: string;
  description: string;
  slots: FormationSlot[];
}

/** All 12 formations available in the game */
export const FORMATIONS: Formation[] = [
  // 1. 4-3-3 — Attacking with width
  {
    id: '4-3-3',
    name: '4-3-3',
    description: 'Атакующая с шириной',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ПЗ', label: 'ПЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЛЗ', label: 'ЛЗ' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ПВ', label: 'ПВ' },
      { position: 'НП', label: 'НП' },
      { position: 'ЛВ', label: 'ЛВ' },
    ],
  },

  // 2. 4-4-2 — Classic balanced
  {
    id: '4-4-2',
    name: '4-4-2',
    description: 'Классическая сбалансированная',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ПЗ', label: 'ПЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЛЗ', label: 'ЛЗ' },
      { position: 'ПП', label: 'ПП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЛП', label: 'ЛП' },
      { position: 'НП', label: 'НП' },
      { position: 'НП', label: 'НП' },
    ],
  },

  // 3. 4-2-3-1 — Modern defensive solidity
  {
    id: '4-2-3-1',
    name: '4-2-3-1',
    description: 'Современная с опорной',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ПЗ', label: 'ПЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЛЗ', label: 'ЛЗ' },
      { position: 'ОП', label: 'ОП' },
      { position: 'ОП', label: 'ОП' },
      { position: 'ПВ', label: 'ПВ' },
      { position: 'АП', label: 'АП' },
      { position: 'ЛВ', label: 'ЛВ' },
      { position: 'НП', label: 'НП' },
    ],
  },

  // 4. 3-5-2 — Wing-backs with two strikers
  {
    id: '3-5-2',
    name: '3-5-2',
    description: 'С фланговыми и двумя нападающими',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ПФЗ', label: 'ПФЗ' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ОП', label: 'ОП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЛФЗ', label: 'ЛФЗ' },
      { position: 'НП', label: 'НП' },
      { position: 'НП', label: 'НП' },
    ],
  },

  // 5. 3-4-3 — Attacking with three at the back
  {
    id: '3-4-3',
    name: '3-4-3',
    description: 'Атакующая с тройкой защитников',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ПП', label: 'ПП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЛП', label: 'ЛП' },
      { position: 'ПВ', label: 'ПВ' },
      { position: 'НП', label: 'НП' },
      { position: 'ЛВ', label: 'ЛВ' },
    ],
  },

  // 6. 5-3-2 — Defensive with three midfielders
  {
    id: '5-3-2',
    name: '5-3-2',
    description: 'Оборонительная с тройкой полузащиты',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ПФЗ', label: 'ПФЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЛФЗ', label: 'ЛФЗ' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'НП', label: 'НП' },
      { position: 'НП', label: 'НП' },
    ],
  },

  // 7. 5-4-1 — Ultra-defensive
  {
    id: '5-4-1',
    name: '5-4-1',
    description: 'Глубокая оборона',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ПФЗ', label: 'ПФЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЛФЗ', label: 'ЛФЗ' },
      { position: 'ПП', label: 'ПП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЛП', label: 'ЛП' },
      { position: 'НП', label: 'НП' },
    ],
  },

  // 8. 4-1-4-1 — Defensive mid shield
  {
    id: '4-1-4-1',
    name: '4-1-4-1',
    description: 'С опорным щитом',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ПЗ', label: 'ПЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЛЗ', label: 'ЛЗ' },
      { position: 'ОП', label: 'ОП' },
      { position: 'ПП', label: 'ПП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЛП', label: 'ЛП' },
      { position: 'НП', label: 'НП' },
    ],
  },

  // 9. 4-5-1 — Midfield dominance
  {
    id: '4-5-1',
    name: '4-5-1',
    description: 'Доминирование в полузащите',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ПЗ', label: 'ПЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЛЗ', label: 'ЛЗ' },
      { position: 'ПП', label: 'ПП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'АП', label: 'АП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЛП', label: 'ЛП' },
      { position: 'НП', label: 'НП' },
    ],
  },

  // 10. 4-4-1-1 — Defensive forward behind striker
  {
    id: '4-4-1-1',
    name: '4-4-1-1',
    description: 'Оттянутый нападающий за форвардом',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ПЗ', label: 'ПЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЛЗ', label: 'ЛЗ' },
      { position: 'ПП', label: 'ПП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЛП', label: 'ЛП' },
      { position: 'АП', label: 'АП' },
      { position: 'НП', label: 'НП' },
    ],
  },

  // 11. 3-4-1-2 — Narrow with trequartista
  {
    id: '3-4-1-2',
    name: '3-4-1-2',
    description: 'Узкая с диспетчером',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ПП', label: 'ПП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЦП', label: 'ЦП' },
      { position: 'ЛП', label: 'ЛП' },
      { position: 'АП', label: 'АП' },
      { position: 'НП', label: 'НП' },
      { position: 'ЦН', label: 'ЦН' },
    ],
  },

  // 12. 4-2-2-2 — Box midfield
  {
    id: '4-2-2-2',
    name: '4-2-2-2',
    description: 'Квадрат в полузащите',
    slots: [
      { position: 'ВР', label: 'ВР' },
      { position: 'ПЗ', label: 'ПЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЦЗ', label: 'ЦЗ' },
      { position: 'ЛЗ', label: 'ЛЗ' },
      { position: 'ОП', label: 'ОП' },
      { position: 'ОП', label: 'ОП' },
      { position: 'АП', label: 'АП' },
      { position: 'АП', label: 'АП' },
      { position: 'НП', label: 'НП' },
      { position: 'ЦН', label: 'ЦН' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Formation Lookup Helpers
// ---------------------------------------------------------------------------

/** Find a formation by its id. Returns undefined if not found. */
export function getFormationById(id: string): Formation | undefined {
  return FORMATIONS.find((f) => f.id === id);
}

/** Get the default formation (4-3-3). */
export function getDefaultFormation(): Formation {
  return FORMATIONS[0];
}

/** Count how many slots in a formation belong to each category. */
export function getFormationCategoryCounts(
  formation: Formation,
): Record<PositionCategory, number> {
  const counts: Record<PositionCategory, number> = { gk: 0, def: 0, mid: 0, att: 0 };
  for (const slot of formation.slots) {
    counts[getCategoryForPosition(slot.position)]++;
  }
  return counts;
}
