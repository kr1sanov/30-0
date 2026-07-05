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

interface SeasonResultData {
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  position: number;
  matches?: MatchDetail[];
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
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Position color mapping
// ---------------------------------------------------------------------------

const POSITION_COLORS: Record<string, string> = {
  'ВР': '#f97316',
  'ЦЗ': '#3b82f6', 'ПЗ': '#3b82f6', 'ЛЗ': '#3b82f6', 'ПФЗ': '#3b82f6', 'ЛФЗ': '#3b82f6',
  'ОП': '#22c55e', 'ЦП': '#22c55e', 'АП': '#22c55e', 'ЛП': '#22c55e', 'ПП': '#22c55e',
  'ЛВ': '#ef4444', 'ПВ': '#ef4444', 'НП': '#ef4444', 'ЦН': '#ef4444',
};

function getPositionColor(pos: string): string {
  return POSITION_COLORS[pos] ?? '#64748b';
}

// ---------------------------------------------------------------------------
// Season Result — 38-0 style
// ---------------------------------------------------------------------------

export default function SimulationResult() {
  const { seasonResult, resetGame, goHome, slots, setScreen } = useGameStore();
  const [currentMatchweek, setCurrentMatchweek] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const data = seasonResult as SeasonResultData | null;
  const matches = (data?.matches ?? []) as MatchDetail[];
  const totalMatches = matches.length;

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
    }, 150); // Speed: ~150ms per matchweek

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

  // Achievements
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
    let maxStreak = 0, currentStreak = 0;
    for (const m of matches) {
      if (m.result === 'W') { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
      else { currentStreak = 0; }
    }
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

    // Highest scoring
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

    return result;
  }, [data, matches]);

  // Visible matches (show last 3 up to current matchweek)
  const visibleMatches = useMemo(() => {
    const upTo = Math.min(currentMatchweek, matches.length);
    return matches.slice(Math.max(0, upTo - 3), upTo).reverse();
  }, [matches, currentMatchweek]);

  if (!data) return null;

  return (
    <div className="space-y-4 animate-fade-in pb-20 sm:pb-4">
      {/* ── Player Roster (compact, like 38-0) ── */}
      {data.players && data.players.length > 0 && (
        <div className="space-y-1.5">
          {data.players.slice(0, 3).map((player, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0d1a0d] border border-[#1a3a1a]/40"
            >
              <span
                className="text-[10px] font-black px-2 py-1 rounded text-white"
                style={{ backgroundColor: getPositionColor(player.position) }}
              >
                {player.position}
              </span>
              <span className="text-sm font-bold text-[#e2e8f0] flex-1">{player.name}</span>
              <span className="text-xs text-[#64748b]">{player.rating}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Matchweek Progress ── */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#94a3b8]">
          ТУР {Math.min(currentMatchweek, totalMatches)} / {totalMatches}
        </span>
        {!isComplete && (
          <button
            onClick={handleSkipAll}
            className="text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors flex items-center gap-1"
          >
            Пропустить все →
          </button>
        )}
      </div>

      {/* ── Recent Match Results ── */}
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
                    ? 'bg-[#0d2d0d] border-[#22c55e]/20'
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
                          ? 'bg-[#22c55e]/20 text-[#22c55e]'
                          : isLoss
                          ? 'bg-[#ef4444]/20 text-[#ef4444]'
                          : 'bg-[#64748b]/20 text-[#64748b]'
                      }`}
                    >
                      {match.result}
                    </span>
                    <span className="text-xs text-[#94a3b8]">
                      {match.opponent} ({match.isHome ? 'д' : 'в'})
                    </span>
                  </div>
                  <span
                    className={`text-sm font-black ${
                      isWin ? 'text-[#22c55e]' : isLoss ? 'text-[#ef4444]' : 'text-[#94a3b8]'
                    }`}
                  >
                    {playerGoals}–{oppGoals}
                  </span>
                </div>
                {/* Goal scorers */}
                {match.scorers && match.scorers.length > 0 && (
                  <div className="text-[10px] text-[#94a3b8] mt-1">
                    {match.scorers.join(' · ')}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Season Statistics ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-[#0d1a0d] border border-[#1a3a1a]/60 p-4"
      >
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <div className="text-2xl font-black text-[#22c55e]">{currentStats.w}</div>
            <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Побед</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-[#e2e8f0]">{currentStats.d}</div>
            <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Ничьи</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-[#ef4444]">{currentStats.l}</div>
            <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Поражений</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-[#fbbf24]">{currentStats.pts}</div>
            <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Очки</div>
          </div>
        </div>
        <div className="flex justify-center gap-4 text-xs text-[#64748b]">
          <span>ГЗ {currentStats.gf}</span>
          <span>·</span>
          <span>ГП {currentStats.ga}</span>
          <span>·</span>
          <span>РМ +{currentStats.gf - currentStats.ga}</span>
        </div>
      </motion.div>

      {/* ── Season Complete: Achievements + Table + Actions ── */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            {/* Achievement cards */}
            {achievements.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {achievements.map((ach, idx) => (
                  <motion.div
                    key={ach.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + idx * 0.15 }}
                    className="rounded-xl bg-[#0d1a0d] border border-[#1a3a1a]/60 p-3"
                  >
                    <div className="text-lg mb-1">{ach.icon}</div>
                    <div className="text-[10px] text-[#64748b] uppercase tracking-wider font-bold">{ach.label}</div>
                    <div className="text-sm font-bold text-[#22c55e] mt-0.5">{ach.value}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Final League Table */}
            {data.table && data.table.length > 0 && (
              <div className="rounded-2xl bg-[#0d1a0d] border border-[#1a3a1a]/60 overflow-hidden">
                <button
                  onClick={() => setShowTable(!showTable)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#0d2d0d]/30 transition-colors"
                >
                  <span className="text-sm font-bold text-[#e2e8f0]">📊 Итоговая таблица</span>
                  <motion.span
                    animate={{ rotate: showTable ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[#94a3b8]"
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
                      <div className="px-4 pb-4 overflow-x-auto">
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
                                      ? 'bg-[#22c55e]/10 font-bold text-[#22c55e]'
                                      : 'text-[#94a3b8]'
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

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => setScreen('awards')}
                className="w-full h-14 text-base font-black bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white rounded-xl shadow-lg shadow-[#22c55e]/25 transition-all hover:shadow-[#22c55e]/40"
              >
                🏆 Награды сезона
              </Button>
              <div className="flex gap-3">
                <Button
                  onClick={goHome}
                  variant="outline"
                  className="flex-1 h-11 rounded-xl border-[#1a3a1a] text-[#94a3b8] hover:bg-[#0d2d0d] hover:text-[#e2e8f0]"
                >
                  🏠 На главную
                </Button>
                <Button
                  onClick={resetGame}
                  className="flex-1 h-11 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold shadow-lg shadow-[#22c55e]/20"
                >
                  🔄 Новая игра
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
