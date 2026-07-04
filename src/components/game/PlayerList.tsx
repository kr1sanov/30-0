'use client';

import { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY, canFillSlot } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { getNationalityFlag } from '@/lib/nationality';
import { motion } from 'framer-motion';
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
}

type SortMode = 'rating' | 'name';

export default function PlayerList() {
  const { currentSpin, slots, config, selectPlayer, selectedPlayer } = useGameStore();
  const [sortMode, setSortMode] = useState<SortMode>('rating');

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
      let canFillAny = false;

      for (const openSlot of openPositions) {
        const result = canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          openSlot.position as Position,
        );
        if (result.canFill) {
          canFillAny = true;
          break;
        }
      }

      return { ...player, canFillAny };
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
    // If player can't fill any position, do nothing (grayed out)
    if (!player.canFillAny) return;

    // If this player is already selected, deselect
    if (selectedPlayer?.playerSeasonId === player.playerSeasonId) {
      // Deselect by selecting null — we call selectPlayer with the same player
      // and the store will toggle or just re-set; but per spec, clicking another
      // player switches selection, so let's deselect by calling selectPlayer again.
      // Actually, the store doesn't have a deselectPlayer. Let's just select the
      // new player. If it's the same one, the store will just re-select it.
      // For deselect, we can call selectPlayer with a dummy or handle it differently.
      // Since the user requirement says "clicking another player switches selection",
      // we'll just always call selectPlayer. Same player = re-select (no-op feel).
      return;
    }

    // Select the player — no auto-assignment, user must click position on pitch
    selectPlayer(player as PlayerOption);
  };

  if (!currentSpin) return null;

  return (
    <div className="space-y-3">
      {/* ── Instruction text ── */}
      {selectedPlayer && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-[#22c55e] font-medium bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-3 py-2 text-center"
        >
          Выберите игрока, затем нажмите на позицию на поле
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

      {/* ── Player list ── */}
      <div className="space-y-1.5">
        {processedPlayers.map((player, idx) => {
          const isSelected = selectedPlayer?.playerSeasonId === player.playerSeasonId;
          const posCategory = getCategory(player.mainPosition);
          const posColor = CATEGORY_BG[posCategory];
          const flagEmoji = getNationalityFlag(player.nationality);

          return (
            <motion.button
              key={player.playerSeasonId}
              onClick={() => handlePlayerClick(player)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.5) }}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 text-left ${
                isSelected
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

              {/* Selected checkmark */}
              {isSelected && (
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

              {/* Arrow indicator for selectable but not selected */}
              {!isSelected && player.canFillAny && (
                <span className="text-[#4a5a4a] text-xs shrink-0">›</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
