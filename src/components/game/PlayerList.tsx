'use client';

import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY, POSITION_COLOR } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { canFillSlot } from '@/lib/positions';
import { motion } from 'framer-motion';

function getRatingColor(rating: number): string {
  if (rating >= 78) return '#22c55e';
  if (rating >= 73) return '#3b82f6';
  if (rating >= 68) return '#f97316';
  return '#ef4444';
}

function getCategoryColor(pos: string): string {
  const category = POSITION_CATEGORY[pos as Position] ?? 'mid' as PositionCategory;
  return POSITION_COLOR[category];
}

export default function PlayerList() {
  const { currentSpin, selectedPlayer, selectPlayer, slots, config } = useGameStore();

  if (!currentSpin) return null;

  const openPositions = slots
    .filter((s) => !s.playerId)
    .map((s) => s.position);

  const isHard = config.difficulty === 'hard';

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

      {/* Instruction text */}
      <div className="flex items-center gap-2 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 p-3">
        <svg className="w-4 h-4 text-[#22c55e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        <p className="text-xs text-[#22c55e]">Выберите игрока, затем укажите позицию на поле</p>
      </div>

      {/* Player List */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {currentSpin.players.map((player, idx) => {
          const isSelected = selectedPlayer?.playerSeasonId === player.playerSeasonId;

          // Check if this player can fill any open position
          const canFillAny = openPositions.some((slotPos) =>
            canFillSlot(
              player.mainPosition as Position,
              player.otherPositions as Position[],
              slotPos as Position,
            ).canFill
          );

          // Check best compatibility level for display
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

          return (
            <motion.button
              key={player.playerSeasonId}
              onClick={() => canFillAny && selectPlayer(player)}
              disabled={!canFillAny}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                isSelected
                  ? 'bg-[#22c55e]/15 border-2 border-[#22c55e] shadow-lg shadow-[#22c55e]/10'
                  : canFillAny
                  ? 'bg-[#1a1a2e] border-2 border-transparent hover:border-[#22c55e]/30 hover:bg-[#1a1a2e]/80 card-glow'
                  : 'bg-[#1a1a2e]/30 border-2 border-transparent opacity-40 cursor-not-allowed'
              }`}
            >
              {/* Rating Square */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-inner"
                style={{ backgroundColor: isHard ? '#4a4a5a' : getRatingColor(player.rating) }}
              >
                {isHard ? '??' : player.rating}
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
                {canFillAny ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {bestCompatibility === 'partial' && (
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
        })}
      </div>
    </div>
  );
}
