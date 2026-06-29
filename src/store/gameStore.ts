import { create } from 'zustand';
import type { GameScreen, GameConfig, DraftSlot, SpinResult, PlayerOption, LeaderboardEntry } from '@/lib/types';
import { FORMATIONS, POSITION_CATEGORY, canFillSlot } from '@/lib/positions';
import type { Position } from '@/lib/positions';
import { DIFFICULTY_CONFIG } from '@/lib/types';

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

  // Result
  seasonResult: Record<string, unknown> | null;

  // Profile stats
  profileStats: { totalSeasons: number; bestPoints: number; titles: number; perfect: number };

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
  simulate: (managerRating?: number) => Promise<void>;
  resetGame: () => void;
  loadLeaderboard: () => Promise<void>;
}

const defaultConfig: GameConfig = {
  formation: '4-3-3',
  difficulty: 'normal',
  draftMode: 'squad_first',
  ratingMode: 'season',
  eraFilter: 'all',
};

export const useGameStore = create<GameState>((set, get) => ({
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

  // Result
  seasonResult: null,

  // Profile
  profileStats: { totalSeasons: 0, bestPoints: 0, titles: 0, perfect: 0 },

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
        const err = await res.json();
        console.error('Failed to start run:', err);
        return;
      }

      const data = await res.json();

      // Build slots from formation
      const formation = FORMATIONS.find((f) => f.id === config.formation);
      if (!formation) return;

      const slots: DraftSlot[] = formation.slots.map((slot, index) => {
        const category = POSITION_CATEGORY[slot.position];
        const dbSlot = data.slots?.find(
          (s: { slotPosition: string }) => s.slotPosition === `${slot.position}_${index}`
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
        const err = await res.json();
        console.error('Failed to spin:', err);
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
        const err = await res.json();
        console.error('Failed to reroll:', err);
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

    // Check position compatibility
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
        const err = await res.json();
        console.error('Failed to draft player:', err);
        return;
      }

      // Update the slot locally
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

      // Check if all 11 slots are filled
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
      isCompatible: toCanFillFrom.canFill,
    };
    newSlots[toSlotIndex] = {
      ...to,
      isCompatible: fromCanFillTo.canFill,
    };

    set({ slots: newSlots, movingPlayerSlotIndex: null });
  },

  finishMoving: () => {
    set({ movingPlayerSlotIndex: null });
  },

  simulate: async (managerRating?: number) => {
    const { runId } = get();
    if (!runId) return;

    set({ screen: 'simulation' });

    try {
      const res = await fetch(`/api/runs/${runId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerRating: managerRating ?? null }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Failed to simulate:', err);
        return;
      }

      const data = await res.json();
      set({ seasonResult: data, screen: 'result' });
    } catch (error) {
      console.error('Failed to simulate:', error);
    }
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
}));
