'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfettiPiece {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

interface MatchDetail {
  matchday: number;
  opponent: string;
  isHome: boolean;
  homeGoals: number;
  awayGoals: number;
  result: 'W' | 'D' | 'L';
}

// ---------------------------------------------------------------------------
// RPL Club Color Mapping
// ---------------------------------------------------------------------------

const CLUB_COLORS: Record<string, string> = {
  'Зенит': '#0096E6',
  'Спартак': '#E21A1A',
  'ЦСКА': '#1E3F7B',
  'Локомотив': '#CC0000',
  'Краснодар': '#1A1A1A',
  'Динамо М': '#2563EB',
  'Ростов': '#FFD700',
  'Рубин': '#8B0000',
  'Ахмат': '#228B22',
  'Урал': '#FF6600',
  'Оренбург': '#800080',
  'Факел': '#FF4444',
  'Крылья Советов': '#2E8B57',
  'Торпедо': '#1C1C1C',
  'Химки': '#FF2040',
  'Пари НН': '#B22222',
};

function getClubColor(name: string): string {
  return CLUB_COLORS[name] || '#64748b';
}

// ---------------------------------------------------------------------------
// Animated Counter Hook
// ---------------------------------------------------------------------------

function useAnimatedValue(target: number, duration: number = 800, delay: number = 0): number {
  const [current, setCurrent] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    // Reset if target changes to 0
    if (target === 0 && prevTargetRef.current !== 0) {
      prevTargetRef.current = 0;
    }
    prevTargetRef.current = target;

    if (target === 0) return;

    const delayTimeout = setTimeout(() => {
      startTimeRef.current = null;

      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(eased * target));

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
  }, [target]);

  return current;
}

// ---------------------------------------------------------------------------
// Position Badge Styles
// ---------------------------------------------------------------------------

function getPositionBadgeClasses(pos: number): {
  bg: string;
  text: string;
  border: string;
  glow: string;
  emoji: string;
} {
  if (pos === 1) {
    return {
      bg: 'bg-gradient-to-br from-yellow-400/30 via-yellow-500/20 to-yellow-600/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/40',
      glow: 'shadow-[0_0_30px_rgba(234,179,8,0.3)]',
      emoji: '🏆',
    };
  }
  if (pos === 2) {
    return {
      bg: 'bg-gradient-to-br from-slate-300/25 via-slate-400/15 to-slate-500/5',
      text: 'text-slate-300',
      border: 'border-slate-400/30',
      glow: 'shadow-[0_0_20px_rgba(148,163,184,0.2)]',
      emoji: '🥈',
    };
  }
  if (pos === 3) {
    return {
      bg: 'bg-gradient-to-br from-orange-400/25 via-orange-500/15 to-orange-600/5',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      glow: 'shadow-[0_0_20px_rgba(251,146,60,0.2)]',
      emoji: '🥉',
    };
  }
  if (pos <= 6) {
    return {
      bg: 'bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      glow: '',
      emoji: '🏟️',
    };
  }
  if (pos >= 14) {
    return {
      bg: 'bg-gradient-to-br from-red-500/20 via-red-600/10 to-transparent',
      text: 'text-red-400',
      border: 'border-red-500/20',
      glow: '',
      emoji: '⚠️',
    };
  }
  return {
    bg: 'bg-[#1a1a2e]',
    text: 'text-[#e2e8f0]',
    border: 'border-[#1a1a2e]',
    glow: '',
    emoji: '⚽',
  };
}

// ---------------------------------------------------------------------------
// Match Period Grouping
// ---------------------------------------------------------------------------

interface MatchPeriod {
  label: string;
  range: string;
  matches: MatchDetail[];
  points: number;
}

function groupMatchesByPeriod(matches: MatchDetail[]): MatchPeriod[] {
  const periods: MatchPeriod[] = [
    { label: 'Старт сезона', range: 'Туры 1–10', matches: [], points: 0 },
    { label: 'Середина сезона', range: 'Туры 11–20', matches: [], points: 0 },
    { label: 'Финиш сезона', range: 'Туры 21–30', matches: [], points: 0 },
  ];

  for (const m of matches) {
    const idx = m.matchday <= 10 ? 0 : m.matchday <= 20 ? 1 : 2;
    periods[idx].matches.push(m);
    if (m.result === 'W') periods[idx].points += 3;
    else if (m.result === 'D') periods[idx].points += 1;
  }

  return periods;
}

// ---------------------------------------------------------------------------
// Find best streak range (start, end)
// ---------------------------------------------------------------------------

