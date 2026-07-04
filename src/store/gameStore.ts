import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameScreen, GameConfig, DraftSlot, SpinResult, PlayerOption, LeaderboardEntry, Achievement } from '@/lib/types';
import { FORMATIONS, POSITION_CATEGORY, canFillSlot, canFillSlotStrict } from '@/lib/positions';
import type { Position } from '@/lib/positions';
import { DIFFICULTY_CONFIG } from '@/lib/types';
import { MANAGERS } from '@/lib/managers';
import type { Manager } from '@/lib/managers';

/**
 * ============================================================================
 * 30-0 RPL — Football Draft Simulator Store
 * ============================================================================
 *
 * CRITICAL FLOW (matching 38-0.app):
 *
 * 1. User clicks "Spin the Wheel" → spin() API call, slot machine animation plays
 * 2. Result: Club × Season appears, player list shows below
 * 3. User clicks a player from the list → selectPlayer() sets selectedPlayer (NOT auto-assigned!)
 * 4. FormationView shows available positions highlighted for the selected player
 * 5. User clicks a position on the football field → assignToSlot() assigns the player
 * 6. After assignment → selectedPlayer cleared, currentSpin cleared, ready for next spin immediately
 * 7. Analytics/squad stats update immediately upon placement
 *
 * The screen state stays 'draft' throughout the entire draft phase.
 * Only transitions to 'squad-complete' when all 11 positions are filled.
 * ============================================================================
 */

// All available achievements (must match ProfileScreen TROPHIES)
const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'champion', name: 'Чемпион', description: 'Выиграть чемпионат', icon: '🏆', condition: 'position === 1' },
  { id: 'perfect', name: '30-0', description: 'Идеальный сезон', icon: '✨', condition: 'wins === 30 && draws === 0 && losses === 0' },
  { id: 'goal_machine', name: 'Голевая машина', description: '60+ голов за сезон', icon: '⚡', condition: 'goalsFor >= 60' },
  { id: 'iron_defense', name: 'Железная оборона', description: 'Разница +50', icon: '🧱', condition: 'goalsFor - goalsAgainst > 50' },
  { id: 'win_streak', name: 'Серия побед', description: '5+ побед подряд', icon: '🔥', condition: 'maxStreak >= 5' },
  { id: 'sniper', name: 'Снайпер', description: '2+ гола за матч', icon: '🎯', condition: 'goalsFor / 30 >= 2' },
  { id: 'fortress', name: 'Дом-крепость', description: '0 домашних поражений', icon: '🏟️', condition: 'homeLosses === 0' },
  { id: 'elite', name: 'Элита', description: 'Средний рейтинг 80+', icon: '💎', condition: 'squadRating >= 80' },
];

// ---------------------------------------------------------------------------
// Telegram User
// ---------------------------------------------------------------------------
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface ProfileStats {
  totalSeasons: number;
  bestPoints: number;
  bestRecord: string;
  titles: number;
  perfect: number;
  totalWins: number;
  totalGoals: number;
  favoriteFormation: string;
  achievements: string[];
  history: Array<{
    id: string;
    date: string;
    formation: string;
    difficulty: string;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    position: number;
    managerName?: string | null;
    teamName?: string | null;
  }>;
}

interface LastDraftState {
  slots: DraftSlot[];
  currentSpin: SpinResult | null;
  selectedPlayer: PlayerOption | null;
  screen: GameScreen;
}

interface GameState {
  // Navigation
  screen: GameScreen;
  setScreen: (screen: GameScreen) => void;

  // Telegram user
  telegramUser: TelegramUser | null;
  setTelegramUser: (user: TelegramUser | null) => void;

  // Game config
  config: GameConfig;
  setConfig: (config: Partial<GameConfig>) => void;

  // Run
  runId: string | null;
  slots: DraftSlot[];
  rerollsLeft: number;
  rerollsUsed: number;

  // Draft state
  currentSpin: SpinResult | null;
  isSpinning: boolean;
  selectedPlayer: PlayerOption | null;
  movingPlayerSlotIndex: number | null;

  // Track the last assigned slot index for auto-scroll/feedback
  lastAssignedSlotIndex: number | null;

  // Slot index that was just assigned — used for highlight animation on pitch
  justAssignedSlotIndex: number | null;

  // Action to clear the just-assigned highlight
  clearJustAssigned: () => void;

