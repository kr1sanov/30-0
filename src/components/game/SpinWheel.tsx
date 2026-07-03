'use client';

import { useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RotateCcw, Zap } from 'lucide-react';

/**
 * SpinWheel — 38-0 style simplified spin component.
 * 
 * Flow:
 * 1. Idle: Shows "КРУТИТЬ СОСТАВ" + "X позиций осталось" + Spin button
 * 2. Spinning: Shows "Крутим..." with loading spinner on button
 * 3. Result: Shows "СОСТАВ ВЫПАЛ" + Club × Season banner + Re-roll button
 */
export default function SpinWheel() {
  const { currentSpin, isSpinning, spin, reroll, rerollsLeft, slots, config } =
    useGameStore();

  const openCount = slots.filter((s) => !s.playerId).length;
  const totalSlots = slots.length;
  const rerollsUsed = config.difficulty === 'easy' ? 3 - rerollsLeft : config.difficulty === 'normal' ? 1 - rerollsLeft : 0;

  /* ── User actions ── */
  const handleSpin = useCallback(async () => {
    if (isSpinning) return;
    await spin();
  }, [isSpinning, spin]);

  const handleReroll = useCallback(async () => {
    if (isSpinning || rerollsLeft <= 0) return;
    await reroll();
  }, [isSpinning, rerollsLeft, reroll]);

  const hasResult = !!currentSpin;

  return (
    <div className="space-y-3">
      {/* ── Spin Section ── */}
      <div className="rounded-2xl bg-[#0d1a0d] border border-[#1a3a1a]/60 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ── Idle / No spin yet ── */}
          {!hasResult && !isSpinning && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 text-center"
            >
              <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-bold mb-1">
                Крути состав
              </div>
              <div className="text-2xl font-black text-white mb-1">
                {openCount}{' '}
                <span className="text-sm font-bold text-[#94a3b8]">
                  позиций осталось
                </span>
              </div>
            </motion.div>
          )}

          {/* ── Spinning ── */}
          {isSpinning && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                {/* Club box */}
                <div className="flex-1 rounded-xl bg-[#1a2332] border border-[#3b82f6]/20 px-4 py-3">
                  <div className="text-[9px] uppercase tracking-widest text-[#64748b] font-bold mb-1">
                    Клуб
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-sm text-[#94a3b8]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="animate-pulse">...</span>
                  </div>
                </div>

                {/* × separator */}
                <span className="text-[#64748b]/40 font-bold text-lg">×</span>

                {/* Season box */}
                <div className="flex-1 rounded-xl bg-[#1a2332] border border-[#fbbf24]/20 px-4 py-3">
                  <div className="text-[9px] uppercase tracking-widest text-[#64748b] font-bold mb-1">
                    Сезон
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-sm text-[#94a3b8]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="animate-pulse">...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Result: Squad Spun ── */}
          {hasResult && !isSpinning && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="p-4"
            >
              <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-bold mb-2">
                Состав выпал
              </div>

              {/* Club × Season banner */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 rounded-xl bg-[#1a2332] border border-[#3b82f6]/20 px-4 py-3 text-center">
                  <div className="text-[9px] uppercase tracking-widest text-[#64748b] font-bold mb-1">
                    Клуб
                  </div>
                  <div className="text-base font-black text-white">
                    {currentSpin!.clubName}
                  </div>
                </div>

                <span className="text-[#64748b]/40 font-bold text-lg">×</span>

                <div className="flex-1 rounded-xl bg-[#1a2332] border border-[#fbbf24]/20 px-4 py-3 text-center">
                  <div className="text-[9px] uppercase tracking-widest text-[#64748b] font-bold mb-1">
                    Сезон
                  </div>
                  <div className="text-base font-black text-[#fbbf24]">
                    {currentSpin!.seasonLabel}
                  </div>
                </div>
              </div>

              {/* Instruction */}
              <p className="text-xs text-[#94a3b8] text-center mb-3">
                Выберите игрока и позицию, куда его поставить
              </p>

              {/* Re-roll button */}
              {rerollsLeft > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReroll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold border border-[#fbbf24]/40 text-[#fbbf24] rounded-xl hover:bg-[#fbbf24]/10 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Переброс ({rerollsLeft} ост.)
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Spin Button (shown when no result) ── */}
        {!hasResult && (
          <div className="px-4 pb-4">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                onClick={handleSpin}
                disabled={isSpinning}
                className="w-full h-12 text-base font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Крутим...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Крутить
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
