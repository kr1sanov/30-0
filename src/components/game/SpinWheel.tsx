'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/use-telegram';
import { useSound } from '@/hooks/use-sound';

/* ── Club emojis ── */
const CLUB_EMOJIS: Record<string, string> = {
  'Зенит': '🔵',
  'Спартак': '🔴',
  'ЦСКА': '🟥',
  'Локомотив': '🟢',
  'Краснодар': '🟠',
  'Динамо': '⚪',
  'Рубин': '🟤',
  'Ахмат': '🟢',
  'Ростов': '🟡',
  'Урал': '🟠',
  'Крылья Советов': '🟢',
  'Торпедо': '⚫',
  'Факел': '🔴',
  'Оренбург': '🟠',
  'Амкар': '🔴',
  'Сатурн': '🔵',
  'Томь': '🟡',
  'Кубань': '🟡',
  'Алания': '🟡',
};

function getClubEmoji(name: string): string {
  return CLUB_EMOJIS[name] ?? '⚽';
}

/* ── Component ── */
export default function SpinWheel() {
  const { currentSpin, isSpinning, spin, reroll, rerollsLeft, config, slots } = useGameStore();
  const { haptic } = useTelegram();
  const { play } = useSound();

  const [showResult, setShowResult] = useState(false);
  const initializedRef = useRef(false);

  const openCount = slots.filter((s) => !s.playerId).length;

  /* ── Show result when spin data arrives ── */
  useEffect(() => {
    if (currentSpin && !isSpinning) {
      if (!initializedRef.current) {
        initializedRef.current = true;
      }
      const timer = setTimeout(() => setShowResult(true), 200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setShowResult(false), 0);
    return () => clearTimeout(timer);
  }, [currentSpin, isSpinning]);

  /* ── User actions ── */
  const handleSpin = () => {
    haptic('medium');
    play('spin');
    setShowResult(false);
    spin();
  };

  const handleReroll = () => {
    haptic('light');
    play('reroll');
    setShowResult(false);
    reroll();
  };

  const hasResult = !!(currentSpin && !isSpinning && showResult);

  return (
    <div className="space-y-4">
      {/* Spin / Result area */}
      <div
        className={`relative rounded-2xl bg-[#0d2d0d] p-5 flex flex-col items-center overflow-hidden transition-all duration-500 border ${
          isSpinning
            ? 'border-[#22c55e]/40 shadow-[0_0_30px_rgba(34,197,94,0.15)]'
            : hasResult
            ? 'border-[#22c55e]/20'
            : 'border-[#1a3a1a]/50'
        }`}
      >
        <AnimatePresence mode="wait">
          {/* Idle state — no spin yet */}
          {!currentSpin && !isSpinning && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <div className="text-3xl mb-3 opacity-60">🎰</div>
              <p className="text-sm text-[#94a3b8] mb-1">
                Осталось заполнить: <span className="text-[#22c55e] font-bold">{openCount}</span> позиций
              </p>
              <p className="text-xs text-[#94a3b8]/60">
                Нажмите кнопку, чтобы крутить
              </p>
            </motion.div>
          )}

          {/* Spinning state */}
          {isSpinning && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-8"
            >
              <motion.div
                className="text-4xl mb-3"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⚽
              </motion.div>
              <p className="text-sm text-[#22c55e] font-bold animate-pulse">
                Крутим...
              </p>
            </motion.div>
          )}

          {/* Result reveal */}
          {hasResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-center py-4 w-full"
            >
              <motion.div
                className="text-3xl mb-2"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {getClubEmoji(currentSpin.clubName)}
              </motion.div>
              <div className="text-xl font-black text-[#e2e8f0]">
                {currentSpin.clubName}
              </div>
              <div className="text-base text-[#22c55e] font-bold mt-1">
                {currentSpin.seasonLabel}
              </div>
              <p className="text-xs text-[#94a3b8] mt-2">
                Выберите игрока из состава
              </p>

              {/* Reroll button */}
              {rerollsLeft > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReroll}
                  disabled={isSpinning}
                  className="mt-3 px-4 py-2 text-xs font-bold border border-[#22c55e]/40 text-[#22c55e] rounded-xl hover:bg-[#22c55e]/10 transition-all"
                >
                  🔄 Переброс ({rerollsLeft})
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Spin Button ── */}
      {!hasResult && (
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full h-14 text-lg font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25 disabled:opacity-50 transition-all"
          >
            {isSpinning ? '⚽ Крутим...' : '🎰 Крутить'}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