  // Draft error tracking — set when draft API fails, cleared on next action
  lastDraftError: string | null;

  // Draft undo
  lastDraftState: LastDraftState | null;

  // Draft version counter — incremented on each draft action to prevent stale error reverts
  draftVersion: number;

  // Manager
  currentManager: Manager | null;
  isSpinningManager: boolean;

  // Result
  seasonResult: Record<string, unknown> | null;

  // Profile stats (persisted)
  profileStats: ProfileStats;

  // Leaderboard
  leaderboard: LeaderboardEntry[];

  // Last config for quick replay
  lastConfig: GameConfig | null;

  // New achievements to show in popup
  newAchievements: Achievement[];

  // Actions
  startRun: () => Promise<void>;
  spin: () => Promise<void>;
  reroll: () => Promise<void>;
  selectPlayer: (player: PlayerOption) => void;
  deselectPlayer: () => void;
  assignToSlot: (slotIndex: number) => Promise<void>;
  directAssign: (player: PlayerOption, slotIndex: number) => Promise<void>;
  movePlayer: (fromSlotIndex: number, toSlotIndex: number) => void;
  finishMoving: () => void;
  spinManager: (manager?: Manager) => Promise<void>;
  simulate: (manager?: Manager | null) => Promise<void>;
  resetGame: () => void;
  goHome: () => void;
  resumeGame: () => void;
  loadLeaderboard: () => Promise<void>;
  updateProfileStats: (result: Record<string, unknown>) => void;
  undoLastPick: () => Promise<void>;
  skipSpin: () => void;
  dismissAchievement: () => void;
  syncProfileToCloud: () => Promise<void>;
  loadProfileFromCloud: () => Promise<void>;
}

const defaultConfig: GameConfig = {
  formation: '4-3-3',
  difficulty: 'normal',
  draftMode: 'squad_first',
  ratingMode: 'season',
  eraFilter: 'all',
};

