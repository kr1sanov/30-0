'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { POSITION_CATEGORY } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { useTelegram } from '@/hooks/use-telegram';
import { Metrics } from '@/lib/metrics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Award {
  emoji: string;
  title: string;
  playerName: string;
  position: string;
  rating: number;
  category: PositionCategory;
  subtitle?: string;
  statLine?: string; // e.g., "15 голов" or "10 сухих матчей"
}

// ---------------------------------------------------------------------------
// Position category colors & gradients
// ---------------------------------------------------------------------------

const CATEGORY_BG: Record<PositionCategory, string> = {
  gk: 'from-[#f97316]/10 to-[#f97316]/5',
  def: 'from-[#3b82f6]/10 to-[#3b82f6]/5',
  mid: 'from-[#00C896]/10 to-[#00C896]/5',
  att: 'from-[#ef4444]/10 to-[#ef4444]/5',
};

const CATEGORY_BORDER: Record<PositionCategory, string> = {
  gk: 'border-[#f97316]/20',
  def: 'border-[#3b82f6]/20',
  mid: 'border-[#00C896]/20',
  att: 'border-[#ef4444]/20',
};

const CATEGORY_TEXT: Record<PositionCategory, string> = {
  gk: 'text-[#f97316]',
  def: 'text-[#3b82f6]',
  mid: 'text-[#00C896]',
  att: 'text-[#ef4444]',
};

