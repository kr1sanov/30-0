import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameScreen, GameConfig, DraftSlot, SpinResult, PlayerOption, LeaderboardEntry, Achievement } from '@/lib/types';
import { FORMATIONS, POSITION_CATEGORY, canFillSlot } from '@/lib/positions';
import type { Position } from '@/lib/positions';
import { DIFFICULTY_CONFIG } from '@/lib/types';
import { MANAGERS } from '@/lib/managers';
import type { Manager } from '@/lib/managers';

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
  dismissAchievement: () => void;
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

      // Draft undo
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

      // Actions
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
            seasonResult: null,
            currentManager: null,
            screen: 'draft',
            lastConfig: { ...config },
            lastDraftState: null,
            draftVersion: 0,
            newAchievements: [],
          });
        } catch (error) {
          console.error('Failed to start run:', error);
        }
      },

      spin: async () => {
        const { runId, isSpinning } = get();
        if (!runId || isSpinning) return;

        set({ isSpinning: true, selectedPlayer: null });

        try {
          const res = await fetch(`/api/runs/${runId}/spin`, { method: 'POST' });
          if (!res.ok) {
            console.error('Failed to spin:', await res.json());
            set({ isSpinning: false });
            return;
          }

          const data: SpinResult = await res.json();
          set({ currentSpin: data, isSpinning: false });
        } catch (error) {
          console.error('Failed to spin:', error);
          set({ isSpinning: false });
        }
      },

      reroll: async () => {
        const { runId, rerollsLeft } = get();
        if (!runId || rerollsLeft <= 0) return;

        set({ isSpinning: true, selectedPlayer: null });

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

      selectPlayer: (player) => {
        const { slots, currentSpin } = get();

        // Save state before selection for undo — deep copy slots to prevent shared-reference corruption
        set({
          lastDraftState: {
            slots: slots.map(s => ({ ...s })),
            currentSpin: currentSpin ? { ...currentSpin, players: [...currentSpin.players] } : null,
            selectedPlayer: null,
            screen: 'draft',
          },
        });

        // Stay on draft screen — position assignment happens inline
        set({ selectedPlayer: player });
      },

      assignToSlot: async (slotIndex) => {
        const { runId, slots, selectedPlayer, currentSpin, draftVersion } = get();
        if (!runId || !selectedPlayer) return;

        const slot = slots[slotIndex];
        if (!slot) return;

        const { canFill, penalty } = canFillSlot(
          selectedPlayer.mainPosition as Position,
          selectedPlayer.otherPositions as Position[],
          slot.position as Position,
        );
        if (!canFill) return;

        const slotPosition = `${slot.position}_${slotIndex}`;

        // Save current spin for potential revert
        const savedSpin = currentSpin;

        // Deep-copy slots for error recovery to prevent shared-reference corruption
        const prevSlots = slots.map(s => ({ ...s }));

        // Increment version so stale error reverts are rejected
        const thisVersion = draftVersion + 1;

        // Optimistically update UI immediately
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
          isCompatible: penalty === 1,
        };

        const allFilled = newSlots.every((s) => s.playerId);

        set({
          slots: newSlots,
          selectedPlayer: null,
          currentSpin: null,
          draftVersion: thisVersion,
          screen: allFilled ? 'squad-complete' : 'draft',
          lastDraftState: allFilled ? null : {
            slots: prevSlots,
            currentSpin: savedSpin ? { ...savedSpin, players: [...savedSpin.players] } : null,
            selectedPlayer: null,
            screen: 'draft',
          },
        });

        // Fire API in background
        fetch(`/api/runs/${runId}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerSeasonId: selectedPlayer.playerSeasonId,
            slotPosition,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('Failed to draft player:', errData);
            // Revert on failure — but only if no other draft action has occurred since
            if (get().draftVersion === thisVersion) {
              set({ slots: prevSlots, selectedPlayer: null, currentSpin: savedSpin, screen: 'draft' });
            }
          }
        }).catch((error) => {
          console.error('Failed to draft player:', error);
          // Revert on failure — but only if no other draft action has occurred since
          if (get().draftVersion === thisVersion) {
            set({ slots: prevSlots, selectedPlayer: null, currentSpin: savedSpin, screen: 'draft' });
          }
        });
      },

      directAssign: async (player, slotIndex) => {
        const { runId, slots, currentSpin, draftVersion } = get();
        if (!runId) return;

        const slot = slots[slotIndex];
        if (!slot) return;

        const { canFill, penalty } = canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          slot.position as Position,
        );
        if (!canFill) return;

        const slotPosition = `${slot.position}_${slotIndex}`;

        // Save current spin for potential revert
        const savedSpin = currentSpin;

        // Deep-copy slots for error recovery to prevent shared-reference corruption
        const prevSlots = slots.map(s => ({ ...s }));

        // Increment version so stale error reverts are rejected
        const thisVersion = draftVersion + 1;

        // Optimistically update UI immediately — single atomic update, no intermediate selectedPlayer state
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
          isCompatible: penalty === 1,
        };

        const allFilled = newSlots.every((s) => s.playerId);

        set({
          slots: newSlots,
          selectedPlayer: null,
          currentSpin: null,
          draftVersion: thisVersion,
          screen: allFilled ? 'squad-complete' : 'draft',
          lastDraftState: allFilled ? null : {
            slots: prevSlots,
            currentSpin: savedSpin ? { ...savedSpin, players: [...savedSpin.players] } : null,
            selectedPlayer: null,
            screen: 'draft',
          },
        });

        // Fire API in background
        fetch(`/api/runs/${runId}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerSeasonId: player.playerSeasonId,
            slotPosition,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            console.error('Failed to draft player:', await res.json().catch(() => ({})));
            // Revert on failure — but only if no other draft action has occurred since
            if (get().draftVersion === thisVersion) {
              set({ slots: prevSlots, selectedPlayer: null, currentSpin: savedSpin, screen: 'draft' });
            }
          }
        }).catch((error) => {
          console.error('Failed to draft player:', error);
          // Revert on failure — but only if no other draft action has occurred since
          if (get().draftVersion === thisVersion) {
            set({ slots: prevSlots, selectedPlayer: null, currentSpin: savedSpin, screen: 'draft' });
          }
        });
      },

      movePlayer: (fromSlotIndex, toSlotIndex) => {
        const { slots, runId } = get();
        const from = slots[fromSlotIndex];
        const to = slots[toSlotIndex];

        if (!from?.playerId || !to) return;

        const toCanFillFrom = to.playerPosition
          ? canFillSlot(
              to.playerPosition as Position,
              (to.playerOtherPositions ?? []) as Position[],
              from.position as Position,
            )
          : { canFill: false };

        const fromCanFillTo = from.playerPosition
          ? canFillSlot(
              from.playerPosition as Position,
              (from.playerOtherPositions ?? []) as Position[],
              to.position as Position,
            )
          : { canFill: false };

        const newSlots = [...slots];

        newSlots[fromSlotIndex] = {
          ...from,
          playerId: to.playerId,
          playerName: to.playerName,
          playerLastName: to.playerLastName,
          playerRating: to.playerRating,
          playerPosition: to.playerPosition,
          playerOtherPositions: to.playerOtherPositions,
          playerNationality: to.playerNationality,
          isCompatible: toCanFillFrom.canFill,
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
          isCompatible: fromCanFillTo.canFill,
        };

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

      spinManager: async (manager?: Manager) => {
        // Pick the manager immediately so the UI can render reel targets
        // while the spin animation plays out.
        const m = manager ?? MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
        set({ isSpinningManager: true, currentManager: m });
        // Simulate spinning delay (reels animate during this window)
        await new Promise((resolve) => setTimeout(resolve, 1500));
        set({ isSpinningManager: false });
      },

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
        } catch (error) {
          console.error('Failed to simulate:', error);
          set({ screen: 'squad-complete' });
        }
      },

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

      undoLastPick: async () => {
        const { runId, lastDraftState } = get();
        if (!runId || !lastDraftState) return;

        try {
          const res = await fetch(`/api/runs/${runId}/undo`, { method: 'POST' });
          if (!res.ok) {
            console.error('Failed to undo pick:', await res.json());
            return;
          }

          // Restore the previous state
          set({
            slots: lastDraftState.slots,
            currentSpin: lastDraftState.currentSpin,
            selectedPlayer: lastDraftState.selectedPlayer,
            screen: lastDraftState.screen,
            lastDraftState: null,
          });
        } catch (error) {
          console.error('Failed to undo pick:', error);
        }
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
          seasonResult: null,
          currentManager: null,
          isSpinningManager: false,
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

        if (seasonResult) {
          set({ screen: 'result' });
        } else if (allFilled) {
          set({ screen: 'squad-complete' });
        } else {
          // Always go to draft screen — clear ALL stale transient UI state
          set({ screen: 'draft', selectedPlayer: null, currentSpin: null, isSpinning: false, movingPlayerSlotIndex: null });
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
    }),
    {
      name: '30-0-rpl-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist profileStats, lastConfig, and game state for resuming drafts
      // NOTE: selectedPlayer and currentSpin are transient UI states that must NOT be persisted.
      // Persisting them causes a stuck state on page refresh where the prompt to assign a player
      // shows but there is no player list to choose from.
      partialize: (state) => ({
        profileStats: state.profileStats,
        lastConfig: state.lastConfig,
        runId: state.runId,
        slots: state.slots,
        rerollsLeft: state.rerollsLeft,
        rerollsUsed: state.rerollsUsed,
        currentManager: state.currentManager,
        config: state.config,
        seasonResult: state.seasonResult,
      }),
    },
  ),
);
