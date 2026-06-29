'use client';

import { useMemo, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
}

export default function SimulationResult() {
  const { seasonResult, resetGame } = useGameStore();

  const shouldConfetti = seasonResult
    ? ((seasonResult as { position: number }).position === 1 || (seasonResult as { wins: number }).wins === 30)
    : false;

  const confetti = useMemo<ConfettiPiece[]>(() => {
    if (!shouldConfetti) return [];
    const emojis = ['🏆', '⭐', '🎉', '🔥', '💪', '🥇', '✨', '🎊'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
    }));
  }, [shouldConfetti]);

  const handleShare = useCallback(() => {
    if (!seasonResult) return;
    const r = seasonResult as { wins: number; draws: number; losses: number; points: number; position: number };
    const text = `🏆 30-0 RPL\n${r.wins}В ${r.draws}Н ${r.losses}П · ${r.points} очков · ${r.position} место\nМожешь лучше?`;
    if (navigator.share) {
      navigator.share({
        title: '30-0 RPL',
        text,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, [seasonResult]);

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
    formation: string;
    difficulty: string;
  };

  const isChampion = result.position === 1;
  const isPerfect = result.wins === 30;

  const getMedalColor = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
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

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {/* Confetti for champions */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute text-2xl"
              style={{ left: `${piece.x}%` }}
              initial={{ y: -50, opacity: 1, rotate: 0 }}
              animate={{ y: '100vh', opacity: 0, rotate: 720 }}
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
          className="text-center py-8 rounded-2xl bg-gradient-to-b from-[#22c55e]/20 via-[#22c55e]/5 to-transparent border border-[#22c55e]/20"
        >
          <motion.div
            className="text-7xl mb-4"
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            🏆
          </motion.div>
          <div className="text-3xl font-black text-gradient-green">
            {isPerfect ? '30-0! Идеальный сезон!' : 'Чемпион!'}
          </div>
          <div className="text-sm text-[#94a3b8] mt-2">
            {isPerfect ? 'Невероятно! Все 30 матчей выиграны!' : 'Вы выиграли чемпионат!'}
          </div>
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
          <div
            className="text-6xl font-black"
            style={{ color: getPositionColor(result.position) }}
          >
            {result.position}
          </div>
          <div className="text-sm font-bold text-[#e2e8f0] mt-1">
            {getPositionLabel(result.position)}
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

      {/* Tournament Table */}
      {result.table && result.table.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#e2e8f0] mb-2">Турнирная таблица</h3>
          <div className="rounded-2xl bg-[#1a1a2e] overflow-hidden border border-[#1a1a2e]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#94a3b8] border-b border-[#0a0a0f] bg-[#0a0a0f]/50">
                    <th className="py-2.5 px-2 text-left">#</th>
                    <th className="py-2.5 px-2 text-left">Команда</th>
                    <th className="py-2.5 px-2 text-center">И</th>
                    <th className="py-2.5 px-2 text-center">В</th>
                    <th className="py-2.5 px-2 text-center">Н</th>
                    <th className="py-2.5 px-2 text-center">П</th>
                    <th className="py-2.5 px-2 text-center">РМ</th>
                    <th className="py-2.5 px-2 text-center font-bold">О</th>
                  </tr>
                </thead>
                <tbody>
                  {result.table.map((team) => {
                    const isMyTeam = team.name === 'Моя команда';
                    return (
                      <tr
                        key={team.position}
                        className={`border-b border-[#0a0a0f]/50 transition-colors ${
                          isMyTeam ? 'bg-[#22c55e]/10' : 'hover:bg-[#0a0a0f]/30'
                        }`}
                      >
                        <td className="py-2 px-2 text-[#94a3b8]">
                          {getMedalColor(team.position)} {team.position}
                        </td>
                        <td className={`py-2 px-2 font-bold ${isMyTeam ? 'text-[#22c55e]' : 'text-[#e2e8f0]'}`}>
                          {isMyTeam && '⚽ '}{team.name}
                        </td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.played}</td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.won}</td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.drawn}</td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">{team.lost}</td>
                        <td className="py-2 px-2 text-center text-[#94a3b8]">
                          {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                        </td>
                        <td className="py-2 px-2 text-center font-black text-[#e2e8f0]">{team.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Achievements */}
      {(isChampion || isPerfect) && (
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
            {result.goalsFor >= 60 && (
              <span className="text-xs px-4 py-2 rounded-full bg-[#f97316]/20 text-[#f97316] font-bold border border-[#f97316]/30">
                ⚡ Голевая машина
              </span>
            )}
            {result.goalsAgainst <= 15 && (
              <span className="text-xs px-4 py-2 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] font-bold border border-[#3b82f6]/30">
                🛡️ Железная оборона
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
          <Button
            onClick={resetGame}
            className="w-full h-14 text-base font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25"
          >
            🔄 Играть снова
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full h-14 text-sm font-bold border-[#94a3b8]/20 text-[#94a3b8] hover:bg-[#1a1a2e] rounded-2xl hover:text-[#e2e8f0] hover:border-[#94a3b8]/40"
          >
            📤 Поделиться
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
