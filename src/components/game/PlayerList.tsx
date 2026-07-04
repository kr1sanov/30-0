'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY, POSITION_COLOR, canFillSlotStrict } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { getNationalityFlag } from '@/lib/nationality';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { PlayerOption } from '@/lib/types';

/** Position category colors — matching 38-0 style */
const CATEGORY_BG: Record<PositionCategory, string> = {
  gk: '#f97316',
  def: '#3b82f6',
  mid: '#22c55e',
  att: '#ef4444',
};

function getCategory(pos: string): PositionCategory {
  return POSITION_CATEGORY[pos as Position] ?? 'mid';
}

/** Get player's last name from full name (Russian convention: Фамилия Имя) */
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0];
}

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts.slice(1).join(' ');
  }
  return '';
}

interface CompatibleSlot {
  slotIndex: number;
  position: string;
  label: string;
  category: PositionCategory;
}

interface ProcessedPlayer extends PlayerOption {
  canFillAny: boolean;
  compatibleSlots: CompatibleSlot[];
}

type SortMode = 'rating' | 'name';

export default function PlayerList() {
  const { currentSpin, slots, config, assignToSlot, selectedPlayer, selectPlayer, deselectPlayer, skipSpin, lastDraftError } = useGameStore();
  const [sortMode, setSortMode] = useState<SortMode>('rating');

  const isHard = config.difficulty === 'hard';

  // Process players: add compatibility info and compute compatible slots
  const processedPlayers = useMemo(() => {
    if (!currentSpin) return [];

    const players = currentSpin.players.map((player) => {
      let canFillAny = false;
      const compatibleSlots: CompatibleSlot[] = [];

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot.playerId) continue; // Skip filled slots

        if (canFillSlotStrict(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          slot.position as Position,
        )) {
          canFillAny = true;
          compatibleSlots.push({
            slotIndex: i,
            position: slot.position,
            label: slot.positionLabel,
            category: POSITION_CATEGORY[slot.position as Position] ?? 'mid',
          });
        }
      }

      return { ...player, canFillAny, compatibleSlots };
    });

    // Sort by selected mode
    return [...players].sort((a, b) => {
      if (sortMode === 'rating') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.fullName.localeCompare(b.fullName, 'ru');
      }
      return a.fullName.localeCompare(b.fullName, 'ru');
    });
  }, [currentSpin, slots, sortMode]);

  // Show soft warning toast when draft API fails (non-blocking — game continues)
  useEffect(() => {
    if (lastDraftError) {
      toast.warning('Сохранение', {
        description: lastDraftError,
        duration: 3000,
      });
    }
  }, [lastDraftError]);

  const handlePlayerClick = useCallback((player: ProcessedPlayer) => {
    // If player can't fill any position, do nothing (grayed out)
    if (!player.canFillAny) return;

    // If this player is already selected, deselect
    if (selectedPlayer?.playerSeasonId === player.playerSeasonId) {
      deselectPlayer();
      return;
    }

    // Select this player — positions will expand inline
    selectPlayer(player as PlayerOption);
  }, [selectedPlayer, deselectPlayer, selectPlayer]);

  const handlePositionClick = useCallback((slotIndex: number) => {
    assignToSlot(slotIndex);
    // After assignment, currentSpin and selectedPlayer are cleared by the store
  }, [assignToSlot]);

  const handleCancel = useCallback(() => {
    deselectPlayer();
  }, [deselectPlayer]);

  // Check if ANY player can fill any position
  const anyCompatible = processedPlayers.some(p => p.canFillAny);

  if (!currentSpin) return null;

  return (
    <div className="space-y-3">
      {/* ── No compatible players banner + skip button ── */}
      {!anyCompatible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2a1010] border-2 border-[#ef4444]/40 rounded-xl p-4 text-center space-y-2"
        >
          <p className="text-sm font-bold text-[#ef4444]">
            Нет подходящих игроков
          </p>
          <p className="text-xs text-[#94a3b8]">
            Ни один игрок не подходит на оставшиеся позиции
          </p>
          <button
            onClick={skipSpin}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white active:scale-95 transition-all"
          >
            Пропустить и крутить снова
          </button>
        </motion.div>
      )}

      {/* ── Sort controls ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold">
          Сортировка
        </span>
        <div className="flex rounded-lg overflow-hidden border border-[#1a3a1a]/60">
          <button
            onClick={() => setSortMode('rating')}
            className={`px-3 py-1 text-xs font-bold transition-all ${
              sortMode === 'rating'
                ? 'bg-[#22c55e]/20 text-[#22c55e]'
                : 'bg-[#0d1a0d] text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Рейтинг
          </button>
          <button
            onClick={() => setSortMode('name')}
            className={`px-3 py-1 text-xs font-bold transition-all ${
              sortMode === 'name'
                ? 'bg-[#22c55e]/20 text-[#22c55e]'
                : 'bg-[#0d1a0d] text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Фамилия А-Я
          </button>
        </div>
      </div>

      {/* ── Player list with inline position expansion ── */}
      <div className="space-y-1.5">
        {processedPlayers.map((player, idx) => {
          const isExpanded = selectedPlayer?.playerSeasonId === player.playerSeasonId;
          const posCategory = getCategory(player.mainPosition);
          const posColor = CATEGORY_BG[posCategory];
          const flagEmoji = getNationalityFlag(player.nationality);

          return (
            <div key={player.playerSeasonId}>
              {/* ── Player card row ── */}
              <motion.button
                onClick={() => handlePlayerClick(player)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 text-left ${
                  isExpanded
                    ? 'bg-[#22c55e]/15 border-2 border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                    : !player.canFillAny
                    ? 'opacity-35 cursor-not-allowed border-2 border-transparent'
                    : 'bg-[#0d1a0d]/80 border-2 border-transparent hover:border-[#22c55e]/30 hover:bg-[#0d2d0d]/50'
                }`}
              >
                {/* Rating square — color-coded by position category */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-black text-white shadow-sm"
                  style={{ backgroundColor: posColor }}
                >
                  {isHard ? '?' : player.rating}
                </div>

                {/* Name, flag, positions */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight truncate">
                    <span className="font-bold text-[#e2e8f0]">{getLastName(player.fullName)}</span>{' '}
                    <span className="font-normal text-[#94a3b8]">{getFirstName(player.fullName)}</span>
                    {flagEmoji && <span className="ml-1">{flagEmoji}</span>}
                  </div>
                  {/* Position badges */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {[player.mainPosition, ...player.otherPositions].map((pos, posIdx) => {
                      const cat = getCategory(pos);
                      return (
                        <span
                          key={`${pos}-${posIdx}`}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white/90"
                          style={{ backgroundColor: `${CATEGORY_BG[cat]}99` }}
                        >
                          {pos}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Expanded indicator — checkmark or arrow */}
                {isExpanded && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="shrink-0 w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7.5L5.5 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                )}

                {/* Arrow indicator for selectable but not expanded */}
                {!isExpanded && player.canFillAny && (
                  <span className="text-[#4a5a4a] text-xs shrink-0">▾</span>
                )}
              </motion.button>

              {/* ── Inline position expansion below the player card ── */}
              <AnimatePresence>
                {isExpanded && player.compatibleSlots.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#0d1a0d] border-2 border-[#22c55e]/40 rounded-xl p-3 space-y-2.5 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                      {/* Instruction */}
                      <p className="text-[11px] text-[#94a3b8] font-medium">
                        Выберите позицию для <span className="text-[#e2e8f0] font-bold">{getLastName(player.fullName)}</span>:
                      </p>

                      {/* Position buttons grid */}
                      <div className="flex flex-wrap gap-2">
                        {player.compatibleSlots.map((slot) => {
                          const catColor = POSITION_COLOR[slot.category];

                          return (
                            <motion.button
                              key={slot.slotIndex}
                              onClick={() => handlePositionClick(slot.slotIndex)}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              className="relative min-h-[40px] min-w-[52px] px-4 py-2 rounded-lg font-bold text-white text-sm
                                border-2 border-[#22c55e]/60 shadow-[0_0_10px_rgba(34,197,94,0.25)]
                                hover:border-[#22c55e] hover:shadow-[0_0_16px_rgba(34,197,94,0.4)]
                                active:scale-95 transition-all duration-150"
                              style={{ backgroundColor: catColor }}
                            >
                              <span className="relative z-10">{slot.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Cancel button */}
                      <button
                        onClick={handleCancel}
                        className="w-full py-2 rounded-lg text-xs font-medium text-[#94a3b8]
                          bg-[#1a1a1a] border border-[#2a2a2a]
                          hover:bg-[#222222] hover:text-[#e2e8f0] hover:border-[#3a3a3a]
                          active:scale-[0.98] transition-all duration-150"
                      >
                        Отменить
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