const POSITION_LABELS: Record<string, string> = {
  'ВР': 'Вратарь',
  'ЦЗ': 'Центр. защитник',
  'ПЗ': 'Прав. защитник',
  'ЛЗ': 'Лев. защитник',
  'ПФЗ': 'Прав. фланг. защитник',
  'ЛФЗ': 'Лев. фланг. защитник',
  'ОП': 'Опор. полузащитник',
  'ЦП': 'Центр. полузащитник',
  'АП': 'Атак. полузащитник',
  'ЛП': 'Лев. полузащитник',
  'ПП': 'Прав. полузащитник',
  'ЛВ': 'Лев. вингер',
  'ПВ': 'Прав. вингер',
  'НП': 'Нападающий',
  'ЦН': 'Центр. нападающий',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SeasonAwards() {
  const { slots, currentManager, seasonResult, resetGame, setScreen, config } = useGameStore();
  const { haptic, notify } = useTelegram();

  // Track title earned in Metrika (once on mount)
  useMemo(() => { Metrics.titleEarned('season_complete'); }, []);

  const isPrimeMode = config.ratingMode === 'prime';

  // Compute awards from squad data and season result
  const awards = useMemo<Award[]>(() => {
    const filledSlots = slots.filter((s) => s.playerId && s.playerRating !== undefined);

    if (filledSlots.length === 0) return [];

    // Helper to get effective rating based on ratingMode
    const getEffectiveRating = (s: typeof filledSlots[number]) =>
      isPrimeMode && s.playerPrimeRating ? s.playerPrimeRating : (s.playerRating ?? 0);

    // Categorize players
    const byCategory: Record<PositionCategory, typeof filledSlots> = {
      gk: [],
      def: [],
      mid: [],
      att: [],
    };

    for (const slot of filledSlots) {
      const cat = POSITION_CATEGORY[slot.position as Position] ?? 'mid';
      byCategory[cat].push(slot);
    }

    const result: Award[] = [];

    // MVP — highest rated player in squad
    const mvp = [...filledSlots].sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a))[0];
    if (mvp) {
      result.push({
        emoji: '🏆',
        title: 'MVP сезона',
        playerName: mvp.playerName ?? '—',
        position: mvp.position,
        rating: getEffectiveRating(mvp),
        category: POSITION_CATEGORY[mvp.position as Position] ?? 'mid',
        subtitle: 'Лучший игрок состава',
      });
    }

    // Best Striker — highest rated forward (with simulated goal attribution)
    const bestAtt = [...byCategory.att].sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a))[0];
    if (bestAtt) {
      // Simulate goals based on rating
      const simulatedGoals = Math.round(getEffectiveRating(bestAtt) * 0.25 + Math.random() * 5);
      result.push({
        emoji: '⚽',
        title: 'Лучший нападающий',
        playerName: bestAtt.playerName ?? '—',
        position: bestAtt.position,
        rating: getEffectiveRating(bestAtt),
        category: 'att',
        subtitle: 'Голевая угроза',
        statLine: `${simulatedGoals} голов`,
      });
    }

    // Best Defender — highest rated defender
    const bestDef = [...byCategory.def].sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a))[0];
    if (bestDef) {
      const cleanSheets = Math.round(getEffectiveRating(bestDef) * 0.15 + Math.random() * 3);
      result.push({
        emoji: '🛡️',
        title: 'Лучший защитник',
        playerName: bestDef.playerName ?? '—',
        position: bestDef.position,
        rating: getEffectiveRating(bestDef),
        category: 'def',
        subtitle: 'Стена на пути атаки',
        statLine: `${cleanSheets} сухих`,
      });
    }

    // Best Goalkeeper — highest rated goalkeeper
    const bestGk = [...byCategory.gk].sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a))[0];
    if (bestGk) {
      const saves = Math.round(getEffectiveRating(bestGk) * 0.4 + Math.random() * 10);
      result.push({
        emoji: '🧤',
        title: 'Лучший вратарь',
        playerName: bestGk.playerName ?? '—',
        position: bestGk.position,
        rating: getEffectiveRating(bestGk),
        category: 'gk',
        subtitle: 'Надёжный страж ворот',
        statLine: `${saves} сэйвов`,
      });
    }

    // Best Midfielder — highest rated midfielder
    const bestMid = [...byCategory.mid].sort((a, b) => getEffectiveRating(b) - getEffectiveRating(a))[0];
    if (bestMid) {
      const assists = Math.round(getEffectiveRating(bestMid) * 0.2 + Math.random() * 4);
      result.push({
        emoji: '🎯',
        title: 'Лучший полузащитник',
        playerName: bestMid.playerName ?? '—',
        position: bestMid.position,
        rating: getEffectiveRating(bestMid),
        category: 'mid',
        subtitle: 'Мотор команды',
        statLine: `${assists} передач`,
      });
    }

    // Season Discovery — lowest rated player who was selected
    const discovery = [...filledSlots].sort((a, b) => getEffectiveRating(a) - getEffectiveRating(b))[0];
    if (discovery) {
      result.push({
        emoji: '💎',
        title: 'Открытие сезона',
        playerName: discovery.playerName ?? '—',
        position: discovery.position,
        rating: getEffectiveRating(discovery),
        category: POSITION_CATEGORY[discovery.position as Position] ?? 'mid',
        subtitle: 'Самый недооценённый',
      });
    }

    return result;
  }, [slots, isPrimeMode]);

  // Manager bonus award
  const managerAward = useMemo(() => {
    if (!currentManager) return null;
    return {
      emoji: '👨‍💼',
      title: 'Лучший тренер',
      playerName: currentManager.name,
      rating: currentManager.rating,
      specialAbility: currentManager.specialAbility,
    };
  }, [currentManager]);

  // Season result info
  const seasonInfo = useMemo(() => {
    const r = seasonResult as Record<string, unknown> | null;
    if (!r) return null;
    return {
      position: r.position as number,
      points: r.points as number,
      wins: r.wins as number,
    };
  }, [seasonResult]);

  // Count earned trophies
  const trophyCount = useMemo(() => {
    const r = seasonResult as { trophies?: Array<{ earned: boolean }> } | null;
    if (!r?.trophies) return { earned: 0, total: 0 };
    return {
      earned: r.trophies.filter(t => t.earned).length,
      total: r.trophies.length,
    };
  }, [seasonResult]);

  return (
    <div className="space-y-6 pb-4">
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
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="text-5xl mb-3"
        >
          🏆
        </motion.div>
        <h2 className="text-2xl font-black text-[#FFFFFF]">Награды сезона</h2>
        <p className="text-sm text-[#9CA3AF] mt-1">
          {seasonInfo
            ? `${seasonInfo.position}-е место · ${seasonInfo.points} очков · ${seasonInfo.wins} побед`
            : 'Итоги выступления команды'}
        </p>
        {trophyCount.total > 0 && (
          <p className="text-xs text-[#00C896] mt-1">
            🏅 {trophyCount.earned}/{trophyCount.total} трофеев
          </p>
        )}
      </motion.div>

      {/* Awards Grid */}
      <div className="space-y-3">
        {awards.map((award, index) => (
          <motion.div
            key={award.title}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: 0.3 + index * 0.2,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className={`rounded-2xl bg-gradient-to-r ${CATEGORY_BG[award.category]} p-4 border ${CATEGORY_BORDER[award.category]} relative overflow-hidden`}
          >
            {/* Background glow */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: `radial-gradient(circle at 10% 50%, ${
                  award.category === 'gk'
                    ? '#f97316'
                    : award.category === 'def'
                    ? '#3b82f6'
                    : award.category === 'mid'
                    ? '#00C896'
                    : '#ef4444'
                } 0%, transparent 50%)`,
              }}
            />

            <div className="relative z-10 flex items-center gap-4">
              {/* Emoji */}
              <div className="w-14 h-14 rounded-xl bg-[#0A0A0A]/50 flex items-center justify-center shrink-0">
                <span className="text-3xl">{award.emoji}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#FFFFFF]">{award.title}</div>
                <div className="text-lg font-black text-[#FFFFFF] mt-0.5 truncate">
                  {award.playerName}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0A0A0A]/50 ${CATEGORY_TEXT[award.category]}`}
                  >
                    {POSITION_LABELS[award.position] ?? award.position}
                  </span>
                  {award.subtitle && (
                    <span className="text-[10px] text-[#9CA3AF]">{award.subtitle}</span>
                  )}
                  {award.statLine && (
                    <span className={`text-[10px] font-bold ${CATEGORY_TEXT[award.category]}`}>
                      {award.statLine}
                    </span>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="text-right shrink-0">
                <div className={`text-3xl font-black ${CATEGORY_TEXT[award.category]}`}>
                  {award.rating}
                </div>
                <div className="text-[10px] text-[#9CA3AF]">рейтинг</div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Manager Award */}
        {managerAward && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: 0.3 + awards.length * 0.2,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="rounded-2xl bg-gradient-to-r from-[#8b5cf6]/10 to-[#8b5cf6]/5 p-4 border border-[#8b5cf6]/20 relative overflow-hidden"
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: 'radial-gradient(circle at 10% 50%, #8b5cf6 0%, transparent 50%)',
              }}
            />

            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#0A0A0A]/50 flex items-center justify-center shrink-0">
                <span className="text-3xl">{managerAward.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#FFFFFF]">{managerAward.title}</div>
                <div className="text-lg font-black text-[#FFFFFF] mt-0.5 truncate">
                  {managerAward.playerName}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0A0A0A]/50 text-[#8b5cf6]">
                    Тренер
                  </span>
                  {managerAward.specialAbility && (
                    <span className="text-[10px] text-[#9CA3AF]">
                      {managerAward.specialAbility}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-black text-[#8b5cf6]">{managerAward.rating}</div>
                <div className="text-[10px] text-[#9CA3AF]">рейтинг</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + (awards.length + (managerAward ? 1 : 0)) * 0.2 + 0.3 }}
        className="space-y-3 pt-2"
      >
        <Button
          onClick={() => {
            haptic('light');
            resetGame();
            setScreen('home');
          }}
          className="w-full h-14 text-base font-black bg-[#00C896] hover:bg-[#00A67A] text-white rounded-2xl shadow-lg shadow-[#00C896]/25 transition-all hover:shadow-[#00C896]/40"
        >
          🏠 На главную
        </Button>
        <Button
          onClick={() => { haptic('light'); setScreen('profile'); }}
          variant="outline"
          className="w-full h-11 rounded-xl border-[#1E1E1E] text-[#9CA3AF] hover:bg-[#141414] hover:text-[#FFFFFF]"
        >
          👤 Профиль
        </Button>
      </motion.div>
    </div>
  );
}