const defaultProfileStats: ProfileStats = {
  totalSeasons: 0,
  bestPoints: 0,
  bestRecord: '0-0-0',
  titles: 0,
  perfect: 0,
  totalWins: 0,
  totalGoals: 0,
  favoriteFormation: '4-3-3',
  achievements: [],
  history: [],
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Navigation
      screen: 'home',
      setScreen: (screen) => set({ screen }),

      // Telegram user
      telegramUser: null,
      setTelegramUser: (user) => set({ telegramUser: user }),

      // Config
      config: defaultConfig,
      setConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),

      // Run
      runId: null,
      slots: [],
      rerollsLeft: 0,
      rerollsUsed: 0,

      // Draft
      currentSpin: null,
      isSpinning: false,
      selectedPlayer: null,
      movingPlayerSlotIndex: null,
      lastAssignedSlotIndex: null,
      justAssignedSlotIndex: null,

      clearJustAssigned: () => set({ justAssignedSlotIndex: null }),

      // Draft undo
      lastDraftError: null,
      lastDraftState: null,
      draftVersion: 0,

      // Manager
      currentManager: null,
      isSpinningManager: false,

      // Result
      seasonResult: null,

      // Profile (persisted)
      profileStats: defaultProfileStats,

      // Leaderboard
      leaderboard: [],

      // Last config for quick replay
      lastConfig: null,

      // New achievements
      newAchievements: [],

      // =====================================================================
      // ACTIONS
      // =====================================================================

      startRun: async () => {
        const { config } = get();
        // Immediately switch to draft screen so the UI feels instant
        set({ screen: 'draft' });
        try {
          const res = await fetch('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
          });

          if (!res.ok) {
            console.error('Failed to start run:', await res.json());
            return;
          }

          const data = await res.json();

          const formation = FORMATIONS.find((f) => f.id === config.formation);
          if (!formation) return;

          const slots: DraftSlot[] = formation.slots.map((slot, index) => {
            const category = POSITION_CATEGORY[slot.position];
            const dbSlot = data.slots?.find(
              (s: { slotPosition: string }) => s.slotPosition === `${slot.position}_${index}`,
            );

            if (dbSlot?.playerSeasonId) {
              return {
                position: slot.position,
                positionLabel: slot.label,
                playerId: dbSlot.playerSeasonId,
                playerName: dbSlot.playerName ?? undefined,
                playerLastName: dbSlot.playerLastName ?? undefined,
                playerRating: dbSlot.playerRating ?? undefined,
                playerPosition: dbSlot.playerPosition ?? undefined,
                playerOtherPositions: dbSlot.playerOtherPositions
                  ? dbSlot.playerOtherPositions.split(',').map((p: string) => p.trim())
                  : undefined,
                playerNationality: dbSlot.playerNationality ?? undefined,
                category,
                isCompatible: dbSlot.isCompatible ?? true,
              };
            }

            return {
              position: slot.position,
              positionLabel: slot.label,
              category,
              isCompatible: true,
            };
          });

          const difficultyConfig = DIFFICULTY_CONFIG[config.difficulty];

          set({
            runId: data.id,
            slots,
            rerollsLeft: difficultyConfig.rerolls,
            rerollsUsed: 0,
            currentSpin: null,
            selectedPlayer: null,
            movingPlayerSlotIndex: null,
            lastAssignedSlotIndex: null,
            justAssignedSlotIndex: null,
            seasonResult: null,
            currentManager: null,
            screen: 'draft',
            lastConfig: { ...config },
            lastDraftError: null,
            lastDraftState: null,
            draftVersion: 0,
            newAchievements: [],
          });
        } catch (error) {
          console.error('Failed to start run:', error);
        }
      },

      // -------------------------------------------------------------------
      // spin — Step 1: User clicks "Spin the Wheel"
      // -------------------------------------------------------------------
      spin: async () => {
        const { runId, isSpinning } = get();
        if (!runId || isSpinning) return;

        // Clear previous selection and spin state before spinning
        set({ isSpinning: true, selectedPlayer: null, currentSpin: null, lastAssignedSlotIndex: null, justAssignedSlotIndex: null, lastDraftError: null });

        try {
          const res = await fetch(`/api/runs/${runId}/spin`, { method: 'POST' });
          if (!res.ok) {
            console.error('Failed to spin:', await res.json());
            set({ isSpinning: false });
            return;
          }

          const data: SpinResult = await res.json();
          // Step 2: Result arrives — Club × Season is set, player list will show
          set({ currentSpin: data, isSpinning: false });
        } catch (error) {
          console.error('Failed to spin:', error);
          set({ isSpinning: false });
        }
      },

      // -------------------------------------------------------------------
      // reroll — Re-spin with a different club/season
      // -------------------------------------------------------------------
      reroll: async () => {
        const { runId, rerollsLeft } = get();
        if (!runId || rerollsLeft <= 0) return;

        // Clear previous selection before rerolling
        set({ isSpinning: true, selectedPlayer: null, currentSpin: null });

        try {
          const res = await fetch(`/api/runs/${runId}/reroll`, { method: 'POST' });
          if (!res.ok) {
            console.error('Failed to reroll:', await res.json());
            set({ isSpinning: false });
            return;
          }

          const data = await res.json();
          const spinResult: SpinResult = {
            clubSeasonId: data.clubSeasonId,
            clubName: data.clubName,
            seasonLabel: data.seasonLabel,
            players: data.players,
          };

          set((state) => ({
            currentSpin: spinResult,
            isSpinning: false,
            rerollsLeft: state.rerollsLeft - 1,
            rerollsUsed: data.rerollsUsed ?? state.rerollsUsed + 1,
          }));
        } catch (error) {
          console.error('Failed to reroll:', error);
          set({ isSpinning: false });
        }
      },

      // -------------------------------------------------------------------
      // selectPlayer — Step 3: User clicks a player from the list
      //
      // This ONLY sets selectedPlayer. It does NOT auto-assign.
      // The user must then click a position on the pitch (Step 5).
      // -------------------------------------------------------------------
      selectPlayer: (player) => {
        // Simply set the selected player — nothing else.
        // The FormationView will highlight available positions for this player.
        set({ selectedPlayer: player });
      },

      deselectPlayer: () => {
        // Clear the selected player — user cancelled position selection.
        set({ selectedPlayer: null });
      },

      // -------------------------------------------------------------------
      // assignToSlot — Step 5: User clicks a position on the football field
      //
      // This assigns the currently selectedPlayer to the given slot index.
      // After assignment:
      //   - selectedPlayer is cleared
      //   - currentSpin is cleared (user can spin again immediately)
      //   - justAssignedSlotIndex is set for highlight animation
      //   - screen stays 'draft' unless all 11 positions are filled
      // -------------------------------------------------------------------
      assignToSlot: async (slotIndex) => {
        const { runId, slots, selectedPlayer, currentSpin, draftVersion } = get();
        if (!runId || !selectedPlayer) return;

        const slot = slots[slotIndex];
        if (!slot) return;

        // Validate that the selected player can fill this slot position — STRICT matching
        const canFill = canFillSlotStrict(
          selectedPlayer.mainPosition as Position,
          selectedPlayer.otherPositions as Position[],
          slot.position as Position,
        );
        if (!canFill) return;

        const slotPosition = `${slot.position}_${slotIndex}`;

        // Deep-copy slots for undo — no shared references
        const prevSlots = slots.map(s => ({ ...s }));

        // Save undo state BEFORE assignment — includes selectedPlayer so undo
        // can restore the player selection and let user click a different position
        const undoState: LastDraftState = {
          slots: prevSlots,
          currentSpin: currentSpin ? { ...currentSpin, players: [...currentSpin.players] } : null,
          selectedPlayer: { ...selectedPlayer },
          screen: 'draft',
        };

        // Increment version so stale error reverts are rejected
        const thisVersion = draftVersion + 1;

        // ──── OFFLINE-FIRST: Optimistic update is the source of truth ────
        // The game continues to work even if the API is down.
        // API persistence is best-effort; failure does NOT revert the UI.
        const newSlots = slots.map(s => ({ ...s }));
        newSlots[slotIndex] = {
          ...slot,
          playerId: selectedPlayer.playerSeasonId,
          playerName: selectedPlayer.fullName,
          playerLastName: selectedPlayer.lastName,
          playerRating: selectedPlayer.rating,
          playerPosition: selectedPlayer.mainPosition,
          playerOtherPositions: selectedPlayer.otherPositions,
          playerNationality: selectedPlayer.nationality,
          isCompatible: true, // Strict matching — always full compatibility
        };

        // Step 6: After assignment — clear selectedPlayer and currentSpin so
        // user can spin again immediately. Screen stays 'draft' unless complete.
        const allFilled = newSlots.every((s) => s.playerId);

        set({
          slots: newSlots,
          selectedPlayer: null,
          currentSpin: null,
          draftVersion: thisVersion,
          lastAssignedSlotIndex: slotIndex,
          justAssignedSlotIndex: slotIndex,
          screen: allFilled ? 'squad-complete' : 'draft',
          lastDraftState: allFilled ? null : undoState,
          lastDraftError: null,
        });

        // Auto-clear the highlight after 2 seconds
        setTimeout(() => {
          if (get().justAssignedSlotIndex === slotIndex) {
            set({ justAssignedSlotIndex: null });
          }
        }, 2000);

        // Step 7: Fire API in background to persist the draft pick.
        // OFFLINE-FIRST: If API fails, we retry once, then log a warning.
        // We do NOT revert the optimistic update — the game continues.
        const draftPayload = {
          playerSeasonId: selectedPlayer.playerSeasonId,
          slotPosition,
        };

        const tryDraft = async (attempt: number): Promise<boolean> => {
          try {
            const res = await fetch(`/api/runs/${runId}/draft`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(draftPayload),
            });
            if (res.ok) return true;

            const errData = await res.json().catch(() => ({}));
            const errStatus = res.status;

            // 400 = business rule violation (slot filled, player already drafted, etc.)
            // These are permanent — retrying won't help
            if (errStatus === 400) {
              console.warn('[assignToSlot] Business rule violation (permanent):', errData);
              return true; // Treat as success — local state is already correct
            }

            // 404 = run not found — may need a new run, retry once
            console.warn(`[assignToSlot] API error (attempt ${attempt}):`, errData);
            return false;
          } catch (error) {
            console.warn(`[assignToSlot] Network error (attempt ${attempt}):`, error);
            return false;
          }
        };

        // First attempt
        const firstAttempt = await tryDraft(1);
        if (firstAttempt) return; // Success!

        // Retry after 1 second
        await new Promise(r => setTimeout(r, 1000));
        const secondAttempt = await tryDraft(2);
        if (secondAttempt) return; // Success on retry!

        // Both attempts failed — log but do NOT revert the UI
        console.error('[assignToSlot] Both API attempts failed. Game continues with local state.');
        set({ lastDraftError: 'Не удалось сохранить на сервер, но игра продолжается' });
      },

      // -------------------------------------------------------------------
      // directAssign — Assign a player directly to a slot without going
      // through the selectPlayer → assignToSlot flow.
      //
      // NOTE: This should NOT be called automatically from PlayerList.
      // It exists for programmatic use cases (e.g., auto-fill, testing).
      // -------------------------------------------------------------------
      directAssign: async (player, slotIndex) => {
        const { runId, slots, currentSpin, draftVersion } = get();
        if (!runId) return;

        const slot = slots[slotIndex];
        if (!slot) {
          console.warn('[directAssign] Slot not found at index:', slotIndex);
          return;
        }

        const canFill = canFillSlotStrict(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          slot.position as Position,
        );
        if (!canFill) {
          console.warn('[directAssign] Player cannot fill slot:', player.fullName, '→', slot.position);
          return;
        }

        const slotPosition = `${slot.position}_${slotIndex}`;

        // Deep-copy slots for undo — no shared references
        const prevSlots = slots.map(s => ({ ...s }));

        // Save state for undo — no selectedPlayer in direct assign flow
        const undoState: LastDraftState = {
          slots: prevSlots,
          currentSpin: currentSpin ? { ...currentSpin, players: [...currentSpin.players] } : null,
          selectedPlayer: null,
          screen: 'draft',
        };

        // Increment version so stale error reverts are rejected
        const thisVersion = draftVersion + 1;

        // ──── OFFLINE-FIRST: Optimistic update is the source of truth ────
        const newSlots = slots.map(s => ({ ...s }));
        newSlots[slotIndex] = {
          ...slot,
          playerId: player.playerSeasonId,
          playerName: player.fullName,
          playerLastName: player.lastName,
          playerRating: player.rating,
          playerPosition: player.mainPosition,
          playerOtherPositions: player.otherPositions,
          playerNationality: player.nationality,
          isCompatible: true, // Strict matching — always full compatibility
        };

        const allFilled = newSlots.every((s) => s.playerId);

        set({
          slots: newSlots,
          selectedPlayer: null,
          currentSpin: null,
          draftVersion: thisVersion,
          lastAssignedSlotIndex: slotIndex,
          justAssignedSlotIndex: slotIndex,
          screen: allFilled ? 'squad-complete' : 'draft',
          lastDraftState: allFilled ? null : undoState,
          lastDraftError: null,
        });

        // Auto-clear the highlight after 2 seconds
        setTimeout(() => {
          if (get().justAssignedSlotIndex === slotIndex) {
            set({ justAssignedSlotIndex: null });
          }
        }, 2000);

        // OFFLINE-FIRST: API persistence is best-effort. No revert on failure.
        const draftPayload = {
          playerSeasonId: player.playerSeasonId,
          slotPosition,
        };

        const tryDraft = async (attempt: number): Promise<boolean> => {
          try {
            const res = await fetch(`/api/runs/${runId}/draft`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(draftPayload),
            });
            if (res.ok) return true;

            const errData = await res.json().catch(() => ({}));
            const errStatus = res.status;

            if (errStatus === 400) {
              console.warn('[directAssign] Business rule violation (permanent):', errData);
              return true;
            }

            console.warn(`[directAssign] API error (attempt ${attempt}):`, errData);
            return false;
          } catch (error) {
            console.warn(`[directAssign] Network error (attempt ${attempt}):`, error);
            return false;
          }
        };

        // First attempt
        const firstAttempt = await tryDraft(1);
        if (firstAttempt) return;

        // Retry after 1 second
        await new Promise(r => setTimeout(r, 1000));
        const secondAttempt = await tryDraft(2);
        if (secondAttempt) return;

        // Both attempts failed — log but do NOT revert
        console.error('[directAssign] Both API attempts failed. Game continues with local state.');
        set({ lastDraftError: 'Не удалось сохранить на сервер, но игра продолжается' });
      },

      // -------------------------------------------------------------------
      // movePlayer — Reposition already-drafted players between slots
      // -------------------------------------------------------------------
      movePlayer: (fromSlotIndex, toSlotIndex) => {
        const { slots, runId } = get();
        const from = slots[fromSlotIndex];
        const to = slots[toSlotIndex];

        if (!from?.playerId || !to) return;

        // STRICT matching: both players must be able to play in each other's position
        const toCanFillFrom = to.playerPosition
          ? canFillSlotStrict(
              to.playerPosition as Position,
              (to.playerOtherPositions ?? []) as Position[],
              from.position as Position,
            )
          : false;

        const fromCanFillTo = from.playerPosition
          ? canFillSlotStrict(
              from.playerPosition as Position,
              (from.playerOtherPositions ?? []) as Position[],
              to.position as Position,
            )
          : false;

        // If to-slot is empty, only the moving player needs to fit
        // If to-slot is filled (swap), BOTH players need to fit their new positions
        if (to.playerId) {
          if (!toCanFillFrom || !fromCanFillTo) return;
        } else {
          if (!fromCanFillTo) return;
        }

        const newSlots = [...slots];

        if (to.playerId) {
          // Swap both players
          newSlots[fromSlotIndex] = {
            ...from,
            playerId: to.playerId,
            playerName: to.playerName,
            playerLastName: to.playerLastName,
            playerRating: to.playerRating,
            playerPosition: to.playerPosition,
            playerOtherPositions: to.playerOtherPositions,
            playerNationality: to.playerNationality,
            isCompatible: true,
          };
          newSlots[toSlotIndex] = {
            ...to,
            playerId: from.playerId,
            playerName: from.playerName,
            playerLastName: from.playerLastName,
            playerRating: from.playerRating,
            playerPosition: from.playerPosition,
            playerOtherPositions: from.playerOtherPositions,
            playerNationality: from.playerNationality,
            isCompatible: true,
          };
        } else {
          // Move to empty slot
          newSlots[toSlotIndex] = {
            ...to,
            playerId: from.playerId,
            playerName: from.playerName,
            playerLastName: from.playerLastName,
            playerRating: from.playerRating,
            playerPosition: from.playerPosition,
            playerOtherPositions: from.playerOtherPositions,
            playerNationality: from.playerNationality,
            isCompatible: true,
          };
          newSlots[fromSlotIndex] = {
            ...from,
            playerId: undefined,
            playerName: undefined,
            playerLastName: undefined,
            playerRating: undefined,
            playerPosition: undefined,
            playerOtherPositions: undefined,
            playerNationality: undefined,
            isCompatible: true,
          };
        }

        set({ slots: newSlots, movingPlayerSlotIndex: null });

        // Persist swap to database
        if (runId) {
          const fromSlotPosition = `${from.position}_${fromSlotIndex}`;
          const toSlotPosition = `${to.position}_${toSlotIndex}`;
          fetch(`/api/runs/${runId}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromSlotPosition, toSlotPosition }),
          }).catch((err) => {
            console.error('Failed to persist swap:', err);
          });
        }
      },

      finishMoving: () => {
        set({ movingPlayerSlotIndex: null });
      },

      // -------------------------------------------------------------------
      // spinManager — Pick a random manager with animation
      // -------------------------------------------------------------------
      spinManager: async (manager?: Manager) => {
        // Pick the manager immediately so the UI can render reel targets
        // while the spin animation plays out.
        const m = manager ?? MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
        set({ isSpinningManager: true, currentManager: m });
        // Simulate spinning delay (reels animate during this window)
        await new Promise((resolve) => setTimeout(resolve, 1500));
        set({ isSpinningManager: false });
      },

      // -------------------------------------------------------------------
      // simulate — Run the season simulation
      // -------------------------------------------------------------------
      simulate: async (manager?: Manager | null) => {
        const { runId } = get();
        if (!runId) return;

        set({ screen: 'simulation' });

        try {
          const res = await fetch(`/api/runs/${runId}/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              managerName: manager?.name ?? null,
              managerRating: manager?.rating ?? null,
            }),
          });

          if (!res.ok) {
            console.error('Failed to simulate:', await res.json());
            set({ screen: 'squad-complete' });
            return;
          }

          const data = await res.json();
          // Update profile stats
          get().updateProfileStats(data);
          set({ seasonResult: data, screen: 'result' });

          // Sync to cloud after simulation
          get().syncProfileToCloud();
        } catch (error) {
          console.error('Failed to simulate:', error);
          set({ screen: 'squad-complete' });
        }
      },

      // -------------------------------------------------------------------
      // updateProfileStats — Update persistent profile stats after simulation
      // -------------------------------------------------------------------
      updateProfileStats: (result) => {
        const r = result as {
          wins: number;
          draws: number;
          losses: number;
          points: number;
          position: number;
          goalsFor: number;
          goalsAgainst: number;
          formation: string;
          difficulty: string;
          managerName?: string | null;
          runId: string;
          squadRating?: number;
          matches?: Array<{ matchday: number; isHome: boolean; result: 'W' | 'D' | 'L' }>;
        };

        const { config } = get();

        set((state) => {
          const stats = { ...state.profileStats };
          const prevAchievements = [...stats.achievements];
          stats.totalSeasons += 1;
          stats.totalWins += r.wins;
          stats.totalGoals += r.goalsFor;

          if (r.points > stats.bestPoints) {
            stats.bestPoints = r.points;
            stats.bestRecord = `${r.wins}-${r.draws}-${r.losses}`;
          }

          if (r.position === 1) {
            stats.titles += 1;
          }

          if (r.wins === 30 && r.draws === 0 && r.losses === 0) {
            stats.perfect += 1;
          }

          // Track formation usage
          const formationCounts: Record<string, number> = {};
          const allHistory = [...stats.history, {
            id: r.runId,
            date: new Date().toISOString(),
            formation: r.formation,
            difficulty: r.difficulty,
            wins: r.wins,
            draws: r.draws,
            losses: r.losses,
            points: r.points,
            position: r.position,
            managerName: r.managerName,
            teamName: config.teamName || null,
          }];
          for (const h of allHistory) {
            formationCounts[h.formation] = (formationCounts[h.formation] || 0) + 1;
          }
          stats.favoriteFormation = Object.entries(formationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || stats.favoriteFormation;

          // Add achievements
          const newAchievementIds = [...stats.achievements];
          const addAch = (id: string) => {
            if (!newAchievementIds.includes(id)) newAchievementIds.push(id);
          };
          if (r.position === 1) addAch('champion');
          if (r.wins === 30 && r.draws === 0 && r.losses === 0) addAch('perfect');
          if (r.goalsFor >= 60) addAch('goal_machine');
          if (r.goalsFor - r.goalsAgainst > 50) addAch('iron_defense');

          // Win streak: 5+ wins in a row
          const matches = r.matches || [];
          let maxStreak = 0;
          let currentStreak = 0;
          for (const m of matches) {
            if (m.result === 'W') {
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          }
          if (maxStreak >= 5) addAch('win_streak');

          // Sniper: 2+ goals per match average
          if (r.goalsFor / 30 >= 2) addAch('sniper');

          // Fortress: 0 home losses
          const homeLosses = matches.filter((m) => m.isHome && m.result === 'L').length;
          if (homeLosses === 0 && matches.length > 0) addAch('fortress');

          // Elite: squad rating 80+
          if (r.squadRating && r.squadRating >= 80) addAch('elite');

          stats.achievements = newAchievementIds;
          stats.history = allHistory.slice(-50); // Keep last 50

          // Identify newly earned achievements
          const earned = newAchievementIds.filter((id) => !prevAchievements.includes(id));
          const newAchievements = ALL_ACHIEVEMENTS.filter((a) => earned.includes(a.id));

          return { profileStats: stats, newAchievements };
        });
      },

      // -------------------------------------------------------------------
      // undoLastPick — Undo the last draft assignment
      // -------------------------------------------------------------------
      undoLastPick: async () => {
        const { runId, lastDraftState } = get();
        if (!runId || !lastDraftState) return;

        try {
          const res = await fetch(`/api/runs/${runId}/undo`, { method: 'POST' });
          if (!res.ok) {
            console.error('Failed to undo pick:', await res.json());
            return;
          }

          // Restore the previous state — this brings back currentSpin and
          // selectedPlayer so the user can choose a different position or player
          set({
            slots: lastDraftState.slots,
            currentSpin: lastDraftState.currentSpin,
            selectedPlayer: lastDraftState.selectedPlayer,
            screen: lastDraftState.screen,
            lastDraftState: null,
            lastAssignedSlotIndex: null,
            justAssignedSlotIndex: null,
          });
        } catch (error) {
          console.error('Failed to undo pick:', error);
        }
      },

      // -------------------------------------------------------------------
      // skipSpin — Discard the current spin when no players can fill any
      // remaining position. Clears the spin result so the user can spin again.
      // -------------------------------------------------------------------
      skipSpin: () => {
        set({ currentSpin: null, selectedPlayer: null, lastDraftError: null });
      },

      dismissAchievement: () => {
        set((state) => ({
          newAchievements: state.newAchievements.slice(1),
        }));
      },

      resetGame: () => {
        set({
          screen: 'home',
          runId: null,
          slots: [],
          rerollsLeft: 0,
          rerollsUsed: 0,
          currentSpin: null,
          isSpinning: false,
          selectedPlayer: null,
          movingPlayerSlotIndex: null,
          lastAssignedSlotIndex: null,
          justAssignedSlotIndex: null,
          seasonResult: null,
          currentManager: null,
          isSpinningManager: false,
          lastDraftError: null,
          lastDraftState: null,
          draftVersion: 0,
          newAchievements: [],
        });
      },

      goHome: () => {
        set({ screen: 'home' });
      },

      resumeGame: () => {
        const { slots, seasonResult } = get();
        const allFilled = slots.length > 0 && slots.every((s) => s.playerId);

        // Always clear ALL stale transient UI state on resume
        const clearTransient = {
          selectedPlayer: null,
          currentSpin: null,
          isSpinning: false,
          movingPlayerSlotIndex: null,
          lastAssignedSlotIndex: null,
          justAssignedSlotIndex: null,
          isSpinningManager: false,
          lastDraftError: null,
        };

        if (seasonResult) {
          set({ screen: 'result', ...clearTransient });
        } else if (allFilled) {
          set({ screen: 'squad-complete', ...clearTransient });
        } else {
          // Go to draft screen — clear ALL stale transient UI state
          set({ screen: 'draft', ...clearTransient });
        }
      },

      loadLeaderboard: async () => {
        try {
          const res = await fetch('/api/leaderboard');
          if (!res.ok) return;
          const data = await res.json();
          const entries: LeaderboardEntry[] = data.map((entry: Record<string, unknown>) => ({
            id: entry.id as string,
            playerName: 'Игрок',
            formation: entry.formation as string,
            difficulty: (entry.difficulty as keyof typeof DIFFICULTY_CONFIG) ?? 'normal',
            squadRating: (entry.overallRating as number) ?? 0,
            seasonPoints: (entry.points as number) ?? 0,
            seasonPosition: (entry.position as number) ?? 16,
            createdAt: (entry.createdAt as string) ?? new Date().toISOString(),
          }));
          set({ leaderboard: entries, screen: 'leaderboard' });
        } catch (error) {
          console.error('Failed to load leaderboard:', error);
        }
      },

      // Cloud sync — save profile to database
      syncProfileToCloud: async () => {
        const { telegramUser, profileStats } = get();
        if (!telegramUser) return; // Only sync if logged in via Telegram

        try {
          await fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId: telegramUser.id,
              username: telegramUser.username,
              firstName: telegramUser.first_name,
              lastName: telegramUser.last_name,
              photoUrl: telegramUser.photo_url,
              profileStats,
            }),
          });
        } catch (error) {
          console.error('Failed to sync profile to cloud:', error);
        }
      },

      // Load profile from cloud
      loadProfileFromCloud: async () => {
        const { telegramUser } = get();
        if (!telegramUser) return;

        try {
          const res = await fetch(`/api/users/profile?telegramId=${telegramUser.id}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.profileStats) {
            set({ profileStats: data.profileStats });
          }
        } catch (error) {
          console.error('Failed to load profile from cloud:', error);
        }
      },
    }),
    {
      name: '30-0-rpl-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist profileStats, lastConfig, and game state for resuming drafts.
      // NOTE: selectedPlayer, currentSpin, isSpinning, and movingPlayerSlotIndex are
      // transient UI states that must NOT be persisted — they are cleared on resume.
      // Screen is persisted but only for stable screens (home, draft, squad-complete, result).
      partialize: (state) => {
        // Only persist stable screen values, not transient ones like 'position-assign' or 'simulation'
        const stableScreens: GameScreen[] = ['home', 'draft', 'squad-complete', 'result', 'profile', 'leaderboard'];
        const persistedScreen = stableScreens.includes(state.screen) ? state.screen : 'home';

        return {
          profileStats: state.profileStats,
          lastConfig: state.lastConfig,
          runId: state.runId,
          slots: state.slots,
          rerollsLeft: state.rerollsLeft,
          rerollsUsed: state.rerollsUsed,
          currentManager: state.currentManager,
          config: state.config,
          seasonResult: state.seasonResult,
          telegramUser: state.telegramUser,
          screen: persistedScreen,
        };
      },
    },
  ),
);
