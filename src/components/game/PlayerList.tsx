'use client';

import { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY, POSITION_COLOR } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { canFillSlot } from '@/lib/positions';
import { motion } from 'framer-motion';
import type { PlayerOption } from '@/lib/types';

type SortMode = 'rating' | 'position' | 'compatibility';
type FilterCategory = 'all' | 'gk' | 'def' | 'mid' | 'att';

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: 'Все',
  gk: 'ВР',
  def: 'ЗЩ',
  mid: 'ПЗ',
  att: 'НП',
};

function getRatingColor(rating: number): string {
  if (rating >= 78) return '#22c55e';
  if (rating >= 73) return '#3b82f6';
  if (rating >= 68) return '#f97316';
  return '#ef4444';
}

function getRatingGradient(rating: number): string {
  if (rating >= 78) return 'linear-gradient(135deg, #22c55e, #16a34a)';
  if (rating >= 73) return 'linear-gradient(135deg, #3b82f6, #2563eb)';
  if (rating >= 68) return 'linear-gradient(135deg, #f97316, #ea580c)';
  return 'linear-gradient(135deg, #ef4444, #dc2626)';
}

function getCategoryColor(pos: string): string {
  const category = POSITION_CATEGORY[pos as Position] ?? 'mid' as PositionCategory;
  return POSITION_COLOR[category];
}

