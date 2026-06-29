import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameScreen, GameConfig, DraftSlot, SpinResult, PlayerOption, LeaderboardEntry } from '@/lib/types';
import { FORMATIONS, POSITION_CATEGORY, canFillSlot } from '@/lib/positions';
import type { Position } from '@/lib/positions';
import { DIFFICULTY_CONFIG } from '@/lib/types';
import { MANAGERS } from '@/lib/managers';
import type { Manager } from '@/lib/managers';

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
  }>;
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

  // Manager
  currentManager: Manager | null;
  isSpinningManager: boolean;

  // Result
  seasonResult: Record<string, unknown> | null;

  // Profile stats (persisted)
  profileStats: ProfileStats;

  // Leaderboard
  leaderboard: LeaderboardEntry[];

  // Actions
  startRun: () => Promise<void>;
  spin: () => Promise<void>;
  reroll: () => Promise<void>;
  selectPlayer: (player: PlayerOption) => void;
  assignToSlot: (slotIndex: number) => Promise<void>;
  movePlayer: (fromSlotIndex: number, toSlotIndex: number) => void;
  finishMoving: () => void;
  spinManager: () => Promise<void>;
  simulate: (manager?: Manager | null) => Promise<void>;
  resetGame: () => void;
  loadLeaderboard: () => Promise<void>;
  updateProfileStats: (result: Record<string, unknown>) => void;
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

      // Manager
      currentManager: null,
      isSpinningManager: false,

      // Result
      seasonResult: null,

      // Profile (persisted)
      profileStats: defaultProfileStats,

      // Leaderboard
      leaderboard: [],

      // Actions
      startRun: async () => {
        const { config } = get();
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
        const { config } = get();
        set({ selectedPlayer: player });
        if (config.draftMode === 'squad_first') {
          set({ screen: 'position-assign' });
        }
      },

      assignToSlot: async (slotIndex) => {
        const { runId, slots, selectedPlayer } = get();
        if (!runId || !selectedPlayer) return;

        const slot = slots[slotIndex];
        if (!slot) return;

        const { canFill } = canFillSlot(
          selectedPlayer.mainPosition as Position,
          selectedPlayer.otherPositions as Position[],
          slot.position as Position,
        );
        if (!canFill) return;

        const slotPosition = `${slot.position}_${slotIndex}`;

        try {
          const res = await fetch(`/api/runs/${runId}/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerSeasonId: selectedPlayer.playerSeasonId,
              slotPosition,
            }),
          });

          if (!res.ok) {
            console.error('Failed to draft player:', await res.json());
            return;
          }

          const newSlots = [...slots];
          newSlots[slotIndex] = {
            ...slot,
            playerId: selectedPlayer.playerSeasonId,
            playerName: selectedPlayer.fullName,
            playerRating: selectedPlayer.rating,
            playerPosition: selectedPlayer.mainPosition,
            playerOtherPositions: selectedPlayer.otherPositions,
            isCompatible: true,
          };

          const allFilled = newSlots.every((s) => s.playerId);

          set({
            slots: newSlots,
            selectedPlayer: null,
            currentSpin: null,
            screen: allFilled ? 'squad-complete' : 'draft',
          });
        } catch (error) {
          console.error('Failed to draft player:', error);
        }
      },

      movePlayer: (fromSlotIndex, toSlotIndex) => {
        const { slots } = get();
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
          playerRating: to.playerRating,
          playerPosition: to.playerPosition,
          playerOtherPositions: to.playerOtherPositions,
          isCompatible: toCanFillFrom.canFill,
        };
        newSlots[toSlotIndex] = {
          ...to,
          playerId: from.playerId,
          playerName: from.playerName,
          playerRating: from.playerRating,
          playerPosition: from.playerPosition,
          playerOtherPositions: from.playerOtherPositions,
          isCompatible: fromCanFillTo.canFill,
        };

        set({ slots: newSlots, movingPlayerSlotIndex: null });
      },

      finishMoving: () => {
        set({ movingPlayerSlotIndex: null });
      },

      spinManager: async () => {
        set({ isSpinningManager: true });
        // Simulate spinning delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const manager = MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
        set({ currentManager: manager, isSpinningManager: false });
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
          formation: string;
          difficulty: string;
          managerName?: string | null;
          runId: string;
        };

        set((state) => {
          const stats = { ...state.profileStats };
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
          }];
          for (const h of allHistory) {
            formationCounts[h.formation] = (formationCounts[h.formation] || 0) + 1;
          }
          stats.favoriteFormation = Object.entries(formationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || stats.favoriteFormation;

          // Add achievements
          const newAchievements = [...stats.achievements];
          const addAch = (id: string) => {
            if (!newAchievements.includes(id)) newAchievements.push(id);
          };
          if (r.position === 1) addAch('champion');
          if (r.wins === 30) addAch('perfect');
          if (r.goalsFor >= 60) addAch('goal_machine');
          if (r.goalsFor - (r as { goalsAgainst?: number }).goalsAgainst! > 50) addAch('iron_defense');

          stats.achievements = newAchievements;
          stats.history = allHistory.slice(-50); // Keep last 50

          return { profileStats: stats };
        });
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
        });
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
      // Only persist profileStats
      partialize: (state) => ({ profileStats: state.profileStats }),
    },
  ),
);
