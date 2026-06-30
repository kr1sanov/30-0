'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { POSITION_COLOR, POSITION_CATEGORY } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/** Category gradient for filled slots */
const CATEGORY_GRADIENT: Record<PositionCategory, string> = {
  gk: 'linear-gradient(135deg, #f97316, #ea580c)',
  def: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  mid: 'linear-gradient(135deg, #22c55e, #16a34a)',
  att: 'linear-gradient(135deg, #ef4444, #dc2626)',
};

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

export default function DraftProgressTracker() {
  const { slots, config, lastDraftState, undoLastPick } = useGameStore();

  const teamName = config.teamName || 'Моя команда';

  // Calculate squad overall rating
  const squadRating = useMemo(() => {
    const filled = slots.filter((s) => s.playerRating);
    if (filled.length === 0) return 0;
    const sum = filled.reduce((acc, s) => acc + (s.playerRating ?? 0), 0);
    return Math.round(sum / filled.length);
  }, [slots]);

  // Count filled slots
  const filledCount = useMemo(() => slots.filter((s) => s.playerId).length, [slots]);

  // Determine which slot is "current" (first unfilled)
  const currentSlotIndex = useMemo(
    () => slots.findIndex((s) => !s.playerId),
    [slots]
  );

  const handleUndo = async () => {
    await undoLastPick();
    toast.success('↩ Выбор отменён');
  };

  return (
    <div className="w-full">
      {/* Header with team name and undo button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#e2e8f0]">
            {teamName}
          </span>
          <span className="text-xs font-medium text-[#94a3b8]">
            {filledCount}/11
          </span>
        </div>
        <div className="flex items-center gap-2">
          {filledCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#94a3b8]">Рейтинг состава</span>
              <motion.span
                key={squadRating}
                initial={{ scale: 1.3, color: '#22c55e' }}
                animate={{ scale: 1, color: '#e2e8f0' }}
                transition={{ duration: 0.4 }}
                className="text-sm font-black"
              >
                {squadRating}
              </motion.span>
            </div>
          )}
          {/* Undo button */}
          <AnimatePresence>
            {lastDraftState && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                onClick={handleUndo}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#f97316]/40 bg-[#f97316]/10 text-[#f97316] text-[11px] font-bold hover:bg-[#f97316]/20 transition-colors"
              >
                ↩ Отменить
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Linear progress bar */}
      <div className="h-1.5 rounded-full bg-[#1a1a2e] overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(filledCount / 11) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)' }}
        />
      </div>

      {/* Slot circles */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {slots.map((slot, idx) => {
          const isFilled = !!slot.playerId;
          const isCurrent = idx === currentSlotIndex;
          const category = POSITION_CATEGORY[slot.position as Position] ?? 'mid';
          const posColor = POSITION_COLOR[category];

          return (
            <div key={`${slot.position}_${idx}`} className="flex flex-col items-center gap-1 min-w-[36px]">
              {/* Circle */}
              <motion.div
                layout
                initial={false}
                animate={{
                  scale: isFilled ? 1 : isCurrent ? 1.05 : 0.9,
                }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="relative"
              >
                {isFilled ? (
                  // Filled slot: green circle with initials
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg border-2 border-white/30"
                    style={{
                      background: CATEGORY_GRADIENT[category],
                    }}
                  >
                    {slot.playerName ? getInitials(slot.playerName) : '✓'}
                  </motion.div>
                ) : isCurrent ? (
                  // Current slot being drafted: pulsing green outline
                  <div className="w-9 h-9 rounded-full border-2 border-[#22c55e] flex items-center justify-center relative animate-pulse">
                    <div className="absolute inset-0 rounded-full bg-[#22c55e]/10" />
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: posColor, opacity: 0.6 }}
                    />
                  </div>
                ) : (
                  // Empty slot: gray outline
                  <div className="w-9 h-9 rounded-full border-2 border-[#2a2a4a] flex items-center justify-center">
                    <div
                      className="w-2 h-2 rounded-full opacity-30"
                      style={{ backgroundColor: posColor }}
                    />
                  </div>
                )}

                {/* Rating tooltip for filled slots */}
                {isFilled && slot.playerRating && (
                  <div
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-black text-white border border-[#0a0a0f] shadow-sm px-0.5"
                    style={{
                      backgroundColor:
                        slot.playerRating >= 78 ? '#22c55e' :
                        slot.playerRating >= 73 ? '#3b82f6' :
                        slot.playerRating >= 68 ? '#f97316' : '#ef4444',
                    }}
                  >
                    {config.difficulty === 'hard' ? '?' : slot.playerRating}
                  </div>
                )}
              </motion.div>

              {/* Position abbreviation */}
              <span
                className={`text-[9px] font-bold leading-none ${
                  isFilled
                    ? 'text-[#e2e8f0]'
                    : isCurrent
                    ? 'text-[#22c55e]'
                    : 'text-[#94a3b8]/50'
                }`}
              >
                {slot.position}
              </span>
            </div>
          );
        })}

        {/* Squad rating at the end */}
        {filledCount > 0 && (
          <div className="flex flex-col items-center gap-1 min-w-[44px] ml-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white border-2 border-[#22c55e]/40"
              style={{
                background: 'linear-gradient(135deg, #22c55e/20, #16a34a/20)',
              }}
            >
              {squadRating}
            </motion.div>
            <span className="text-[9px] font-bold text-[#22c55e] leading-none">СР</span>
          </div>
        )}
      </div>
    </div>
  );
}
