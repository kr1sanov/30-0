'use client';

import { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY, canFillSlot } from '@/lib/positions';
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

interface ProcessedPlayer extends PlayerOption {
  canFillAny: boolean;
  availableSlots: number[];
}

type SortMode = 'rating' | 'name';

export default function PlayerList() {
  const { currentSpin, slots, config, directAssign } = useGameStore();
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('rating');
  const [assigningPlayerId, setAssigningPlayerId] = useState<string | null>(null);

  const isHard = config.difficulty === 'hard';

  const openPositions = useMemo(() =>
    slots
      .map((s, i) => ({ position: s.position, label: s.positionLabel, index: i }))
      .filter((s) => !slots[s.index].playerId),
    [slots]
  );

  // Process players: add compatibility info and sort
  const processedPlayers = useMemo(() => {
    if (!currentSpin) return [];

    const players = currentSpin.players.map((player) => {
      const availableSlots: number[] = [];
      let canFillAny = false;

      for (const openSlot of openPositions) {
        const result = canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          openSlot.position as Position,
        );
        if (result.canFill) {
          canFillAny = true;
          availableSlots.push(openSlot.index);
        }
      }

      return { ...player, canFillAny, availableSlots };
    });

    // Sort by selected mode
    return [...players].sort((a, b) => {
      if (sortMode === 'rating') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.fullName.localeCompare(b.fullName, 'ru');
      }
      return a.fullName.localeCompare(b.fullName, 'ru');
    });
  }, [currentSpin, openPositions, sortMode]);

  const handlePlayerClick = (player: ProcessedPlayer) => {
    if (!player.canFillAny) {
      toast.error(`${getLastName(player.fullName)} не подходит ни на одну позицию`);
      return;
    }

    // Prevent double-click
    if (assigningPlayerId) return;

    // If player can fill exactly one slot, assign directly without intermediate state
    if (player.availableSlots.length === 1) {
      const slotIdx = player.availableSlots[0];
      const slot = slots[slotIdx];
      setAssigningPlayerId(player.playerSeasonId);
      directAssign(player as PlayerOption, slotIdx).then(() => {
        // Show success toast
        toast.success(`${getLastName(player.fullName)} → ${slot?.positionLabel ?? slot?.position ?? 'позиция'}`, {
          duration: 2000,
        });
        setAssigningPlayerId(null);
      }).catch(() => {
        setAssigningPlayerId(null);
      });
      setExpandedPlayerId(null);
      return;
    }

    // Multiple positions — toggle expanded state
    if (expandedPlayerId === player.playerSeasonId) {
      setExpandedPlayerId(null);
      return;
    }

    setExpandedPlayerId(player.playerSeasonId);
  };

  const handlePositionSelect = (player: ProcessedPlayer, slotIndex: number) => {
    if (assigningPlayerId) return;
    const slot = slots[slotIndex];
    setAssigningPlayerId(player.playerSeasonId);
    directAssign(player as PlayerOption, slotIndex).then(() => {
      toast.success(`${getLastName(player.fullName)} → ${slot?.positionLabel ?? slot?.position ?? 'позиция'}`, {
        duration: 2000,
      });
      setAssigningPlayerId(null);
    }).catch(() => {
      setAssigningPlayerId(null);
    });
    setExpandedPlayerId(null);
  };

  if (!currentSpin) return null;

  return (
    <div className="space-y-3">
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

      {/* ── Player list ── */}
      <div className="space-y-2">
        {processedPlayers.map((player, idx) => {
          const isExpanded = expandedPlayerId === player.playerSeasonId;
          const posCategory = getCategory(player.mainPosition);
          const posColor = CATEGORY_BG[posCategory];
          const flagEmoji = getNationalityFlag(player.nationality);
          const isAssigning = assigningPlayerId === player.playerSeasonId;

          return (
            <div key={player.playerSeasonId}>
              <motion.button
                onClick={() => handlePlayerClick(player)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                disabled={!!assigningPlayerId}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                  isAssigning
                    ? 'bg-[#22c55e]/10 border border-[#22c55e]/40 opacity-80'
                    : !player.canFillAny
                    ? 'opacity-40 cursor-not-allowed'
                    : isExpanded
                    ? 'bg-[#0d2d0d] border border-[#22c55e]/40'
                    : 'bg-[#0d1a0d]/80 border border-transparent hover:border-[#22c55e]/20 hover:bg-[#0d2d0d]/50'
                }`}
              >
                {/* Rating square — color-coded by position category */}
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-sm font-black text-white shadow-sm"
                  style={{ backgroundColor: posColor }}
                >
                  {isAssigning ? '...' : isHard ? '?' : player.rating}
                </div>

                {/* Name, flag, positions */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#e2e8f0] truncate">
                    {getLastName(player.fullName)}{' '}
                    <span className="font-normal text-[#94a3b8]">{getFirstName(player.fullName)}</span>
                    {flagEmoji && <span className="ml-1.5">{flagEmoji}</span>}
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

                {/* Arrow if multiple positions */}
                {player.canFillAny && player.availableSlots.length > 1 && (
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[#64748b] text-xs shrink-0"
                  >
                    ▼
                  </motion.span>
                )}

                {/* Auto-assign indicator */}
                {player.canFillAny && player.availableSlots.length === 1 && !isAssigning && (
                  <span className="text-[10px] text-[#22c55e] font-bold shrink-0">✓</span>
                )}

                {/* Assigning spinner */}
                {isAssigning && (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="text-[#22c55e] text-sm shrink-0"
                  >
                    ⟳
                  </motion.span>
                )}
              </motion.button>

              {/* ── Expanded: Position selection buttons ── */}
              <AnimatePresence>
                {isExpanded && player.availableSlots.length > 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2.5 bg-[#0a1a0a] rounded-b-xl border border-t-0 border-[#22c55e]/15">
                      <span className="text-[10px] text-[#22c55e] font-bold uppercase tracking-wider mb-2 block">
                        Поставить на ({player.availableSlots.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {player.availableSlots.map((slotIdx) => {
                          const slot = slots[slotIdx];
                          if (!slot) return null;
                          const slotCat = getCategory(slot.position);
                          return (
                            <motion.button
                              key={slotIdx}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePositionSelect(player, slotIdx);
                              }}
                              disabled={!!assigningPlayerId}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110 shadow-sm disabled:opacity-50"
                              style={{ backgroundColor: CATEGORY_BG[slotCat] }}
                            >
                              {slot.positionLabel}
                            </motion.button>
                          );
                        })}
                      </div>
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
