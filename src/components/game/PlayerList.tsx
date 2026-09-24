'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY, POSITION_COLOR, canFillSlotStrict } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { PlayerOption } from '@/lib/types';
import { useTelegram } from '@/hooks/use-telegram';

/* ─── Colors ─── */
const ACCENT = 'var(--club-primary)';
const accentMix = (percent: number) => `color-mix(in srgb, var(--club-primary) ${percent}%, transparent)`;
const BG_CARD = '#141414';

/** Rating color tiers — ≥85 green, 75-84 blue, <75 gray */
function getRatingBgColor(rating: number): string {
  if (rating >= 85) return '#00C896';
  if (rating >= 75) return '#3b82f6';
  return '#64748b';
}

/** Position category colors — matching 38-0 style */
const CATEGORY_BG: Record<PositionCategory, string> = {
  gk: '#f97316',
  def: '#3b82f6',
  mid: '#00C896',
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
  const { haptic, selectionChanged } = useTelegram();

  const isPrimeMode = config.ratingMode === 'prime';
  const [sortMode, setSortMode] = useState<SortMode>('rating');

  // Effective showRatings
  const effectiveShowRatings = config.showRatings !== undefined
    ? config.showRatings
    : config.difficulty !== 'hard';

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
          // Identical slots (for example two НП places in 4-4-2) are interchangeable.
          // Offer one position button; the first open slot is filled, then the
          // next spin can fill the remaining slot of the same type.
          if (compatibleSlots.some((candidate) => candidate.position === slot.position)) continue;
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

    // Keep valid picks first; selected sort is a tie-breaker only.
    return [...players].sort((a, b) => {
      if (a.canFillAny !== b.canFillAny) return a.canFillAny ? -1 : 1;
      const ratingA = isPrimeMode && a.primeRating ? a.primeRating : a.rating;
      const ratingB = isPrimeMode && b.primeRating ? b.primeRating : b.rating;
      if (sortMode === 'rating') {
        if (ratingB !== ratingA) return ratingB - ratingA;
        return a.fullName.localeCompare(b.fullName, 'ru');
      }
      return a.fullName.localeCompare(b.fullName, 'ru');
    });
  }, [currentSpin, slots, sortMode, isPrimeMode]);

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
    selectionChanged(); // Light haptic for selection
    selectPlayer(player as PlayerOption);
  }, [selectedPlayer, deselectPlayer, selectPlayer, selectionChanged]);

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
          className="rounded-xl p-4 text-center space-y-2"
          style={{ backgroundColor: '#1a0a0a', border: '2px solid #ef4444/40' }}
        >
          <p className="text-sm font-bold text-[#ef4444]">
            Нет подходящих игроков
          </p>
          <p className="text-xs text-[#9CA3AF]">
            Ни один игрок не подходит на оставшиеся позиции
          </p>
          <button
            onClick={skipSpin}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-bold text-white active:scale-95 transition-all"
            style={{ backgroundColor: ACCENT }}
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
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: '1px solid #1f1f1f' }}
        >
          <button
            onClick={() => setSortMode('rating')}
            className="px-3 py-1 text-xs font-bold transition-all"
            style={{
              backgroundColor: sortMode === 'rating' ? accentMix(14) : 'transparent',
              color: sortMode === 'rating' ? ACCENT : '#64748b',
            }}
          >
            Рейтинг
          </button>
          <button
            onClick={() => setSortMode('name')}
            className="px-3 py-1 text-xs font-bold transition-all"
            style={{
              backgroundColor: sortMode === 'name' ? accentMix(14) : 'transparent',
              color: sortMode === 'name' ? ACCENT : '#64748b',
            }}
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
          const displayRating = isPrimeMode && player.primeRating ? player.primeRating : player.rating;
          const ratingBg = getRatingBgColor(displayRating);

          return (
            <div key={player.playerSeasonId}>
              {/* ── Player card row ── */}
              <motion.button
                onClick={() => handlePlayerClick(player)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 text-left"
                style={{
                  backgroundColor: isExpanded
                    ? accentMix(10)
                    : !player.canFillAny
                    ? 'transparent'
                    : BG_CARD,
                  border: isExpanded
                    ? `2px solid ${ACCENT}`
                    : '2px solid transparent',
                  boxShadow: isExpanded
                    ? '0 0 12px var(--club-glow)'
                    : 'none',
                  opacity: !player.canFillAny ? 0.35 : 1,
                  cursor: !player.canFillAny ? 'not-allowed' : 'pointer',
                }}
              >
                {/* Rating square — color-coded by rating tier */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-black text-white shadow-sm"
                  style={{ backgroundColor: effectiveShowRatings ? ratingBg : '#64748b' }}
                >
                  {effectiveShowRatings ? displayRating : '?'}
                </div>

                {/* Name and positions */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight truncate">
                    <span className="font-bold text-[#FFFFFF]">{getLastName(player.fullName)}</span>{' '}
                    <span className="font-normal text-[#9CA3AF]">{getFirstName(player.fullName)}</span>
                  </div>
                  {/* Position badges */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {[...new Set([player.mainPosition, ...player.otherPositions])].map((pos, posIdx) => {
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
                    {/* No prime season badge */}
                  </div>
                </div>

                {/* Expanded indicator — checkmark */}
                {isExpanded && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: ACCENT }}
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
                    <div
                      className="p-3 space-y-2.5 rounded-xl"
                      style={{
                        backgroundColor: '#0a0a0a',
                        border: `2px solid ${accentMix(30)}`,
                        boxShadow: '0 0 20px var(--club-glow)',
                      }}
                    >
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
                              className="relative min-h-[44px] min-w-[56px] px-4 py-2.5 rounded-lg font-bold text-white text-sm
                                active:scale-95 transition-all duration-150"
                              style={{
                                backgroundColor: catColor,
                                border: `2px solid ${accentMix(45)}`,
                                boxShadow: '0 0 10px var(--club-glow)',
                              }}
                            >
                              <span className="relative z-10">{slot.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* No cancel button - user can just select a different player */}
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