export default function PlayerList() {
  const { currentSpin, selectedPlayer, selectPlayer, slots, config } = useGameStore();
  const [sortMode, setSortMode] = useState<SortMode>('rating');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const openPositions = useMemo(() =>
    slots
      .filter((s) => !s.playerId)
      .map((s) => s.position),
    [slots]
  );

  const isHard = config.difficulty === 'hard';

  // Process players: add compatibility info
  const processedPlayers = useMemo(() => {
    if (!currentSpin) return [];
    return currentSpin.players.map((player) => {
      const canFillAny = openPositions.some((slotPos) =>
        canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          slotPos as Position,
        ).canFill
      );

      const bestCompatibility = openPositions.reduce<'none' | 'partial' | 'full'>((best, slotPos) => {
        const result = canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          slotPos as Position,
        );
        if (result.canFill && result.penalty === 1) return 'full';
        if (result.canFill && best !== 'full') return 'partial';
        return best;
      }, 'none' as 'none' | 'partial' | 'full');

      // Get best compatible position category
      const bestSlotCategory = openPositions.reduce<PositionCategory | null>((cat, slotPos) => {
        const result = canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          slotPos as Position,
        );
        if (result.canFill && cat === null) {
          return POSITION_CATEGORY[slotPos as Position] ?? 'mid';
        }
        return cat;
      }, null);

      return { ...player, canFillAny, bestCompatibility, bestSlotCategory };
    });
  }, [currentSpin, openPositions]);

  // Filter and sort
  const filteredPlayers = useMemo(() => {
    let filtered = processedPlayers;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.fullName.toLowerCase().includes(q));
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => {
        const playerCat = POSITION_CATEGORY[p.mainPosition as Position];
        if (filterCategory === playerCat) return true;
        // Also include if they can fill a slot in this category
        if (p.bestSlotCategory === filterCategory) return true;
        return false;
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortMode) {
        case 'rating':
          return b.rating - a.rating;
        case 'position': {
          const catOrder = { gk: 0, def: 1, mid: 2, att: 3 };
          const catA = catOrder[POSITION_CATEGORY[a.mainPosition as Position] ?? 'mid'];
          const catB = catOrder[POSITION_CATEGORY[b.mainPosition as Position] ?? 'mid'];
          if (catA !== catB) return catA - catB;
          return b.rating - a.rating;
        }
        case 'compatibility': {
          const compatOrder = { full: 0, partial: 1, none: 2 };
          const cA = compatOrder[a.bestCompatibility];
          const cB = compatOrder[b.bestCompatibility];
          if (cA !== cB) return cA - cB;
          return b.rating - a.rating;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [processedPlayers, searchQuery, filterCategory, sortMode]);

  if (!currentSpin) return null;

  return (
    <div className="space-y-3">
      {/* Header with club info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#e2e8f0]">
            Игроки <span className="text-[#94a3b8] font-normal">({currentSpin.players.length})</span>
          </h3>
          <p className="text-xs text-[#94a3b8]">
            {currentSpin.clubName} · {currentSpin.seasonLabel}
          </p>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск игрока..."
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#1a1a2e] border border-[#1a1a2e] text-sm text-[#e2e8f0] placeholder:text-[#94a3b8]/50 focus:border-[#22c55e]/40 focus:outline-none transition-colors"
        />
      </div>

      {/* Sort and Filter Controls */}
      <div className="space-y-2">
        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(Object.entries(CATEGORY_LABELS) as [FilterCategory, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === key
                  ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20'
                  : 'bg-[#1a1a2e] text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#94a3b8] mr-1">Сортировка:</span>
          {[
            { mode: 'rating' as SortMode, label: 'Рейтинг' },
            { mode: 'position' as SortMode, label: 'Позиция' },
            { mode: 'compatibility' as SortMode, label: 'Совместимость' },
          ].map((s) => (
            <button
              key={s.mode}
              onClick={() => setSortMode(s.mode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                sortMode === s.mode
                  ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instruction text */}
      <div className="flex items-center gap-2 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 p-3">
        <svg className="w-4 h-4 text-[#22c55e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        <p className="text-xs text-[#22c55e]">Выберите игрока, затем укажите позицию на поле</p>
      </div>

      {/* Player List */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-6 text-sm text-[#94a3b8]">
            <div className="text-2xl mb-2">🔍</div>
            Игроки не найдены
            {searchQuery && <div className="text-xs mt-1">Попробуйте другой запрос</div>}
          </div>
        ) : (
          filteredPlayers.map((player, idx) => {
            const isSelected = selectedPlayer?.playerSeasonId === player.playerSeasonId;
            // Determine position category for gradient border
            const posCategory = POSITION_CATEGORY[player.mainPosition as Position] ?? 'mid';
            const posBorderClass = `pos-border-${posCategory}`;
            return (
              <motion.button
                key={player.playerSeasonId}
                onClick={() => player.canFillAny && selectPlayer(player as PlayerOption)}
                disabled={!player.canFillAny}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left relative ${
                  isSelected
                    ? 'bg-[#22c55e]/15 border-2 border-[#22c55e] shadow-lg shadow-[#22c55e]/10 animate-pulse-green'
                    : player.canFillAny
                    ? `bg-[#1a1a2e] border-2 border-transparent hover:border-[#22c55e]/30 animate-elevation-hover ${posBorderClass}`
                    : 'bg-[#1a1a2e]/30 border-2 border-transparent opacity-40 cursor-not-allowed'
                }`}
              >
                {/* Index badge */}
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a0f] border border-[#1a1a2e] flex items-center justify-center z-10">
                  <span className="text-[8px] font-bold text-[#94a3b8]">{idx + 1}</span>
                </div>

                {/* Rating Square with gradient */}
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-sm font-black text-white shrink-0 shadow-inner relative overflow-hidden"
                  style={{ background: isHard ? '#4a4a5a' : getRatingGradient(player.rating) }}
                >
                  {isHard ? (
                    <span className="animate-shimmer">??</span>
                  ) : (
                    <>
                      <span className="relative z-10">{player.rating}</span>
                      {/* Mini progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div
                          className="h-full bg-white/40 rounded-r-full transition-all"
                          style={{ width: `${player.rating}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#e2e8f0] truncate">
                    {player.fullName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md font-bold text-white"
                      style={{ backgroundColor: getCategoryColor(player.mainPosition) }}
                    >
                      {player.mainPosition}
                    </span>
                    {player.otherPositions.slice(0, 3).map((pos) => (
                      <span
                        key={pos}
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-medium text-white/80"
                        style={{ backgroundColor: `${getCategoryColor(pos)}88` }}
                      >
                        {pos}
                      </span>
                    ))}
                    {player.nationality && (
                      <span className="text-[10px] text-[#94a3b8]/70 ml-1">
                        {player.nationality}
                      </span>
                    )}
                  </div>
                </div>

                {/* Compatibility indicator */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  {player.canFillAny ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {player.bestCompatibility === 'partial' && (
                        <span className="text-[8px] text-[#f97316] font-bold">0.8×</span>
                      )}
                    </>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-[#ef4444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
