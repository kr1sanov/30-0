'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchDetail {
  matchday: number;
  opponent: string;
  isHome: boolean;
  homeGoals: number;
  awayGoals: number;
  result: 'W' | 'D' | 'L';
  scorers?: string[];
}

interface Trophy {
  id: string;
  icon: string;
  name: string;
  description: string;
  earned: boolean;
}

interface SeasonResultData {
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  position: number;
  matches?: MatchDetail[];
  trophies?: Trophy[];
  bestWinStreak?: number;
  januaryTransferModifier?: number;
  table?: Array<{
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
  players?: Array<{
    name: string;
    position: string;
    rating: number;
    isCompatible: boolean;
  }>;
  formation?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Position ordinal mapping for Russian position display
// ---------------------------------------------------------------------------

const POSITION_ORDINAL: Record<number, string> = {
  1: '1-е',
  2: '2-е',
  3: '3-е',
  4: '4-е',
  5: '5-е',
  6: '6-е',
  7: '7-е',
  8: '8-е',
  9: '9-е',
  10: '10-е',
  11: '11-е',
  12: '12-е',
  13: '13-е',
  14: '14-е',
  15: '15-е',
  16: '16-е',
};

function getPositionOrdinal(pos: number): string {
  return POSITION_ORDINAL[pos] ?? `${pos}-е`;
}

// ---------------------------------------------------------------------------
// Trophy bounce animation variants
// ---------------------------------------------------------------------------

const trophyVariants = {
  hidden: { opacity: 0, scale: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 15,
      delay: i * 0.12,
    },
  }),
};

// ---------------------------------------------------------------------------
// Season Result — 38-0 style
// ---------------------------------------------------------------------------

