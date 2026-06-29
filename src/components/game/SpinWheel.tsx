'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/use-telegram';
import { useSound } from '@/hooks/use-sound';

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

const SPIN_NAMES = [
  'Зенит', 'Спартак', 'ЦСКА', 'Локомотив', 'Краснодар',
  'Динамо', 'Рубин', 'Ахмат', 'Ростов', 'Урал',
  'Крылья Советов', 'Торпедо', 'Факел', 'Оренбург',
];

/* Particle burst items for spin result reveal */
const BURST_PARTICLES = [
  { emoji: '⚽', x: '50px', y: '-40px' },
  { emoji: '🟢', x: '-45px', y: '-35px' },
  { emoji: '⭐', x: '40px', y: '35px' },
  { emoji: '🎯', x: '-50px', y: '30px' },
];

export default function SpinWheel() {
  const { currentSpin, isSpinning, spin, reroll, rerollsLeft, config, slots } = useGameStore();
  const { haptic } = useTelegram();
  const { play } = useSound();
  const [displayText, setDisplayText] = useState<string>('');
  const [displayEmoji, setDisplayEmoji] = useState<string>('⚽');
  const [animating, setAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  const openCount = slots.filter((s) => !s.playerId).length;

  const handleSpin = () => {
    haptic('medium');
    play('spin');
    spin();
  };

  const handleReroll = () => {
    haptic('light');
    play('reroll');
    reroll();
  };

  // Spinning animation
  useEffect(() => {
    if (!isSpinning) {
      setAnimating(false);
      setShowResult(false);
      return;
    }

    setAnimating(true);
    setShowResult(false);
    setShowParticles(false);

    let i = 0;
    const interval = setInterval(() => {
      const name = SPIN_NAMES[i % SPIN_NAMES.length];
      setDisplayText(name);
      setDisplayEmoji(getClubEmoji(name));
      i++;
    }, 80);

    // Animate wheel rotation
    setWheelRotation((prev) => prev + 720);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setAnimating(false);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isSpinning]);

  // When spin result arrives, show it with dramatic reveal
  useEffect(() => {
    if (currentSpin && !isSpinning) {
      play('spin_result');
      setDisplayText(currentSpin.clubName);
      setDisplayEmoji(getClubEmoji(currentSpin.clubName));
      // Dramatic reveal delay
      const timer = setTimeout(() => {
        setShowResult(true);
        setShowParticles(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentSpin, isSpinning, play]);

  const hasResult = currentSpin && !isSpinning;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-black text-[#e2e8f0]">КРУТИТЬ СОСТАВ</h3>
        <p className="text-xs text-[#94a3b8] mt-1">
          Осталось заполнить: <span className="text-[#22c55e] font-bold">{openCount}</span> позиций
        </p>
      </div>

      {/* Spin Result Display with Wheel */}
      <div className="relative rounded-2xl bg-[#1a1a2e] p-6 text-center min-h-[160px] flex flex-col items-center justify-center border border-[#1a1a2e] overflow-hidden">
        {/* Decorative wheel ring */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: animating ? 0.15 : 0.05 }}
        >
          <motion.div
            className="w-48 h-48 rounded-full border-4 border-dashed border-[#22c55e]"
            animate={{ rotate: wheelRotation }}
            transition={{ duration: 1.5, ease: [0.17, 0.67, 0.12, 0.99] }}
          />
        </div>

        {/* Particle burst effect on result reveal */}
        {showParticles && hasResult && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {BURST_PARTICLES.map((p, i) => (
              <span
                key={i}
                className="absolute text-lg animate-particle-burst"
                style={{
                  '--burst-x': p.x,
                  '--burst-y': p.y,
                } as React.CSSProperties}
              >
                {p.emoji}
              </span>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {animating ? (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10"
            >
              <div className="text-4xl mb-2">{displayEmoji}</div>
              <div className="text-3xl sm:text-4xl font-black text-[#22c55e] animate-pulse">
                {displayText}
              </div>
              <div className="text-sm text-[#94a3b8] mt-2">Крутим колесо...</div>
            </motion.div>
          ) : hasResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: showResult ? 1 : 0.3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="relative z-10"
            >
              <div className="text-4xl mb-2">{getClubEmoji(currentSpin.clubName)}</div>
              <div className={`text-2xl sm:text-3xl font-black text-[#e2e8f0] ${showResult ? 'animate-club-glow' : ''}`}>
                {currentSpin.clubName}
              </div>
              <div className="text-lg text-[#22c55e] font-bold mt-1">
                {currentSpin.seasonLabel}
              </div>
              <div className="text-xs text-[#94a3b8] mt-2">
                {currentSpin.players.length} игроков в составе
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10"
            >
              <div className="text-4xl mb-3">🎰</div>
              <div className="text-[#94a3b8]">Нажмите кнопку, чтобы крутить колесо</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spin Button */}
      {!hasResult && (
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full h-14 text-lg font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25 disabled:opacity-50 transition-all"
          >
            {isSpinning ? '🎰 Крутится...' : '🎰 Крутить колесо'}
          </Button>
        </motion.div>
      )}

      {/* Reroll Button */}
      {hasResult && rerollsLeft > 0 && (
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleReroll}
            disabled={isSpinning}
            variant="outline"
            className="reroll-hover w-full h-12 text-sm font-bold border-[#22c55e]/40 text-[#22c55e] hover:bg-[#22c55e]/10 rounded-2xl transition-all"
          >
            <span className="reroll-icon inline-block">🔄</span> Переброс ({rerollsLeft} осталось)
          </Button>
        </motion.div>
      )}

      {/* Rerolls Counter */}
      <div className="text-center text-xs text-[#94a3b8]">
        Перебросы: <span className="font-bold text-[#22c55e]">{rerollsLeft}</span>/{config.difficulty === 'easy' ? 3 : config.difficulty === 'normal' ? 1 : 0}
      </div>
    </div>
  );
}
