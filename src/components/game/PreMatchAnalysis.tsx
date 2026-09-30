'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  POSITION_CATEGORY,
} from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<PositionCategory, string> = {
  gk: 'Вратарь',
  def: 'Защита',
  mid: 'Полузащита',
  att: 'Атака',
};

const CATEGORY_COLORS: Record<PositionCategory, string> = {
  gk: '#f97316',
  def: '#3b82f6',
  mid: '#00C896',
  att: '#ef4444',
};

const CATEGORY_ICONS: Record<PositionCategory, string> = {
  gk: '🧤',
  def: '🛡️',
  mid: '⚡',
  att: '⚽',
};

// ---------------------------------------------------------------------------
// Animated Counter Hook
// ---------------------------------------------------------------------------

function useAnimatedValue(target: number, duration: number = 800, delay: number = 0): number {
  const [current, setCurrent] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;

    const delayTimeout = setTimeout(() => {
      startTimeRef.current = null;

      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(eased * target * 10) / 10);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayTimeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay]);

  return current;
}

// ---------------------------------------------------------------------------
// Prediction Logic
// ---------------------------------------------------------------------------

function getPrediction(avgRating: number): { text: string; color: string; emoji: string } {
  if (avgRating >= 75) return { text: 'Борьба за чемпионство', color: '#00C896', emoji: '🏆' };
  if (avgRating >= 70) return { text: 'Еврозона', color: '#3b82f6', emoji: '🏟️' };
  if (avgRating >= 65) return { text: 'Середняк', color: '#f97316', emoji: '⚖️' };
  return { text: 'Борьба за выживание', color: '#ef4444', emoji: '⚠️' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreMatchAnalysis() {
  const { slots, currentManager, config, simulate } = useGameStore();
  const [isSimulating, setIsSimulating] = useState(false);

  const isPrimeMode = config.ratingMode === 'prime';

  // Calculate category averages
  const stats = useMemo(() => {
    const filledSlots = slots.filter((s) => s.playerId && s.playerRating !== undefined);
    const categories: PositionCategory[] = ['gk', 'def', 'mid', 'att'];
    const categoryRatings: Record<PositionCategory, { avg: number; count: number }> = {
      gk: { avg: 0, count: 0 },
      def: { avg: 0, count: 0 },
      mid: { avg: 0, count: 0 },
      att: { avg: 0, count: 0 },
    };

    let totalRating = 0;
    for (const slot of filledSlots) {
      const cat = POSITION_CATEGORY[slot.position as Position] ?? ('mid' as PositionCategory);
      const effectiveRating = isPrimeMode && slot.playerPrimeRating ? slot.playerPrimeRating : (slot.playerRating ?? 0);
      const rating = slot.isCompatible ? effectiveRating : Math.round(effectiveRating * 0.8);
      categoryRatings[cat].avg += rating;
      categoryRatings[cat].count++;
      totalRating += rating;
    }

    const filledCount = filledSlots.length;
    const overall = filledCount > 0 ? Math.round((totalRating / filledCount) * 10) / 10 : 0;

    for (const cat of categories) {
      if (categoryRatings[cat].count > 0) {
        categoryRatings[cat].avg = Math.round((categoryRatings[cat].avg / categoryRatings[cat].count) * 10) / 10;
      }
    }

    // Chemistry
    let chemistryScore = 50;
    const allCompatible = slots.every((s) => !s.playerId || s.isCompatible !== false);
    if (allCompatible) chemistryScore += 20;
    const allFilled = categories.every((c) => categoryRatings[c].count > 0);
    if (allFilled) chemistryScore += 10;
    if (overall >= 78) chemistryScore += 15;
    else if (overall >= 73) chemistryScore += 10;
    else if (overall >= 68) chemistryScore += 5;
    chemistryScore = Math.min(100, chemistryScore);

    // Strengths & weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (categoryRatings.def.avg > 75) strengths.push('Крепкая оборона 🛡️');
    if (categoryRatings.mid.avg > 75) strengths.push('Мощная полузащита ⚡');
    if (categoryRatings.att.avg > 75) strengths.push('Голевая угроза ⚽');
    if (categoryRatings.gk.avg > 75) strengths.push('Надёжный вратарь 🧤');

    const categoryNames: Record<PositionCategory, string> = {
      gk: 'вратарь',
      def: 'защита',
      mid: 'полузащита',
      att: 'атака',
    };
    for (const cat of categories) {
      if (categoryRatings[cat].avg > 0 && categoryRatings[cat].avg < 68) {
        weaknesses.push(`Слабое звено: ${categoryNames[cat]} ⚠️`);
      }
    }

    // If no strengths found, add a generic one
    if (strengths.length === 0 && overall >= 70) {
      strengths.push('Сбалансированный состав ⚖️');
    }

    return {
      overall,
      categoryRatings,
      chemistryScore,
      strengths,
      weaknesses,
      filledCount,
    };
  }, [slots, isPrimeMode]);

  const prediction = getPrediction(stats.overall);

  // Animated values
  const animatedOverall = useAnimatedValue(stats.overall, 1000, 300);
  const animatedChemistry = useAnimatedValue(stats.chemistryScore, 1000, 500);
  const animatedCategoryAvgs: Record<PositionCategory, number> = {
    gk: useAnimatedValue(stats.categoryRatings.gk.avg, 800, 400),
    def: useAnimatedValue(stats.categoryRatings.def.avg, 800, 500),
    mid: useAnimatedValue(stats.categoryRatings.mid.avg, 800, 600),
    att: useAnimatedValue(stats.categoryRatings.att.avg, 800, 700),
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    await simulate(currentManager);
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-5xl mb-3"
        >
          📋
        </motion.div>
        <h2 className="text-2xl font-black text-[#FFFFFF]">Разведка перед матчем</h2>
        <p className="text-sm text-[#9CA3AF] mt-1">Анализ состава перед сезоном</p>
      </motion.div>

      {/* Squad Rating & Chemistry */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="rounded-2xl bg-[#141414] p-5 text-center border border-[#141414]"
        >
          <div className="text-4xl font-black text-[#FFFFFF]">{animatedOverall}</div>
          <div className="text-sm text-[#9CA3AF] mt-1">Рейтинг</div>
          <div className="text-xs text-[#9CA3AF]/60 mt-0.5">{stats.filledCount}/11</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
          className="rounded-2xl bg-[#141414] p-5 text-center border border-[#141414]"
        >
          <div className="relative w-14 h-14 mx-auto">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#141414"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={stats.chemistryScore >= 80 ? '#00C896' : stats.chemistryScore >= 60 ? '#3b82f6' : stats.chemistryScore >= 40 ? '#f97316' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${animatedChemistry}, 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black text-[#FFFFFF]">
                {Math.round(animatedChemistry)}
              </span>
            </div>
          </div>
          <div className="text-sm text-[#9CA3AF] mt-1">Химия</div>
        </motion.div>
      </div>

      {/* Category Rating Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-[#141414] p-4 space-y-3 border border-[#141414]"
      >
        <h4 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Рейтинг по линиям</h4>
        {(['gk', 'def', 'mid', 'att'] as PositionCategory[]).map((cat, i) => (
          <motion.div
            key={cat}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                <span className="text-sm font-medium" style={{ color: CATEGORY_COLORS[cat] }}>
                  {CATEGORY_LABELS[cat]}
                </span>
              </div>
              <span className="text-sm font-bold text-[#FFFFFF]">
                {animatedCategoryAvgs[cat] || '—'}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#0A0A0A] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max((stats.categoryRatings[cat].avg / 100) * 100, 0)}%` }}
                transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Manager Info */}
      {currentManager && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl bg-gradient-to-r from-[#8b5cf6]/10 to-[#8b5cf6]/5 p-4 border border-[#8b5cf6]/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#8b5cf6]/20 flex items-center justify-center shrink-0">
              <span className="text-xl">👨‍💼</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#9CA3AF]">Тренер</div>
              <div className="text-sm font-bold text-[#FFFFFF] truncate">{currentManager.name}</div>
              {currentManager.specialAbility && (
                <div className="text-[10px] text-[#8b5cf6] font-bold mt-0.5">
                  ✨ {currentManager.specialAbility}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-black text-[#8b5cf6]">{currentManager.rating}</div>
              <div className="text-[10px] text-[#9CA3AF]">рейтинг</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Prediction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="rounded-2xl bg-[#141414] p-5 text-center border border-[#141414]"
      >
        <div className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-2">Прогноз на сезон</div>
        <div className="text-3xl mb-2">{prediction.emoji}</div>
        <div className="text-xl font-black" style={{ color: prediction.color }}>
          {prediction.text}
        </div>
        <div className="text-xs text-[#9CA3AF] mt-1">
          На основе среднего рейтинга {stats.overall}
        </div>
      </motion.div>

      {/* Strengths & Weaknesses */}
      {(stats.strengths.length > 0 || stats.weaknesses.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-3"
        >
          {stats.strengths.length > 0 && (
            <div className="rounded-2xl bg-[#141414] p-4 border border-[#00C896]/20">
              <h4 className="text-xs font-bold text-[#00C896] uppercase tracking-wider mb-2">
                ✅ Сильные стороны
              </h4>
              <div className="space-y-1.5">
                {stats.strengths.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className="text-sm text-[#FFFFFF]"
                  >
                    {s}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {stats.weaknesses.length > 0 && (
            <div className="rounded-2xl bg-[#141414] p-4 border border-[#ef4444]/20">
              <h4 className="text-xs font-bold text-[#ef4444] uppercase tracking-wider mb-2">
                ⚠️ Зоны риска
              </h4>
              <div className="space-y-1.5">
                {stats.weaknesses.map((w, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 + i * 0.1 }}
                    className="text-sm text-[#FFFFFF]"
                  >
                    {w}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Simulate Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <Button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="w-full h-16 text-lg font-black bg-gradient-to-r from-[#00C896] to-[#00A67A] hover:from-[#00A67A] hover:to-[#15803d] text-white rounded-2xl shadow-lg shadow-[#00C896]/25 transition-all hover:shadow-[#00C896]/40 disabled:opacity-50"
        >
          {isSimulating ? (
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⚽
              </motion.div>
              <span>Симуляция...</span>
            </div>
          ) : (
            'Сыграть сезон ▶'
          )}
        </Button>
      </motion.div>
    </div>
  );
}
