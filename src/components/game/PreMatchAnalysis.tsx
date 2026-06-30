'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  POSITION_CATEGORY,
  POSITION_COLOR,
  getFormationById,
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
  mid: '#22c55e',
  att: '#ef4444',
};

const CATEGORY_ICONS: Record<PositionCategory, string> = {
  gk: '🧤',
  def: '🛡️',
  mid: '⚡',
  att: '⚽',
};

// ---------------------------------------------------------------------------
// Formation pitch layout for mini visualization
// ---------------------------------------------------------------------------

const FORMATION_LAYOUTS: Record<string, { row: number; col: number }[]> = {
  '4-3-3': [
    { row: 90, col: 50 },
    { row: 70, col: 20 }, { row: 70, col: 40 }, { row: 70, col: 60 }, { row: 70, col: 80 },
    { row: 50, col: 25 }, { row: 50, col: 50 }, { row: 50, col: 75 },
    { row: 25, col: 20 }, { row: 25, col: 50 }, { row: 25, col: 80 },
  ],
  '4-4-2': [
    { row: 90, col: 50 },
    { row: 70, col: 20 }, { row: 70, col: 40 }, { row: 70, col: 60 }, { row: 70, col: 80 },
    { row: 45, col: 20 }, { row: 45, col: 40 }, { row: 45, col: 60 }, { row: 45, col: 80 },
    { row: 22, col: 35 }, { row: 22, col: 65 },
  ],
  '4-2-3-1': [
    { row: 90, col: 50 },
    { row: 70, col: 20 }, { row: 70, col: 40 }, { row: 70, col: 60 }, { row: 70, col: 80 },
    { row: 53, col: 35 }, { row: 53, col: 65 },
    { row: 35, col: 20 }, { row: 35, col: 50 }, { row: 35, col: 80 },
    { row: 18, col: 50 },
  ],
  '3-5-2': [
    { row: 90, col: 50 },
    { row: 70, col: 25 }, { row: 70, col: 50 }, { row: 70, col: 75 },
    { row: 48, col: 10 }, { row: 48, col: 35 }, { row: 48, col: 50 }, { row: 48, col: 65 }, { row: 48, col: 90 },
    { row: 22, col: 35 }, { row: 22, col: 65 },
  ],
  '3-4-3': [
    { row: 90, col: 50 },
    { row: 70, col: 25 }, { row: 70, col: 50 }, { row: 70, col: 75 },
    { row: 45, col: 20 }, { row: 45, col: 40 }, { row: 45, col: 60 }, { row: 45, col: 80 },
    { row: 22, col: 20 }, { row: 22, col: 50 }, { row: 22, col: 80 },
  ],
  '5-3-2': [
    { row: 90, col: 50 },
    { row: 68, col: 10 }, { row: 68, col: 30 }, { row: 68, col: 50 }, { row: 68, col: 70 }, { row: 68, col: 90 },
    { row: 45, col: 25 }, { row: 45, col: 50 }, { row: 45, col: 75 },
    { row: 22, col: 35 }, { row: 22, col: 65 },
  ],
  '5-4-1': [
    { row: 90, col: 50 },
    { row: 68, col: 10 }, { row: 68, col: 30 }, { row: 68, col: 50 }, { row: 68, col: 70 }, { row: 68, col: 90 },
    { row: 42, col: 20 }, { row: 42, col: 40 }, { row: 42, col: 60 }, { row: 42, col: 80 },
    { row: 20, col: 50 },
  ],
  '4-1-4-1': [
    { row: 90, col: 50 },
    { row: 70, col: 20 }, { row: 70, col: 40 }, { row: 70, col: 60 }, { row: 70, col: 80 },
    { row: 55, col: 50 },
    { row: 38, col: 20 }, { row: 38, col: 40 }, { row: 38, col: 60 }, { row: 38, col: 80 },
    { row: 18, col: 50 },
  ],
  '4-5-1': [
    { row: 90, col: 50 },
    { row: 70, col: 20 }, { row: 70, col: 40 }, { row: 70, col: 60 }, { row: 70, col: 80 },
    { row: 42, col: 15 }, { row: 42, col: 35 }, { row: 42, col: 50 }, { row: 42, col: 65 }, { row: 42, col: 85 },
    { row: 18, col: 50 },
  ],
  '4-4-1-1': [
    { row: 90, col: 50 },
    { row: 70, col: 20 }, { row: 70, col: 40 }, { row: 70, col: 60 }, { row: 70, col: 80 },
    { row: 48, col: 20 }, { row: 48, col: 40 }, { row: 48, col: 60 }, { row: 48, col: 80 },
    { row: 30, col: 50 },
    { row: 16, col: 50 },
  ],
  '3-4-1-2': [
    { row: 90, col: 50 },
    { row: 70, col: 25 }, { row: 70, col: 50 }, { row: 70, col: 75 },
    { row: 48, col: 20 }, { row: 48, col: 40 }, { row: 48, col: 60 }, { row: 48, col: 80 },
    { row: 30, col: 50 },
    { row: 16, col: 35 }, { row: 16, col: 65 },
  ],
  '4-2-2-2': [
    { row: 90, col: 50 },
    { row: 70, col: 20 }, { row: 70, col: 40 }, { row: 70, col: 60 }, { row: 70, col: 80 },
    { row: 52, col: 35 }, { row: 52, col: 65 },
    { row: 35, col: 35 }, { row: 35, col: 65 },
    { row: 16, col: 35 }, { row: 16, col: 65 },
  ],
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
  if (avgRating >= 75) return { text: 'Борьба за чемпионство', color: '#22c55e', emoji: '🏆' };
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
      const rating = slot.isCompatible ? (slot.playerRating ?? 0) : Math.round((slot.playerRating ?? 0) * 0.8);
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
  }, [slots]);

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

  // Formation layout
  const formation = getFormationById(config.formation);
  const layout = formation ? (FORMATION_LAYOUTS[formation.id] ?? FORMATION_LAYOUTS['4-3-3']) : FORMATION_LAYOUTS['4-3-3'];

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
        <h2 className="text-2xl font-black text-[#e2e8f0]">Разведка перед матчем</h2>
        <p className="text-sm text-[#94a3b8] mt-1">Анализ состава перед сезоном</p>
      </motion.div>

      {/* Formation Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#e2e8f0]">Расстановка</h3>
          <span className="text-xs font-bold px-2 py-1 rounded-md bg-[#22c55e]/15 text-[#22c55e]">
            {config.formation}
          </span>
        </div>
        <div className="relative w-full aspect-[3/4] max-w-[280px] mx-auto rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0d3320 0%, #0a4a2a 40%, #0d3320 100%)',
          }}
        >
          {/* Pitch lines */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/10" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
            {/* Center spot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
            {/* Penalty areas */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[12%] border-b border-x border-white/10" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[12%] border-t border-x border-white/10" />
          </div>

          {/* Player dots */}
          {slots.map((slot, idx) => {
            const pos = layout[idx];
            if (!pos) return null;
            const cat = POSITION_CATEGORY[slot.position as Position] ?? 'mid';
            const color = POSITION_COLOR[cat];
            const hasPlayer = !!slot.playerId;

            return (
              <div
                key={idx}
                className="absolute flex flex-col items-center"
                style={{
                  top: `${pos.row}%`,
                  left: `${pos.col}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-bold border-2"
                  style={{
                    backgroundColor: hasPlayer ? `${color}30` : '#0a0a0f50',
                    borderColor: hasPlayer ? color : '#ffffff20',
                    color: hasPlayer ? '#fff' : '#ffffff40',
                  }}
                >
                  {slot.positionLabel}
                </div>
                {hasPlayer && slot.playerRating && (
                  <div
                    className="text-[7px] font-bold mt-0.5"
                    style={{ color }}
                  >
                    {slot.playerRating}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Squad Rating & Chemistry */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="rounded-2xl bg-[#1a1a2e] p-5 text-center border border-[#1a1a2e]"
        >
          <div className="text-4xl font-black text-[#e2e8f0]">{animatedOverall}</div>
          <div className="text-sm text-[#94a3b8] mt-1">Общий рейтинг</div>
          <div className="text-xs text-[#94a3b8]/60 mt-0.5">{stats.filledCount}/11</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
          className="rounded-2xl bg-[#1a1a2e] p-5 text-center border border-[#1a1a2e]"
        >
          <div className="relative w-14 h-14 mx-auto">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#1a1a2e"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={stats.chemistryScore >= 80 ? '#22c55e' : stats.chemistryScore >= 60 ? '#3b82f6' : stats.chemistryScore >= 40 ? '#f97316' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${animatedChemistry}, 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black text-[#e2e8f0]">
                {Math.round(animatedChemistry)}
              </span>
            </div>
          </div>
          <div className="text-sm text-[#94a3b8] mt-1">Химия</div>
        </motion.div>
      </div>

      {/* Category Rating Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-[#1a1a2e] p-4 space-y-3 border border-[#1a1a2e]"
      >
        <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Рейтинг по линиям</h4>
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
              <span className="text-sm font-bold text-[#e2e8f0]">
                {animatedCategoryAvgs[cat] || '—'}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#0a0a0f] overflow-hidden">
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
              <div className="text-xs text-[#94a3b8]">Тренер</div>
              <div className="text-sm font-bold text-[#e2e8f0] truncate">{currentManager.name}</div>
              {currentManager.specialAbility && (
                <div className="text-[10px] text-[#8b5cf6] font-bold mt-0.5">
                  ✨ {currentManager.specialAbility}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-black text-[#8b5cf6]">{currentManager.rating}</div>
              <div className="text-[10px] text-[#94a3b8]">рейтинг</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Prediction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="rounded-2xl bg-[#1a1a2e] p-5 text-center border border-[#1a1a2e]"
      >
        <div className="text-xs text-[#94a3b8] uppercase tracking-wider mb-2">Прогноз на сезон</div>
        <div className="text-3xl mb-2">{prediction.emoji}</div>
        <div className="text-xl font-black" style={{ color: prediction.color }}>
          {prediction.text}
        </div>
        <div className="text-xs text-[#94a3b8] mt-1">
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
            <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#22c55e]/20">
              <h4 className="text-xs font-bold text-[#22c55e] uppercase tracking-wider mb-2">
                ✅ Сильные стороны
              </h4>
              <div className="space-y-1.5">
                {stats.strengths.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className="text-sm text-[#e2e8f0]"
                  >
                    {s}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {stats.weaknesses.length > 0 && (
            <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#ef4444]/20">
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
                    className="text-sm text-[#e2e8f0]"
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
          className="w-full h-16 text-lg font-black bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25 transition-all hover:shadow-[#22c55e]/40 disabled:opacity-50"
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
