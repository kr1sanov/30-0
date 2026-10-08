// ============================================================================
// 30-0 RPL — Common TypeScript Types & Configs
// ============================================================================

// ---------------------------------------------------------------------------
// Game Configuration
// ---------------------------------------------------------------------------

export type GameModeType = 'classic' | 'single_club' | 'daily' | 'nations_cup';

export interface GameConfig {
  formation: string;
  difficulty: 'easy' | 'normal' | 'hard';
  draftMode: 'squad_first' | 'position_first';
  ratingMode: 'season' | 'prime';
  eraFilter: 'all' | 'early' | 'late' | 'custom';
  eraStartYear: number;
  eraEndYear: number;
  showRatings?: boolean; // overrides difficulty default; undefined = follow difficulty
  enableManagers?: boolean; // Gaffers toggle
  januaryTransfer?: boolean; // January Transfer Window toggle
  teamName?: string; // default: "Моя команда"
  gameMode?: GameModeType; // 'classic' (default) or 'single_club'
  clubFilter?: string; // clubId for single_club mode
  clubName?: string; // persisted presentation metadata for the selected club
  nationalityFilter?: string; // nationality name for nations_cup mode
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
  playerPrimeRating?: number;
  playerPosition?: string;
  playerOtherPositions?: string[];
  playerNationality?: string;
  playerSeasonYear?: number;
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
  primeRating?: number;
  primeSeason?: string;
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
  | 'daily-challenge'
  | 'nations-cup'
  | 'draft'
  | 'position-assign'
  | 'squad-complete'
  | 'pre-match'
  | 'manager-choice'
  | 'simulation'
  | 'result'
  | 'awards'
  | 'profile'
  | 'leaderboard'
  | 'history';

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

// Era presets with year ranges
export const ERA_CONFIG = {
  all:    { label: 'Все',    minYear: 2010, maxYear: 2021 },
  early:  { label: '2010–2014', minYear: 2010, maxYear: 2014 },
  late:   { label: '2015–2021', minYear: 2015, maxYear: 2021 },
  custom: { label: 'Свой',   minYear: 2010, maxYear: 2021 },
} as const;

export type EraFilter = keyof typeof ERA_CONFIG;

export const ERA_MIN_YEAR = 2010;
export const ERA_MAX_YEAR = 2021;

// ---------------------------------------------------------------------------
// Draft Mode & Rating Mode
// ---------------------------------------------------------------------------

export const DRAFT_MODE_CONFIG = {
  squad_first: { label: 'Сначала состав', description: 'Крути колесо, затем выбери игрока и позицию' },
  position_first: { label: 'Сначала позиция', description: 'Выбери позицию, затем крути колесо' },
} as const;

export const RATING_MODE_CONFIG = {
  season: { label: 'Сезонный рейтинг', description: 'Рейтинг игрока в конкретном сезоне' },
  prime: { label: 'Прайм-рейтинг', description: 'Потенциал игрока в выбранном сезоне' },
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

// ---------------------------------------------------------------------------
// Daily Challenge
// ---------------------------------------------------------------------------

export interface NationalityRequirement {
  nationality: string;
  flag: string;
  count: number;
}

export interface DailyChallenge {
  date: string;
  title: string;
  description: string;
  difficulty: string;
  nationalityRequirements: NationalityRequirement[];
  eraRestriction?: { start: number; end: number };
  formationLock?: string;
  bonusDescription?: string;
  completionOdds: number;
  maxAttempts: number;
  rerollsAllowed: number;
  bonusMultiplier: number;
  ratingCap?: number;
}
