/**
 * Yandex.Metrika tracking utility
 * Counter ID: 110726199
 *
 * Provides type-safe event tracking for the 30-0 RPL app.
 * Works both inside Telegram WebApp and in regular browsers.
 */

const YM_ID = 110726199;

// Extend Window type for Yandex.Metrika
declare global {
  interface Window {
    ym: (
      id: number,
      method: string,
      ...args: unknown[]
    ) => void;
  }
}

/** Check if Yandex.Metrika is available */
function isAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.ym === 'function';
}

/** Send a pageview (for SPA navigation) */
export function trackPageView(url?: string): void {
  if (!isAvailable()) return;
  try {
    window.ym(YM_ID, 'hit', url || window.location.href);
  } catch {
    // silently fail
  }
}

/** Send a custom event */
export function trackEvent(event: string, params?: Record<string, unknown>): void {
  if (!isAvailable()) return;
  try {
    if (params) {
      window.ym(YM_ID, 'params', params);
    }
    window.ym(YM_ID, 'reachGoal', event, params);
  } catch {
    // silently fail
  }
}

/** Track a goal (alias for reachGoal) */
export function trackGoal(goal: string, params?: Record<string, unknown>): void {
  if (!isAvailable()) return;
  try {
    window.ym(YM_ID, 'reachGoal', goal, params);
  } catch {
    // silently fail
  }
}

/** Send user parameters */
export function trackUserParams(params: Record<string, unknown>): void {
  if (!isAvailable()) return;
  try {
    window.ym(YM_ID, 'userParams', params);
  } catch {
    // silently fail
  }
}

// ─── Predefined Events for 30-0 RPL ───

export const Metrics = {
  /** App launched */
  appStart: () => trackEvent('app_start', { source: typeof window !== 'undefined' && window.Telegram?.WebApp ? 'telegram' : 'browser' }),

  /** First launch ever */
  firstLaunch: () => trackEvent('first_launch'),

  /** New game started */
  gameStart: (config: { formation: string; difficulty: string; draftMode: string; ratingMode: string; eraFilter: string }) =>
    trackEvent('game_start', config),

  /** Draft completed (all 11 positions filled) */
  draftComplete: (stats: { totalRating: number; avgRating: number; rerollsUsed: number }) =>
    trackEvent('draft_complete', stats),

  /** Season started */
  seasonStart: (teamName?: string) =>
    trackEvent('season_start', { teamName }),

  /** Season finished */
  seasonFinish: (result: { wins: number; draws: number; losses: number; points: number; position: number }) =>
    trackEvent('season_finish', result),

  /** Title earned */
  titleEarned: (title: string) =>
    trackEvent('title_earned', { title }),

  /** Profile opened */
  profileOpen: () => trackEvent('profile_open'),

  /** Share result */
  shareResult: (platform: string) => trackEvent('share_result', { platform }),

  /** Invite friend */
  inviteFriend: () => trackEvent('invite_friend'),

  /** Leaderboard opened */
  leaderboardOpen: () => trackEvent('leaderboard_open'),

  /** Settings opened */
  settingsOpen: () => trackEvent('settings_open'),

  /** Difficulty selected */
  difficultySelect: (difficulty: string) => trackEvent('difficulty_select', { difficulty }),

  /** Era selected */
  eraSelect: (era: string) => trackEvent('era_select', { era }),

  /** Game mode selected */
  modeSelect: (mode: string) => trackEvent('mode_select', { mode }),

  /** App error */
  error: (error: string, context?: string) => trackEvent('app_error', { error, context }),

  /** Screen navigation (SPA) */
  screenView: (screen: string) => {
    trackPageView(`/#/${screen}`);
    trackEvent('screen_view', { screen });
  },

  /** Spin wheel */
  spinWheel: (club: string, season: string) =>
    trackEvent('spin_wheel', { club, season }),

  /** Player selected in draft */
  playerSelect: (playerName: string, rating: number, position: string) =>
    trackEvent('player_select', { playerName, rating, position }),
} as const;