export default function SimulationResult() {
  const { seasonResult, resetGame, goHome, slots, setScreen, config } = useGameStore();
  const [currentMatchweek, setCurrentMatchweek] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const data = seasonResult as SeasonResultData | null;
  const matches = (data?.matches ?? []) as MatchDetail[];
  const totalMatches = matches.length;
  const trophies = (data?.trophies ?? []) as Trophy[];
  const earnedTrophies = trophies.filter(t => t.earned);

  // Auto-play through matchweeks
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentMatchweek((prev) => {
        if (prev >= totalMatches) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 150);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [totalMatches]);

  const isComplete = currentMatchweek >= totalMatches;

  // Skip all
  const handleSkipAll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentMatchweek(totalMatches);
  }, [totalMatches]);

  // Current stats up to currentMatchweek
  const currentStats = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    for (let i = 0; i < currentMatchweek && i < matches.length; i++) {
      const m = matches[i];
      if (m.result === 'W') w++;
      else if (m.result === 'D') d++;
      else l++;
      const playerGoals = m.isHome ? m.homeGoals : m.awayGoals;
      const oppGoals = m.isHome ? m.awayGoals : m.homeGoals;
      gf += playerGoals;
      ga += oppGoals;
    }
    return { w, d, l, pts: w * 3 + d, gf, ga };
  }, [matches, currentMatchweek]);

  // Achievements (secondary stats)
  const achievements = useMemo(() => {
    if (!data) return [];
    const result: Array<{ label: string; value: string; icon: string }> = [];

    // Clean sheets
    let cleanSheets = 0;
    for (const m of matches) {
      const oppGoals = m.isHome ? m.awayGoals : m.homeGoals;
      if (oppGoals === 0) cleanSheets++;
    }
    result.push({ label: 'Сухих матчей', value: String(cleanSheets), icon: '🧤' });

    // Longest win streak
    const maxStreak = data.bestWinStreak ?? 0;
    result.push({ label: 'Лучшая серия', value: `${maxStreak} побед`, icon: '🔥' });

    // Biggest win
    let biggestWin = '';
    let biggestDiff = 0;
    for (const m of matches) {
      const playerGoals = m.isHome ? m.homeGoals : m.awayGoals;
      const oppGoals = m.isHome ? m.awayGoals : m.homeGoals;
      const diff = playerGoals - oppGoals;
      if (diff > biggestDiff) {
        biggestDiff = diff;
        biggestWin = `${playerGoals}-${oppGoals} vs ${m.opponent}`;
      }
    }
    if (biggestWin) result.push({ label: 'Крупная победа', value: biggestWin, icon: '⚽' });

    // Highest scoring match
    let highestScoring = '';
    let mostGoals = 0;
    for (const m of matches) {
      const totalGoals = m.homeGoals + m.awayGoals;
      if (totalGoals > mostGoals) {
        mostGoals = totalGoals;
        const playerGoals = m.isHome ? m.homeGoals : m.awayGoals;
        const oppGoals = m.isHome ? m.awayGoals : m.homeGoals;
        highestScoring = `${playerGoals}-${oppGoals} vs ${m.opponent}`;
      }
    }
    if (highestScoring) result.push({ label: 'Самый результативный', value: highestScoring, icon: '🎯' });

    // January transfer window modifier
    if (data.januaryTransferModifier !== undefined) {
      const mod = data.januaryTransferModifier;
      result.push({
        label: 'Трансферное окно',
        value: mod > 0 ? `+${mod} к силе` : `${mod} к силе`,
        icon: mod > 0 ? '📈' : '📉',
      });
    }

    return result;
  }, [data, matches]);

  // Visible matches (show last 3 up to current matchweek)
  const visibleMatches = useMemo(() => {
    const upTo = Math.min(currentMatchweek, matches.length);
    return matches.slice(Math.max(0, upTo - 3), upTo).reverse();
  }, [matches, currentMatchweek]);

  // Share handler
  const handleShare = useCallback(() => {
    if (!data) return;
    const pos = getPositionOrdinal(data.position);
    const lines = [
      `⚽ 30-0 RPL`,
      `${data.points} оч · ${pos} место`,
      `${data.wins}В ${data.draws}Н ${data.losses}П`,
      `Забито ${data.goalsFor} · Пропущено ${data.goalsAgainst}`,
    ];
    if (earnedTrophies.length > 0) {
      lines.push('');
      lines.push('🏅 Награды:');
      for (const t of earnedTrophies) {
        lines.push(`${t.icon} ${t.name}`);
      }
    }
    if (data.formation) {
      lines.push(`📐 ${data.formation}`);
    }
    const text = lines.join('\n');
    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        navigator.clipboard.writeText(text);
      });
    } else {
      navigator.clipboard.writeText(text);
    }
  }, [data, earnedTrophies]);

  if (!data) return null;

  return (
    <div className="space-y-4 animate-fade-in pb-20 sm:pb-4">
      {/* ── Live Matchweek Progress ── */}
      {!isComplete && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#9CA3AF]">
            ТУР {Math.min(currentMatchweek, totalMatches)} / {totalMatches}
          </span>
          <button
            onClick={handleSkipAll}
            className="text-xs text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors flex items-center gap-1"
          >
            Пропустить все →
          </button>
        </div>
      )}

      {/* ── Recent Match Results (during simulation) ── */}
      {!isComplete && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {visibleMatches.map((match, idx) => {
              const playerGoals = match.isHome ? match.homeGoals : match.awayGoals;
              const oppGoals = match.isHome ? match.awayGoals : match.homeGoals;
              const isWin = match.result === 'W';
              const isLoss = match.result === 'L';

              return (
                <motion.div
                  key={match.matchday}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className={`rounded-xl p-3 border ${
                    isWin
                      ? 'bg-[#141414] border-[#00C896]/20'
                      : isLoss
                      ? 'bg-[#2d0d0d] border-[#ef4444]/20'
                      : 'bg-[#1a1a2e] border-[#64748b]/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black px-1.5 py-0.5 rounded ${
                          isWin
                            ? 'bg-[#00C896]/20 text-[#00C896]'
                            : isLoss
                            ? 'bg-[#ef4444]/20 text-[#ef4444]'
                            : 'bg-[#64748b]/20 text-[#64748b]'
                        }`}
                      >
                        {match.result}
                      </span>
                      <span className="text-xs text-[#9CA3AF]">
                        {match.opponent} ({match.isHome ? 'д' : 'в'})
                      </span>
                    </div>
                    <span
                      className={`text-sm font-black ${
                        isWin ? 'text-[#00C896]' : isLoss ? 'text-[#ef4444]' : 'text-[#9CA3AF]'
                      }`}
                    >
                      {playerGoals}–{oppGoals}
                    </span>
                  </div>
                  {match.scorers && match.scorers.length > 0 && (
                    <div className="text-[10px] text-[#9CA3AF] mt-1">
                      {match.scorers.join(' · ')}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── LIVE Stats (during simulation) ── */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-[#0d1a0d] border border-[#1E1E1E]/60 p-4"
        >
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="text-center">
              <div className="text-2xl font-black text-[#00C896]">{currentStats.w}</div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Побед</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-[#FFFFFF]">{currentStats.d}</div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Ничьи</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-[#ef4444]">{currentStats.l}</div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Поражений</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-[#fbbf24]">{currentStats.pts}</div>
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Очки</div>
            </div>
          </div>
          <div className="flex justify-center gap-4 text-xs text-[#64748b]">
            <span>Забито {currentStats.gf}</span>
            <span>·</span>
            <span>Пропущено {currentStats.ga}</span>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           SEASON COMPLETE — 38-0 style result screen
         ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-5"
          >
            {/* ── Hero Stat: Points & Position ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
              className="text-center py-4"
            >
              <div className="text-5xl sm:text-6xl font-black text-[#00C896] leading-none">
                {data.points}
                <span className="text-2xl sm:text-3xl text-[#9CA3AF] font-bold ml-1">оч</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[#FFFFFF] mt-2">
                {getPositionOrdinal(data.position)} место
              </div>
              {data.formation && (
                <div className="text-sm text-[#64748b] mt-1">
                  📐 {data.formation}
                </div>
              )}
            </motion.div>

            {/* ── W-D-L Banner ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-1 text-lg font-black"
            >
              <span className="text-[#00C896]">{data.wins}В</span>
              <span className="text-[#64748b] mx-1">·</span>
              <span className="text-[#9CA3AF]">{data.draws}Н</span>
              <span className="text-[#64748b] mx-1">·</span>
              <span className="text-[#ef4444]">{data.losses}П</span>
            </motion.div>

            {/* ── Goals Banner ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-2 text-sm font-bold"
            >
              <span className="text-[#00C896]">Забито {data.goalsFor}</span>
              <span className="text-[#64748b]">·</span>
              <span className="text-[#ef4444]">Пропущено {data.goalsAgainst}</span>
            </motion.div>

            {/* ── Trophy Cabinet ── */}
            {earnedTrophies.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="rounded-2xl bg-[#0d1a0d] border border-[#1E1E1E]/60 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#FFFFFF]">🏅 Витрина трофеев</h3>
                  <span className="text-xs text-[#9CA3AF]">{earnedTrophies.length}/{trophies.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {trophies.map((trophy, idx) => (
                    <motion.div
                      key={trophy.id}
                      custom={idx}
                      variants={trophyVariants}
                      initial="hidden"
                      animate={trophy.earned ? 'visible' : { opacity: 0.3, scale: 1, y: 0 }}
                      transition={trophy.earned ? {
                        type: 'spring',
                        stiffness: 300,
                        damping: 15,
                        delay: 0.8 + idx * 0.12,
                      } : { delay: 0.8 + idx * 0.05 }}
                      className={`rounded-xl p-3 text-center border ${
                        trophy.earned
                          ? 'bg-gradient-to-b from-[#1a2e1a] to-[#0d1a0d] border-[#00C896]/30'
                          : 'bg-[#0A0A0A]/50 border-[#1E1E1E]/30'
                      }`}
                    >
                      <motion.div
                        className={`text-2xl mb-1 ${trophy.earned ? '' : 'grayscale opacity-40'}`}
                        animate={trophy.earned ? {
                          y: [0, -4, 0],
                          transition: {
                            delay: 1.2 + idx * 0.12,
                            duration: 0.5,
                            repeat: 1,
                          },
                        } : {}}
                      >
                        {trophy.icon}
                      </motion.div>
                      <div className={`text-[10px] font-bold leading-tight ${
                        trophy.earned ? 'text-[#00C896]' : 'text-[#4a4a4a]'
                      }`}>
                        {trophy.name}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Secondary Achievements ── */}
            {achievements.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {achievements.map((ach, idx) => (
                  <motion.div
                    key={ach.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.5 + idx * 0.1 }}
                    className="rounded-xl bg-[#0d1a0d] border border-[#1E1E1E]/60 p-3"
                  >
                    <div className="text-lg mb-1">{ach.icon}</div>
                    <div className="text-[10px] text-[#64748b] uppercase tracking-wider font-bold">{ach.label}</div>
                    <div className="text-sm font-bold text-[#00C896] mt-0.5">{ach.value}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ── Final League Table ── */}
            {data.table && data.table.length > 0 && (
              <div className="rounded-2xl bg-[#0d1a0d] border border-[#1E1E1E]/60 overflow-hidden">
                <button
                  onClick={() => setShowTable(!showTable)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#141414]/30 transition-colors"
                >
                  <span className="text-sm font-bold text-[#FFFFFF]">📊 Итоговая таблица</span>
                  <motion.span
                    animate={{ rotate: showTable ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[#9CA3AF]"
                  >
                    ▼
                  </motion.span>
                </button>
                <AnimatePresence>
                  {showTable && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[#64748b]">
                              <th className="text-left py-1.5 pr-2">#</th>
                              <th className="text-left py-1.5">Команда</th>
                              <th className="text-center py-1.5 px-1">И</th>
                              <th className="text-center py-1.5 px-1">В</th>
                              <th className="text-center py-1.5 px-1">Н</th>
                              <th className="text-center py-1.5 px-1">П</th>
                              <th className="text-center py-1.5 px-1">РМ</th>
                              <th className="text-center py-1.5 pl-1">О</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.table.map((team) => {
                              const isPlayer = team.name === 'Моя команда';
                              return (
                                <tr
                                  key={team.position}
                                  className={`${
                                    isPlayer
                                      ? 'bg-[#00C896]/10 font-bold text-[#00C896]'
                                      : 'text-[#9CA3AF]'
                                  }`}
                                >
                                  <td className="py-1.5 pr-2">{team.position}</td>
                                  <td className="py-1.5">{team.name}</td>
                                  <td className="text-center py-1.5 px-1">{team.played}</td>
                                  <td className="text-center py-1.5 px-1">{team.won}</td>
                                  <td className="text-center py-1.5 px-1">{team.drawn}</td>
                                  <td className="text-center py-1.5 px-1">{team.lost}</td>
                                  <td className="text-center py-1.5 px-1">
                                    {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                                  </td>
                                  <td className="text-center py-1.5 pl-1 font-black">{team.points}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Action Buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.0 }}
              className="space-y-3"
            >
              <Button
                onClick={() => setScreen('awards')}
                className="w-full h-14 text-base font-black bg-gradient-to-r from-[#00C896] to-[#00A67A] hover:from-[#00A67A] hover:to-[#15803d] text-white rounded-xl shadow-lg shadow-[#00C896]/25 transition-all hover:shadow-[#00C896]/40"
              >
                🏆 Награды сезона
              </Button>
              <div className="flex gap-3">
                <Button
                  onClick={resetGame}
                  className="flex-1 h-11 rounded-xl bg-[#00C896] hover:bg-[#00A67A] text-white font-bold shadow-lg shadow-[#00C896]/20"
                >
                  🔄 Играть снова
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex-1 h-11 rounded-xl border-[#1E1E1E] text-[#9CA3AF] hover:bg-[#141414] hover:text-[#FFFFFF]"
                >
                  📤 Поделиться
                </Button>
              </div>
              <Button
                onClick={() => setScreen('profile')}
                variant="outline"
                className="w-full h-11 rounded-xl border-[#1E1E1E] text-[#9CA3AF] hover:bg-[#141414] hover:text-[#FFFFFF]"
              >
                👤 Профиль
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
