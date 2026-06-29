'use client';

import { useMemo, useCallback, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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

export default function SimulationResult() {
  const { seasonResult, resetGame } = useGameStore();
  const [showMatches, setShowMatches] = useState(false);
  const [showTable, setShowTable] = useState(false);

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

    // Try Telegram WebApp share first
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.openTelegramLink(
          `https://t.me/share/url?url=${encodeURIComponent('https://30-0.app')}&text=${encodeURIComponent(text)}`,
        );
        return;
      } catch {
        // fall through to navigator.share
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

  // Calculate win streak before early return to satisfy hooks rules
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

      {/* Trophy / Celebration */}
      {(isChampion || isPerfect) && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className={`text-center py-8 rounded-2xl border ${
            isPerfect
              ? 'bg-gradient-to-b from-yellow-500/20 via-yellow-500/5 to-transparent border-yellow-500/30'
              : 'bg-gradient-to-b from-[#22c55e]/20 via-[#22c55e]/5 to-transparent border-[#22c55e]/20'
          }`}
        >
          <motion.div
            className="text-7xl mb-4"
            animate={isPerfect
              ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1, 1.1, 1] }
              : { rotate: [0, -5, 5, -5, 0] }
            }
            transition={{ duration: isPerfect ? 0.8 : 0.5, delay: 0.5 }}
          >
            {isPerfect ? '👑' : '🏆'}
          </motion.div>
          <div className={`text-3xl font-black ${isPerfect ? 'text-yellow-400' : 'text-gradient-green'}`}>
            {isPerfect ? '30-0! Идеальный сезон!' : 'Чемпион!'}
          </div>
          <div className="text-sm text-[#94a3b8] mt-2">
            {isPerfect ? 'Невероятно! Все 30 матчей выиграны!' : 'Вы выиграли чемпионат!'}
          </div>
          {isPerfect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-3 inline-block"
            >
              <span className="text-xs px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400 font-bold border border-yellow-500/30">
                ✨ Это легендарное достижение!
              </span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Position Display (when not champion) */}
      {!isChampion && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center py-6 rounded-2xl bg-[#1a1a2e] border border-[#1a1a2e]"
        >
          <div className="text-3xl mb-1">{getMedalColor(result.position)}</div>
          <div
            className="text-6xl font-black"
            style={{ color: getPositionColor(result.position) }}
          >
            {result.position}
          </div>
          <div className="text-sm font-bold text-[#e2e8f0] mt-1">
            {getPositionLabel(result.position)}
          </div>
          <div className="text-xs text-[#94a3b8] mt-1">место в таблице</div>
        </motion.div>
      )}

      {/* Manager info (if used) */}
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

      {/* Results Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-2xl font-black text-[#22c55e]">{result.wins}</div>
          <div className="text-xs text-[#94a3b8]">Победы</div>
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-2xl font-black text-[#f97316]">{result.draws}</div>
          <div className="text-xs text-[#94a3b8]">Ничьи</div>
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-2xl font-black text-[#ef4444]">{result.losses}</div>
          <div className="text-xs text-[#94a3b8]">Поражения</div>
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-2xl font-black text-[#e2e8f0]">{result.points}</div>
          <div className="text-xs text-[#94a3b8]">Очки</div>
        </div>
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

      {/* Season Form - colored dots */}
      {matchesList.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]">
          <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Форма сезона</h4>
          <div className="flex flex-wrap gap-1">
            {matchesList.map((m) => (
              <div
                key={m.matchday}
                className="w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-bold text-white"
                style={{
                  backgroundColor: m.result === 'W' ? '#22c55e' : m.result === 'D' ? '#f97316' : '#ef4444',
                }}
                title={`Тур ${m.matchday}: ${m.homeGoals}-${m.awayGoals} vs ${m.opponent}`}
              >
                {m.matchday}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points accumulation sparkline */}
      {pointsAccumulation.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Набранные очки</h4>
            <span className="text-xs font-bold text-[#22c55e]">{result.points}</span>
          </div>
          <div className="relative h-16">
            <svg className="w-full h-full" viewBox={`0 0 ${pointsAccumulation.length - 1} 100`} preserveAspectRatio="none">
              {/* Grid lines */}
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
              {/* Fill area */}
              <path
                d={`M0 100 ${pointsAccumulation.map((pts, i) => `L${i} ${100 - (pts / 90) * 100}`).join(' ')} L${pointsAccumulation.length - 1} 100 Z`}
                fill="url(#pointsGradient)"
                fillOpacity="0.3"
              />
              {/* Line */}
              <path
                d={`M0 ${100 - (pointsAccumulation[0] / 90) * 100} ${pointsAccumulation.map((pts, i) => `L${i} ${100 - (pts / 90) * 100}`).join(' ')}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* End point */}
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

      {/* Match-by-match view */}
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
          {showMatches && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-3 pb-3 max-h-80 overflow-y-auto custom-scrollbar"
            >
              <div className="space-y-1">
                {matchesList.map((m) => (
                  <div
                    key={m.matchday}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#0a0a0f]/30 transition-colors"
                  >
                    <span className="text-xs text-[#94a3b8] w-6">{m.matchday}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                      m.result === 'W' ? 'bg-[#22c55e]/20 text-[#22c55e]' :
                      m.result === 'D' ? 'bg-[#f97316]/20 text-[#f97316]' :
                      'bg-[#ef4444]/20 text-[#ef4444]'
                    }`}>
                      {m.result === 'W' ? 'В' : m.result === 'D' ? 'Н' : 'П'}
                    </span>
                    <span className="text-xs text-[#94a3b8] flex-1 text-right">
                      {m.isHome ? '🏠' : '✈️'} {m.opponent}
                    </span>
                    <span className="text-sm font-bold text-[#e2e8f0]">
                      {m.homeGoals}:{m.awayGoals}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
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
          {showTable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
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
                          {team.position === 1 ? '🏆' : getMedalColor(team.position)} {team.position}
                        </td>
                        <td className={`py-2 px-2 font-bold ${
                          isMyTeam
                            ? 'text-[#22c55e]'
                            : isRelegation
                            ? 'text-[#ef4444]'
                            : 'text-[#e2e8f0]'
                        }`}>
                          {isMyTeam && '⚽ '}{team.name}
                        </td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.played}</td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.won}</td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.drawn}</td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.lost}</td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.goalsFor}</td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.goalsAgainst}</td>
                        <td className={`py-2 px-2 text-center ${
                          team.goalDifference > 0 ? 'text-[#22c55e]' : team.goalDifference < 0 ? 'text-[#ef4444]' : 'text-[#94a3b8]'
                        }`}>
                          {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                        </td>
                        <td className="py-2 px-2 text-center font-black text-[#e2e8f0]">{team.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </div>
      )}

      {/* Squad that played */}
      {result.players && result.players.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]">
          <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Ваш состав</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {result.players.map((p, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#0a0a0f]/30">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e]">{p.position}</span>
                <span className="text-xs font-medium text-[#e2e8f0] flex-1 truncate">{p.name}</span>
                <span className={`text-xs font-bold ${p.rating >= 80 ? 'text-[#22c55e]' : p.rating >= 70 ? 'text-[#3b82f6]' : 'text-[#94a3b8]'}`}>
                  {p.rating}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {(isChampion || isPerfect || isUnbeaten || result.goalsFor >= 60 || result.goalsAgainst <= 15 || result.goalsFor - result.goalsAgainst >= 50 || winStreak >= 5 || result.goalsFor / 30 >= 2) && (
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
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => { resetGame(); }}
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