function findBestStreakRange(matches: MatchDetail[]): { start: number; end: number } | null {
  let maxStreak = 0;
  let maxStart = 0;
  let maxEnd = 0;
  let currentStreak = 0;
  let currentStart = 0;

  for (let i = 0; i < matches.length; i++) {
    if (matches[i].result === 'W') {
      if (currentStreak === 0) currentStart = i;
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStart = currentStart;
        maxEnd = i;
      }
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak >= 3 ? { start: maxStart, end: maxEnd } : null;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SimulationResult() {
  const { seasonResult, resetGame, lastConfig, setConfig, setScreen } = useGameStore();
  const [showMatches, setShowMatches] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Live replay state
  const [isReplaying, setIsReplaying] = useState(false);
  const [revealedMatchCount, setRevealedMatchCount] = useState(0);
  const [replayComplete, setReplayComplete] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true });
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldConfetti = seasonResult
    ? ((seasonResult as { position: number }).position === 1 || (seasonResult as { wins: number }).wins === 30)
    : false;

  const isPerfectSeason = seasonResult
    ? ((seasonResult as { wins: number }).wins === 30 && (seasonResult as { draws: number }).draws === 0 && (seasonResult as { losses: number }).losses === 0)
    : false;

  const confetti = useMemo<ConfettiPiece[]>(() => {
    if (!shouldConfetti) return [];
    const emojis = isPerfectSeason
      ? ['🏆', '⭐', '🎉', '🔥', '💪', '🥇', '✨', '🎊', '👑', '💎', '🌟', '🎯']
      : ['🏆', '⭐', '🎉', '🔥', '💪', '🥇', '✨', '🎊'];
    const count = isPerfectSeason ? 40 : 24;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      x: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 1.5 + Math.random() * 3.5,
      size: isPerfectSeason ? (Math.random() > 0.5 ? 36 : 24) : 24,
    }));
  }, [shouldConfetti, isPerfectSeason]);

  const handleShare = useCallback(() => {
    if (!seasonResult) return;
    const r = seasonResult as { wins: number; draws: number; losses: number; points: number; position: number; formation: string; goalsFor: number; goalsAgainst: number; managerName?: string | null; players?: Array<{ name: string; position: string; rating: number }> };
    const posEmoji = r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : r.position === 3 ? '🥉' : '⚽';
    const bestPlayer = r.players && r.players.length > 0 ? [...(r.players || [])].sort((a, b) => b.rating - a.rating)[0] : null;
    const lines = [
      `${posEmoji} 30-0 RPL`,
      `📐 ${r.formation} · ${r.wins}В-${r.draws}Н-${r.losses}П`,
      `⭐ ${r.points} очков · ${r.position} место`,
      `⚽ ${r.goalsFor} забито · ${r.goalsAgainst} пропущено`,
    ];
    if (bestPlayer) {
      lines.push(`👑 Лучший: ${bestPlayer.name} (${bestPlayer.rating})`);
    }
    if (r.managerName) {
      lines.push(`👨‍💼 Тренер: ${r.managerName}`);
    }
    lines.push('#30п0 #РПЛ');
    const text = lines.join('\n');

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.openTelegramLink(
          `https://t.me/share/url?url=${encodeURIComponent('https://30-0.app')}&text=${encodeURIComponent(text)}`,
        );
        return;
      } catch {
        // fall through
      }
    }

    if (navigator.share) {
      navigator.share({ title: '30-0 RPL', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('📋 Результат скопирован!');
      }).catch(() => {});
    }
  }, [seasonResult]);

  const handleCopyResult = useCallback(() => {
    if (!seasonResult) return;
    const r = seasonResult as { wins: number; draws: number; losses: number; points: number; position: number; formation: string; goalsFor: number; goalsAgainst: number; managerName?: string | null; players?: Array<{ name: string; position: string; rating: number }> };
    const posEmoji = r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : r.position === 3 ? '🥉' : '⚽';
    const bestPlayer = r.players && r.players.length > 0 ? [...(r.players || [])].sort((a, b) => b.rating - a.rating)[0] : null;
    const lines = [
      `${posEmoji} 30-0 RPL`,
      `📐 Формация: ${r.formation}`,
      `📊 ${r.wins}В-${r.draws}Н-${r.losses}П · ${r.points} очков · ${r.position} место`,
      `⚽ Голы: ${r.goalsFor} забито / ${r.goalsAgainst} пропущено`,
    ];
    if (bestPlayer) {
      lines.push(`👑 Лучший игрок: ${bestPlayer.name} (${bestPlayer.rating})`);
    }
    if (r.managerName) {
      lines.push(`👨‍💼 Тренер: ${r.managerName}`);
    }
    lines.push('#30п0 #РПЛ');
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      toast.success('📋 Результат скопирован!');
    }).catch(() => {
      toast.error('Не удалось скопировать');
    });
  }, [seasonResult]);

  // Calculate win streak
  const matches = (seasonResult as { matches?: MatchDetail[] } | null)?.matches || [];
  const winStreak = useMemo(() => {
    let max = 0;
    let current = 0;
    for (const m of matches) {
      if (m.result === 'W') {
        current++;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    }
    return max;
  }, [matches]);

  const bestStreakRange = useMemo(() => findBestStreakRange(matches), [matches]);

  // Calculate points accumulation for sparkline
  const pointsAccumulation = useMemo(() => {
    const acc: number[] = [];
    let total = 0;
    for (const m of matches) {
      if (m.result === 'W') total += 3;
      else if (m.result === 'D') total += 1;
      acc.push(total);
    }
    return acc;
  }, [matches]);

  // Group matches by period
  const periods = useMemo(() => groupMatchesByPeriod(matches), [matches]);

  // Live replay: running points
  const replayPoints = useMemo(() => {
    if (!isReplaying && revealedMatchCount === 0) return 0;
    let total = 0;
    const count = isReplaying ? revealedMatchCount : matches.length;
    for (let i = 0; i < count && i < matches.length; i++) {
      if (matches[i].result === 'W') total += 3;
      else if (matches[i].result === 'D') total += 1;
    }
    return total;
  }, [isReplaying, revealedMatchCount, matches]);

  // Animated counters
  const animatedWins = useAnimatedValue(
    (seasonResult as { wins?: number } | null)?.wins ?? 0, 800, 200,
  );
  const animatedDraws = useAnimatedValue(
    (seasonResult as { draws?: number } | null)?.draws ?? 0, 800, 350,
  );
  const animatedLosses = useAnimatedValue(
    (seasonResult as { losses?: number } | null)?.losses ?? 0, 800, 500,
  );
  const animatedPoints = useAnimatedValue(
    (seasonResult as { points?: number } | null)?.points ?? 0, 1000, 0,
  );

  // Live replay logic
  const startReplay = useCallback(() => {
    setRevealedMatchCount(0);
    setReplayComplete(false);
    setIsReplaying(true);
  }, []);

  const skipReplay = useCallback(() => {
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    setIsReplaying(false);
    setRevealedMatchCount(matches.length);
    setReplayComplete(true);
  }, [matches.length]);

  useEffect(() => {
    if (!isReplaying) return;
    if (revealedMatchCount >= matches.length) {
      setIsReplaying(false);
      setReplayComplete(true);
      return;
    }

    replayTimerRef.current = setTimeout(() => {
      setRevealedMatchCount((prev) => prev + 1);
    }, 200);

    return () => {
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    };
  }, [isReplaying, revealedMatchCount, matches.length]);

  // Quick replay with same settings
  const handleQuickReplay = useCallback(() => {
    if (lastConfig) {
      setConfig(lastConfig);
    }
    resetGame();
    // Navigate to setup so the user can confirm and start with the saved config
    setScreen('setup');
  }, [lastConfig, resetGame, setConfig, setScreen]);

  // Toggle period expansion
  const togglePeriod = useCallback((idx: number) => {
    setExpandedPeriods((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  if (!seasonResult) return null;

  const result = seasonResult as {
    wins: number;
    draws: number;
    losses: number;
    points: number;
    position: number;
    goalsFor: number;
    goalsAgainst: number;
    table: Array<{
      position: number;
      name: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
    }>;
    matches?: MatchDetail[];
    formation: string;
    difficulty: string;
    managerName?: string | null;
    managerRating?: number | null;
    squadRating?: number;
    players?: Array<{
      name: string;
      position: string;
      rating: number;
      isCompatible: boolean;
    }>;
  };

  const isChampion = result.position === 1;
  const isPerfect = result.wins === 30 && result.draws === 0 && result.losses === 0;
  const isUnbeaten = result.losses === 0;

  const getMedalColor = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    if (pos === 4) return '🏟️';
    return '';
  };

  const getPositionLabel = (pos: number): string => {
    if (pos === 1) return 'Чемпион';
    if (pos <= 3) return 'Призёр';
    if (pos <= 6) return 'Еврозона';
    if (pos <= 10) return 'Середина';
    return 'Зона вылета';
  };

  const getPositionColor = (pos: number): string => {
    if (pos === 1) return '#22c55e';
    if (pos <= 3) return '#3b82f6';
    if (pos <= 6) return '#8b5cf6';
    if (pos <= 10) return '#f97316';
    return '#ef4444';
  };

  const matchesList = result.matches || [];

  // Determine how many matches to show
  const displayMatchCount = isReplaying ? revealedMatchCount : matchesList.length;
  const displayMatches = matchesList.slice(0, displayMatchCount);

  // Build form dots for live replay
  const formDots = matchesList.slice(0, displayMatchCount);

  const badge = getPositionBadgeClasses(result.position);

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {/* Confetti for champions */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute"
              style={{ left: `${piece.x}%`, fontSize: piece.size }}
              initial={{ y: -50, opacity: 1, rotate: 0, scale: 1 }}
              animate={{
                y: '100vh',
                opacity: 0,
                rotate: isPerfectSeason ? 1080 : 720,
                scale: isPerfectSeason ? [1, 1.3, 1, 1.2, 0.8] : [1, 1.1, 1, 0.9],
              }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: 'easeIn',
              }}
            >
              {piece.emoji}
            </motion.div>
          ))}
        </div>
      )}

      {/* Enhanced Position Badge */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.1 }}
        className={`text-center py-6 rounded-2xl border ${badge.bg} ${badge.border} ${badge.glow}`}
      >
        <motion.div
          className="text-5xl mb-2"
          animate={result.position === 1 ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.6, delay: 0.5, repeat: result.position === 1 ? 2 : 0 }}
        >
          {badge.emoji}
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 10, delay: 0.3 }}
          className={`text-7xl font-black ${badge.text}`}
        >
          {result.position}
        </motion.div>
        <div className="text-sm font-bold text-[#e2e8f0] mt-1">
          {getPositionLabel(result.position)}
        </div>
        <div className="text-xs text-[#94a3b8] mt-0.5">место в таблице</div>

        {/* Live replay running points */}
        {isReplaying && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-2xl font-black text-[#22c55e]"
          >
            {replayPoints} очков
          </motion.div>
        )}
      </motion.div>

      {/* Manager info */}
      {result.managerName && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-[#1a1a2e] p-3 flex items-center gap-3 border border-[#22c55e]/20"
        >
          <div className="text-2xl">👨‍💼</div>
          <div className="flex-1">
            <div className="text-xs text-[#94a3b8]">Тренер</div>
            <div className="text-sm font-bold text-[#e2e8f0]">{result.managerName}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#94a3b8]">Рейтинг</div>
            <div className="text-sm font-bold text-[#22c55e]">{result.managerRating}</div>
          </div>
        </motion.div>
      )}

      {/* Animated Results Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]"
        >
          <div className="text-2xl font-black text-[#22c55e]">{animatedPoints}</div>
          <div className="text-xs text-[#94a3b8]">Очки</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]"
        >
          <div className="text-2xl font-black text-[#22c55e]">{animatedWins}</div>
          <div className="text-xs text-[#94a3b8]">Победы</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]"
        >
          <div className="text-2xl font-black text-[#f97316]">{animatedDraws}</div>
          <div className="text-xs text-[#94a3b8]">Ничьи</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]"
        >
          <div className="text-2xl font-black text-[#ef4444]">{animatedLosses}</div>
          <div className="text-xs text-[#94a3b8]">Поражения</div>
        </motion.div>
      </div>

      {/* Goals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-3xl font-black text-[#22c55e]">{result.goalsFor}</div>
          <div className="text-xs text-[#94a3b8]">Забито</div>
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-3xl font-black text-[#ef4444]">{result.goalsAgainst}</div>
          <div className="text-xs text-[#94a3b8]">Пропущено</div>
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className={`text-3xl font-black ${result.goalsFor - result.goalsAgainst > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {result.goalsFor - result.goalsAgainst > 0 ? '+' : ''}{result.goalsFor - result.goalsAgainst}
          </div>
          <div className="text-xs text-[#94a3b8]">Разница</div>
        </div>
      </div>

      {/* Extra stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-2xl font-black text-[#8b5cf6]">{winStreak}</div>
          <div className="text-xs text-[#94a3b8]">Лучшая серия побед</div>
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-2xl font-black text-[#3b82f6]">{result.squadRating || '-'}</div>
          <div className="text-xs text-[#94a3b8]">Рейтинг состава</div>
        </div>
      </div>

      {/* Enhanced Season Form Bar */}
      {matchesList.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Форма сезона</h4>
            {isReplaying && (
              <span className="text-xs font-bold text-[#22c55e]">Тур {displayMatchCount}/30</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 relative">
            {formDots.map((m, idx) => {
              const isStreak = bestStreakRange && idx >= bestStreakRange.start && idx <= bestStreakRange.end;
              return (
                <div
                  key={m.matchday}
                  className="relative"
                  onMouseEnter={() => setHoveredDot(idx)}
                  onMouseLeave={() => setHoveredDot(null)}
                >
                  <div
                    className={`w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-bold text-white cursor-default transition-transform ${
                      isStreak && !isReplaying ? 'animate-breathe' : ''
                    } ${isReplaying && idx === displayMatchCount - 1 ? 'scale-125' : ''}`}
                    style={{
                      backgroundColor:
                        m.result === 'W' ? '#22c55e' : m.result === 'D' ? '#f97316' : '#ef4444',
                    }}
                  >
                    {m.matchday}
                  </div>
                  {/* Hover tooltip */}
                  {hoveredDot === idx && (
                    <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 bg-[#0a0a0f] border border-[#334155] rounded-lg px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                      <div className="text-[#94a3b8]">Тур {m.matchday}</div>
                      <div className="text-[#e2e8f0] font-bold">
                        {m.isHome ? '🏠' : '✈️'} {m.homeGoals}-{m.awayGoals} vs {m.opponent}
                      </div>
                      <div
                        className={`font-bold ${
                          m.result === 'W'
                            ? 'text-[#22c55e]'
                            : m.result === 'D'
                            ? 'text-[#f97316]'
                            : 'text-[#ef4444]'
                        }`}
                      >
                        {m.result === 'W' ? 'Победа' : m.result === 'D' ? 'Ничья' : 'Поражение'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Empty dots for unrevealed matches during replay */}
            {isReplaying && matchesList.length > displayMatchCount && (
              <>
                {matchesList.slice(displayMatchCount).map((m) => (
                  <div
                    key={m.matchday}
                    className="w-5 h-5 rounded-sm bg-[#0a0a0f] border border-[#334155]/30 flex items-center justify-center text-[8px] text-[#334155]"
                  >
                    {m.matchday}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Points accumulation sparkline */}
      {pointsAccumulation.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Набранные очки</h4>
            <span className="text-xs font-bold text-[#22c55e]">
              {isReplaying ? replayPoints : result.points}
            </span>
          </div>
          <div className="relative h-16">
            <svg
              className="w-full h-full"
              viewBox={`0 0 ${pointsAccumulation.length - 1} 100`}
              preserveAspectRatio="none"
            >
              {[30, 60, 90].map((pts) => {
                const y = 100 - (pts / 90) * 100;
                return (
                  <line
                    key={pts}
                    x1="0"
                    y1={y}
                    x2={pointsAccumulation.length - 1}
                    y2={y}
                    stroke="#1a1a2e"
                    strokeWidth="2"
                  />
                );
              })}
              <path
                d={`M0 100 ${pointsAccumulation
                  .map((pts, i) => `L${i} ${100 - (pts / 90) * 100}`)
                  .join(' ')} L${pointsAccumulation.length - 1} 100 Z`}
                fill="url(#pointsGradient)"
                fillOpacity="0.3"
              />
              <path
                d={`M0 ${100 - (pointsAccumulation[0] / 90) * 100} ${pointsAccumulation
                  .map((pts, i) => `L${i} ${100 - (pts / 90) * 100}`)
                  .join(' ')}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={pointsAccumulation.length - 1}
                cy={100 - (pointsAccumulation[pointsAccumulation.length - 1] / 90) * 100}
                r="3"
                fill="#22c55e"
              />
              <defs>
                <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex justify-between text-[9px] text-[#94a3b8]/40 mt-1">
            <span>Тур 1</span>
            <span>Тур {pointsAccumulation.length}</span>
          </div>
        </div>
      )}

      {/* Season Replay Controls */}
      {matchesList.length > 0 && (
        <div className="flex gap-3">
          {!isReplaying && !replayComplete && (
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                onClick={startReplay}
                className="w-full h-12 text-sm font-bold bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl shadow-lg shadow-[#8b5cf6]/20 transition-all"
              >
                ▶️ Повтор сезона
              </Button>
            </motion.div>
          )}
          {isReplaying && (
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                onClick={skipReplay}
                className="w-full h-12 text-sm font-bold bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl shadow-lg shadow-[#f97316]/20 transition-all"
              >
                ⏭ Пропустить
              </Button>
            </motion.div>
          )}
          {replayComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1"
            >
              <Button
                onClick={startReplay}
                variant="outline"
                className="w-full h-12 text-sm font-bold border-[#8b5cf6]/40 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-xl"
              >
                🔄 Повторить анимацию
              </Button>
            </motion.div>
          )}
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button
              onClick={() => setShowMatches(!showMatches)}
              variant="outline"
              className="w-full h-12 text-sm font-bold border-[#94a3b8]/20 text-[#94a3b8] hover:bg-[#1a1a2e] rounded-xl hover:text-[#e2e8f0]"
            >
              📋 Все матчи
            </Button>
          </motion.div>
        </div>
      )}

      {/* Season Complete message after replay */}
      <AnimatePresence>
        {replayComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-center py-4 rounded-xl bg-gradient-to-r from-[#22c55e]/10 via-[#22c55e]/5 to-transparent border border-[#22c55e]/20"
          >
            <div className="text-lg font-black text-[#22c55e]">Сезон завершён!</div>
            <div className="text-xs text-[#94a3b8] mt-1">
              {result.wins}В-{result.draws}Н-{result.losses}П · {result.points} очков
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Replay Match-by-Match Animation */}
      <AnimatePresence>
        {(isReplaying || replayComplete) && !showMatches && displayMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-[#1a1a2e] border border-[#1a1a2e] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#0a0a0f]/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#e2e8f0]">🎬 Повтор сезона</span>
                <span className="text-xs text-[#94a3b8]">{displayMatchCount}/30 туров</span>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar px-3 py-2">
              <div className="space-y-1">
                {displayMatches.map((m, idx) => {
                  const resultClass =
                    m.result === 'W' ? 'match-win' : m.result === 'D' ? 'match-draw' : 'match-loss';
                  return (
                    <motion.div
                      key={m.matchday}
                      initial={isReplaying && idx === displayMatchCount - 1 ? { x: -30, opacity: 0 } : false}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center gap-2 p-2 rounded-lg ${resultClass} transition-colors`}
                    >
                      <span className="text-xs text-[#94a3b8] w-6 font-medium">{m.matchday}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          m.result === 'W'
                            ? 'bg-[#22c55e]/20 text-[#22c55e]'
                            : m.result === 'D'
                            ? 'bg-[#f97316]/20 text-[#f97316]'
                            : 'bg-[#ef4444]/20 text-[#ef4444]'
                        }`}
                      >
                        {m.result === 'W' ? 'В' : m.result === 'D' ? 'Н' : 'П'}
                      </span>
                      <span className="text-xs text-[#94a3b8] flex-1 text-right truncate">
                        {m.isHome ? '🏠' : '✈️'} {m.opponent}
                      </span>
                      <span className="text-sm font-bold text-[#e2e8f0]">
                        {m.homeGoals}:{m.awayGoals}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Match-by-Match view (grouped by period) */}
      {matchesList.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] border border-[#1a1a2e] overflow-hidden">
          <button
            onClick={() => setShowMatches(!showMatches)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#0a0a0f]/30 transition-colors"
          >
            <span className="text-sm font-bold text-[#e2e8f0]">📋 Матчи по турам</span>
            <motion.span animate={{ rotate: showMatches ? 180 : 0 }} className="text-[#94a3b8]">
              ▼
            </motion.span>
          </button>
          <AnimatePresence>
            {showMatches && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 max-h-[28rem] overflow-y-auto custom-scrollbar space-y-3">
                  {periods.map((period, pIdx) => (
                    <div key={pIdx} className="rounded-xl bg-[#0a0a0f]/20 overflow-hidden">
                      {/* Period header */}
                      <button
                        onClick={() => togglePeriod(pIdx)}
                        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[#0a0a0f]/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <motion.span
                            animate={{ rotate: expandedPeriods[pIdx] ? 90 : 0 }}
                            className="text-[10px] text-[#94a3b8]"
                          >
                            ▶
                          </motion.span>
                          <span className="text-xs font-bold text-[#94a3b8]">{period.range}</span>
                          <span className="text-[10px] text-[#94a3b8]/60">{period.label}</span>
                        </div>
                        <span className="text-xs font-bold text-[#22c55e]">{period.points} очков</span>
                      </button>

                      {/* Period matches */}
                      <AnimatePresence>
                        {expandedPeriods[pIdx] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-2 pb-2"
                          >
                            <div className="space-y-1">
                              {period.matches.map((m) => {
                                const resultClass =
                                  m.result === 'W'
                                    ? 'match-win'
                                    : m.result === 'D'
                                    ? 'match-draw'
                                    : 'match-loss';
                                const clubColor = getClubColor(m.opponent);
                                return (
                                  <motion.div
                                    key={m.matchday}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: m.matchday * 0.02 }}
                                    className={`flex items-center gap-2 p-2 rounded-lg ${resultClass} transition-colors hover:bg-[#0a0a0f]/30`}
                                  >
                                    {/* Tour number */}
                                    <span className="text-[10px] text-[#94a3b8] w-5 text-center font-medium">
                                      {m.matchday}
                                    </span>

                                    {/* Home/Away */}
                                    <span className="text-xs">{m.isHome ? '🏠' : '✈️'}</span>

                                    {/* Opponent with color dot */}
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                      <div
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: clubColor }}
                                      />
                                      <span className="text-xs font-medium text-[#e2e8f0] truncate">
                                        {m.opponent}
                                      </span>
                                    </div>

                                    {/* Score */}
                                    <span className="text-sm font-black tabular-nums">
                                      <span className={m.result === 'W' || (m.isHome && m.homeGoals > m.awayGoals) || (!m.isHome && m.awayGoals > m.homeGoals) ? 'text-[#22c55e]' : 'text-[#e2e8f0]'}>
                                        {m.isHome ? m.homeGoals : m.awayGoals}
                                      </span>
                                      <span className="text-[#94a3b8]">:</span>
                                      <span className={m.result === 'L' || (m.isHome && m.awayGoals > m.homeGoals) || (!m.isHome && m.homeGoals > m.awayGoals) ? 'text-[#ef4444]' : 'text-[#e2e8f0]'}>
                                        {m.isHome ? m.awayGoals : m.homeGoals}
                                      </span>
                                    </span>

                                    {/* Result badge */}
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                        m.result === 'W'
                                          ? 'bg-[#22c55e]/20 text-[#22c55e]'
                                          : m.result === 'D'
                                          ? 'bg-[#f97316]/20 text-[#f97316]'
                                          : 'bg-[#ef4444]/20 text-[#ef4444]'
                                      }`}
                                    >
                                      {m.result === 'W' ? 'В' : m.result === 'D' ? 'Н' : 'П'}
                                    </span>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tournament Table — expandable */}
      {result.table && result.table.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] border border-[#1a1a2e] overflow-hidden">
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#0a0a0f]/30 transition-colors"
          >
            <span className="text-sm font-bold text-[#e2e8f0]">📊 Таблица РПЛ</span>
            <motion.span animate={{ rotate: showTable ? 180 : 0 }} className="text-[#94a3b8]">
              ▼
            </motion.span>
          </button>
          <AnimatePresence>
            {showTable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-x-auto"
              >
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#94a3b8] border-b border-[#0a0a0f] bg-[#0a0a0f]/50">
                      <th className="py-2.5 px-2 text-left">#</th>
                      <th className="py-2.5 px-2 text-left">Команда</th>
                      <th className="py-2.5 px-2 text-center">И</th>
                      <th className="py-2.5 px-2 text-center">В</th>
                      <th className="py-2.5 px-2 text-center">Н</th>
                      <th className="py-2.5 px-2 text-center">П</th>
                      <th className="py-2.5 px-2 text-center">МЗ</th>
                      <th className="py-2.5 px-2 text-center">МП</th>
                      <th className="py-2.5 px-2 text-center">РМ</th>
                      <th className="py-2.5 px-2 text-center font-bold">О</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.table.map((team) => {
                      const isMyTeam = team.name === 'Моя команда';
                      const isRelegation = team.position >= 14;
                      return (
                        <tr
                          key={team.position}
                          className={`border-b border-[#0a0a0f]/50 transition-colors ${
                            isMyTeam
                              ? 'bg-[#22c55e]/10'
                              : isRelegation
                              ? 'bg-[#ef4444]/5'
                              : 'hover:bg-[#0a0a0f]/30'
                          }`}
                        >
                          <td className="py-2 px-2 text-[#94a3b8]">
                            {team.position === 1 ? '🏆' : getMedalColor(team.position)}{' '}
                            {team.position}
                          </td>
                          <td
                            className={`py-2 px-2 font-bold ${
                              isMyTeam
                                ? 'text-[#22c55e]'
                                : isRelegation
                                ? 'text-[#ef4444]'
                                : 'text-[#e2e8f0]'
                            }`}
                          >
                            {isMyTeam && '⚽ '}
                            {team.name}
                          </td>
                          <td className="py-2 px-2 text-center text-[#94a3b8]">{team.played}</td>
                          <td className="py-2 px-2 text-center text-[#94a3b8]">{team.won}</td>
                          <td className="py-2 px-2 text-center text-[#94a3b8]">{team.drawn}</td>
                          <td className="py-2 px-2 text-center text-[#94a3b8]">{team.lost}</td>
                          <td className="py-2 px-2 text-center text-[#94a3b8]">{team.goalsFor}</td>
                          <td className="py-2 px-2 text-center text-[#94a3b8]">{team.goalsAgainst}</td>
                          <td
                            className={`py-2 px-2 text-center ${
                              team.goalDifference > 0
                                ? 'text-[#22c55e]'
                                : team.goalDifference < 0
                                ? 'text-[#ef4444]'
                                : 'text-[#94a3b8]'
                            }`}
                          >
                            {team.goalDifference > 0 ? '+' : ''}
                            {team.goalDifference}
                          </td>
                          <td className="py-2 px-2 text-center font-black text-[#e2e8f0]">
                            {team.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Squad that played */}
      {result.players && result.players.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]">
          <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
            Ваш состав
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {result.players.map((p, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#0a0a0f]/30">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e]">
                  {p.position}
                </span>
                <span className="text-xs font-medium text-[#e2e8f0] flex-1 truncate">{p.name}</span>
                <span
                  className={`text-xs font-bold ${
                    p.rating >= 80
                      ? 'text-[#22c55e]'
                      : p.rating >= 70
                      ? 'text-[#3b82f6]'
                      : 'text-[#94a3b8]'
                  }`}
                >
                  {p.rating}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {(isChampion ||
        isPerfect ||
        isUnbeaten ||
        result.goalsFor >= 60 ||
        result.goalsAgainst <= 15 ||
        result.goalsFor - result.goalsAgainst >= 50 ||
        winStreak >= 5 ||
        result.goalsFor / 30 >= 2) && (
        <div className="rounded-2xl bg-[#1a1a2e] p-5 border border-[#1a1a2e]">
          <h3 className="text-sm font-bold text-[#e2e8f0] mb-3">Достижения</h3>
          <div className="flex flex-wrap gap-2">
            {isChampion && (
              <span className="text-xs px-4 py-2 rounded-full bg-[#22c55e]/20 text-[#22c55e] font-bold border border-[#22c55e]/30">
                🏆 Чемпион
              </span>
            )}
            {isPerfect && (
              <span className="text-xs px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400 font-bold border border-yellow-500/30">
                ✨ Идеальный сезон 30-0
              </span>
            )}
            {isUnbeaten && !isPerfect && (
              <span className="text-xs px-4 py-2 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] font-bold border border-[#3b82f6]/30">
                🛡️ Непобедимый (0 поражений)
              </span>
            )}
            {result.goalsFor >= 60 && (
              <span className="text-xs px-4 py-2 rounded-full bg-[#f97316]/20 text-[#f97316] font-bold border border-[#f97316]/30">
                ⚡ Голевая машина (60+ голов)
              </span>
            )}
            {result.goalsAgainst <= 15 && (
              <span className="text-xs px-4 py-2 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] font-bold border border-[#3b82f6]/30">
                🧱 Железная оборона (≤15 пропущено)
              </span>
            )}
            {result.goalsFor - result.goalsAgainst >= 50 && (
              <span className="text-xs px-4 py-2 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] font-bold border border-[#8b5cf6]/30">
                💪 Доминирование (+50 разница)
              </span>
            )}
            {winStreak >= 5 && (
              <span className="text-xs px-4 py-2 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                🔥 Серия побед ({winStreak} подряд)
              </span>
            )}
            {result.goalsFor / 30 >= 2 && (
              <span className="text-xs px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30">
                🎯 Снайпер (2+ гола/матч)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Quick Replay with same settings */}
        {lastConfig && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleQuickReplay}
              className="w-full h-14 text-base font-black bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] hover:from-[#7c3aed] hover:to-[#5b21b6] text-white rounded-2xl shadow-lg shadow-[#8b5cf6]/25 transition-all hover:shadow-[#8b5cf6]/40 border border-[#8b5cf6]/30"
            >
              🔄 Повторить с этими настройками
            </Button>
          </motion.div>
        )}

        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => {
              resetGame();
            }}
            className="w-full h-16 text-lg font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25 transition-all hover:shadow-[#22c55e]/40"
          >
            🔄 Играть снова
          </Button>
        </motion.div>
        <div className="flex gap-3">
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full h-12 text-sm font-bold border-[#94a3b8]/20 text-[#94a3b8] hover:bg-[#1a1a2e] rounded-xl hover:text-[#e2e8f0] hover:border-[#94a3b8]/40"
            >
              📤 Поделиться
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
            <Button
              onClick={handleCopyResult}
              variant="outline"
              className="w-full h-12 text-sm font-bold border-[#94a3b8]/20 text-[#94a3b8] hover:bg-[#1a1a2e] rounded-xl hover:text-[#e2e8f0] hover:border-[#94a3b8]/40"
            >
              📊 Копировать
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
