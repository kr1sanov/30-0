'use client';

import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';

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

export default function SquadStats() {
  const { slots } = useGameStore();

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

  return (
    <div className="rounded-xl bg-[#1a1a2e] p-4 space-y-4">
      {/* Overall Rating */}
      <div className="text-center">
        <div className="text-4xl font-black text-[#e2e8f0]">{overall}</div>
        <div className="text-sm text-[#94a3b8]">Общий рейтинг</div>
      </div>

      {/* Category Ratings */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: CATEGORY_COLORS[cat] }}>
                {CATEGORY_LABELS[cat]}
              </span>
              <span className="text-sm font-bold text-[#e2e8f0]">
                {categoryRatings[cat].avg || '—'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#0a0a0f] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(categoryRatings[cat].avg / 100) * 100}%`,
                  backgroundColor: CATEGORY_COLORS[cat],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Filled count */}
      <div className="text-center text-xs text-[#94a3b8]">
        Заполнено: {filledCount}/11
      </div>
    </div>
  );
}
