'use client';

import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { getNationalityFlag, isForeignPlayer } from '@/lib/nationality';
import { motion } from 'framer-motion';

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
  mid: '⚽',
  att: '🎯',
};

function getChemistryLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'Отличная химия!', color: '#22c55e' };
  if (score >= 60) return { text: 'Хорошая химия', color: '#3b82f6' };
  if (score >= 40) return { text: 'Средняя химия', color: '#f97316' };
  return { text: 'Нужна доработка', color: '#ef4444' };
}

export default function SquadStats() {
  const { slots, currentSpin } = useGameStore();

  // Calculate ratings by category
  const categories: PositionCategory[] = ['gk', 'def', 'mid', 'att'];
  const categoryRatings: Record<PositionCategory, { avg: number; count: number }> = {
    gk: { avg: 0, count: 0 },
    def: { avg: 0, count: 0 },
    mid: { avg: 0, count: 0 },
    att: { avg: 0, count: 0 },
  };

  let totalRating = 0;
  let filledCount = 0;

  slots.forEach((slot) => {
    const cat = POSITION_CATEGORY[slot.position as Position] ?? 'mid' as PositionCategory;
    if (slot.playerRating !== undefined) {
      const rating = slot.isCompatible ? slot.playerRating : Math.round(slot.playerRating * 0.8);
      categoryRatings[cat].avg += rating;
      categoryRatings[cat].count++;
      totalRating += rating;
      filledCount++;
    }
  });

  // Calculate averages
  const overall = filledCount > 0 ? Math.round((totalRating / filledCount) * 10) / 10 : 0;
  for (const cat of categories) {
    if (categoryRatings[cat].count > 0) {
      categoryRatings[cat].avg = Math.round((categoryRatings[cat].avg / categoryRatings[cat].count) * 10) / 10;
    }
  }

  // Calculate chemistry score (0-100)
  const chemistryScore = (() => {
    let score = 50; // base

    // Compatible positions bonus (all compatible = +20)
    const allCompatible = slots.every(s => !s.playerId || s.isCompatible !== false);
    if (allCompatible) score += 20;
    
    // Position balance bonus (+10 for having all categories filled)
    const allFilled = categories.every(c => categoryRatings[c].count > 0);
    if (allFilled) score += 10;

    // Rating quality bonus
    if (overall >= 78) score += 15;
    else if (overall >= 73) score += 10;
    else if (overall >= 68) score += 5;

    return Math.min(100, score);
  })();

  const chemistry = getChemistryLabel(chemistryScore);

  return (
    <div className="space-y-4">
      {/* Rating & Chemistry */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="rounded-2xl bg-[#0d2d0d] p-5 text-center border border-[#0d2d0d] card-glow"
        >
          <div className="text-4xl font-black text-[#e2e8f0]">{overall}</div>
          <div className="text-sm font-bold text-[#e2e8f0] mt-1">Рейтинг</div>
          <div className="text-xs text-[#94a3b8]/60 mt-0.5">{filledCount}/11 заполнено</div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="rounded-2xl bg-[#0d2d0d] p-5 text-center border border-[#0d2d0d] card-glow"
        >
          {/* Chemistry ring */}
          <div className="relative w-16 h-16 mx-auto">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#0d2d0d"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={chemistry.color}
                strokeWidth="3"
                strokeDasharray={`${chemistryScore}, 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black" style={{ color: chemistry.color }}>
                {chemistryScore}
              </span>
            </div>
          </div>
          <div className="text-sm text-[#94a3b8] mt-1">Химия</div>
          <div className="text-[10px] font-bold mt-0.5" style={{ color: chemistry.color }}>
            {chemistry.text}
          </div>
        </motion.div>
      </div>

      {/* Category Ratings with animated bars */}
      <div className="rounded-2xl bg-[#0d2d0d] p-4 space-y-3 border border-[#0d2d0d]">
        <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Рейтинг по линиям</h4>
        {categories.map((cat, i) => (
          <motion.div
            key={cat}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
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
                {categoryRatings[cat].avg || '—'}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#0a1a0a] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max((categoryRatings[cat].avg / 100) * 100, 0)}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 + 0.3 }}
                className="h-full rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Player list summary */}
      <div className="rounded-2xl bg-[#0d2d0d] p-4 border border-[#0d2d0d]">
        <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Состав</h4>
        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
          {slots.filter(s => s.playerId).map((slot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#0a1a0a]/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e]">
                  {slot.positionLabel}
                </span>
                <span className="text-xs font-medium text-[#e2e8f0]">
                  {isForeignPlayer(slot.playerNationality)
                    ? slot.playerName
                    : (slot.playerLastName || slot.playerName)}
                  {getNationalityFlag(slot.playerNationality) && (
                    <span className="ml-1">{getNationalityFlag(slot.playerNationality)}</span>
                  )}
                </span>
              </div>
              <span className="text-xs font-bold text-[#94a3b8]">
                {slot.playerRating}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
