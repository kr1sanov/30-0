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
      const timer = setTimeout(() => setShowResult(true), 150);
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
    <div className="space-y-3">
      {/* Spin / Result area */}
      <div
        className={`relative rounded-2xl bg-[#0d2d0d] p-4 flex flex-col items-center overflow-hidden transition-all duration-300 border ${
          isSpinning
            ? 'border-[#22c55e]/40 shadow-[0_0_20px_rgba(34,197,94,0.12)]'
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
              className="text-center py-4"
            >
              <p className="text-sm text-[#94a3b8] mb-1">
                Осталось заполнить: <span className="text-[#22c55e] font-bold">{openCount}</span> позиций
              </p>
              <p className="text-xs text-[#94a3b8]/60">
                Нажмите кнопку ниже, чтобы крутить
              </p>
            </motion.div>
          )}

          {/* Spinning state — club × season card with spinner */}
          {isSpinning && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-5 w-full"
            >
              {/* Spinning cards: CLUB × SEASON */}
              <div className="flex items-center justify-center gap-3">
                {/* Club card */}
                <motion.div
                  animate={{ y: [0, -3, 0, 3, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="rounded-xl bg-[#1a1a2e] px-5 py-3 min-w-[120px] text-center border border-white/10"
                >
                  <div className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Клуб</div>
                  <div className="flex items-center justify-center gap-1.5">
                    <motion.span
                      className="text-lg"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    >
                      ⚽
                    </motion.span>
                    <span className="text-sm font-bold text-white/60">. . .</span>
                  </div>
                </motion.div>

                {/* × separator */}
                <span className="text-lg text-[#94a3b8]/40 font-bold">×</span>

                {/* Season card */}
                <motion.div
                  animate={{ y: [0, 3, 0, -3, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                  className="rounded-xl bg-[#1a1a2e] px-5 py-3 min-w-[100px] text-center border border-white/10"
                >
                  <div className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Сезон</div>
                  <div className="flex items-center justify-center gap-1.5">
                    <motion.span
                      className="text-lg"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.2 }}
                    >
                      📅
                    </motion.span>
                    <span className="text-sm font-bold text-white/60">. . .</span>
                  </div>
                </motion.div>
              </div>

              {/* Spinning text */}
              <motion.p
                className="text-sm text-[#22c55e] font-bold mt-4"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              >
                Крутим...
              </motion.p>
            </motion.div>
          )}

          {/* Result reveal */}
          {hasResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="text-center py-3 w-full"
            >
              {/* Result cards: CLUB × SEASON */}
              <div className="flex items-center justify-center gap-3 mb-3">
                {/* Club card */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="rounded-xl bg-[#1a1a2e] px-5 py-3 min-w-[120px] text-center border border-[#22c55e]/20"
                >
                  <div className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Клуб</div>
                  <div className="text-base font-black text-white">{currentSpin.clubName}</div>
                </motion.div>

                {/* × separator */}
                <span className="text-lg text-[#94a3b8]/40 font-bold">×</span>

                {/* Season card */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                  className="rounded-xl bg-[#1a1a2e] px-5 py-3 min-w-[100px] text-center border border-[#22c55e]/20"
                >
                  <div className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider mb-1">Сезон</div>
                  <div className="text-base font-black text-[#fbbf24]">{currentSpin.seasonLabel}</div>
                </motion.div>
              </div>

              <p className="text-xs text-[#94a3b8]">
                Выберите игрока из состава
              </p>

              {/* Reroll button */}
              {rerollsLeft > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReroll}
                  disabled={isSpinning}
                  className="mt-2 px-4 py-1.5 text-xs font-bold border border-[#22c55e]/40 text-[#22c55e] rounded-xl hover:bg-[#22c55e]/10 transition-all"
                >
                  Переброс ({rerollsLeft})
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
            className="w-full h-12 text-base font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25 disabled:opacity-50 transition-all"
          >
            {isSpinning ? 'Крутим...' : 'Крутить'}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
