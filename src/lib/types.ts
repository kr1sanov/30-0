// ============================================================================
// 30-0 RPL — Common TypeScript Types & Configs
// ============================================================================

// ---------------------------------------------------------------------------
// Game Configuration
// ---------------------------------------------------------------------------

export interface GameConfig {
  formation: string;
  difficulty: 'easy' | 'normal' | 'hard';
  draftMode: 'squad_first' | 'position_first';
  ratingMode: 'season' | 'prime';
  eraFilter: 'all' | '2000s' | '2010s' | 'modern';
  showRatings?: boolean; // overrides difficulty default; undefined = follow difficulty
  enableManagers?: boolean; // Gaffers toggle
  januaryTransfer?: boolean; // January Transfer Window toggle
  teamName?: string; // default: "Моя команда"
}

// ---------------------------------------------------------------------------
// Draft Slot
// ---------------------------------------------------------------------------

export interface DraftSlot {
  position: string;
  positionLabel: string;
  playerId?: string;
  playerName?: string;
  playerLastName?: string;
  playerRating?: number;
  playerPosition?: string;
  playerOtherPositions?: string[];
  playerNationality?: string;
  isCompatible?: boolean;
  category: 'gk' | 'def' | 'mid' | 'att';
}

// ---------------------------------------------------------------------------
// Spin / Draft Results
// ---------------------------------------------------------------------------

export interface SpinResult {
  clubSeasonId: string;
  clubName: string;
  seasonLabel: string;
  players: PlayerOption[];
}

export interface PlayerOption {
  playerSeasonId: string;
  fullName: string;
  lastName: string;
  rating: number;
  mainPosition: string;
  otherPositions: string[];
  nationality?: string;
}

// ---------------------------------------------------------------------------
// Game Screen State
// ---------------------------------------------------------------------------

export type GameScreen =
  | 'home'
  | 'setup'
  | 'draft'
  | 'position-assign'
  | 'squad-complete'
  | 'pre-match'
  | 'manager-choice'
  | 'simulation'
  | 'result'
  | 'awards'
  | 'profile'
  | 'leaderboard';

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

// ---------------------------------------------------------------------------
// Difficulty & Era Configuration
// ---------------------------------------------------------------------------

export const DIFFICULTY_CONFIG = {
  easy: { rerolls: 3, showRatings: true, label: 'Легко' },
  normal: { rerolls: 1, showRatings: true, label: 'Нормально' },
  hard: { rerolls: 0, showRatings: false, label: 'Сложно' },
} as const;

export type Difficulty = keyof typeof DIFFICULTY_CONFIG;

export const ERA_CONFIG = {
  all: { label: 'Все', minYear: 2000 },
  '2000s': { label: '2000+', minYear: 2000 },
  '2010s': { label: '2010+', minYear: 2010 },
  modern: { label: '2016+', minYear: 2016 },
} as const;

export type EraFilter = keyof typeof ERA_CONFIG;

// ---------------------------------------------------------------------------
// Draft Mode & Rating Mode
// ---------------------------------------------------------------------------

export const DRAFT_MODE_CONFIG = {
  squad_first: { label: 'Сначала состав', description: 'Крутите колесо, затем выберите игрока и позицию' },
  position_first: { label: 'Сначала позиция', description: 'Выберите позицию, затем крутите колесо' },
} as const;

export const RATING_MODE_CONFIG = {
  season: { label: 'Сезонный рейтинг', description: 'Рейтинг игрока в конкретном сезоне' },
  prime: { label: 'Прайм-рейтинг', description: 'Лучший рейтинг игрока за карьеру' },
} as const;

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export interface ManagerOption {
  id: string;
  fullName: string;
  rating: number;
  nationality?: string;
  specialAbility?: string;
}

// ---------------------------------------------------------------------------
// Leaderboard Entry
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  formation: string;
  difficulty: Difficulty;
  squadRating: number;
  seasonPoints: number;
  seasonPosition: number;
  createdAt: string;
}
