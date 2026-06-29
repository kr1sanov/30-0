'use client';

import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';

const TROPHIES = [
  { id: 'champion', icon: '🏆', name: 'Чемпион', desc: 'Выиграть чемпионат' },
  { id: 'perfect', icon: '✨', name: '30-0', desc: 'Идеальный сезон' },
  { id: 'goal_machine', icon: '⚡', name: 'Голевая машина', desc: '60+ голов за сезон' },
  { id: 'iron_defense', icon: '🧱', name: 'Железная оборона', desc: 'Разница +50' },
  { id: 'win_streak', icon: '🔥', name: 'Серия побед', desc: '5+ побед подряд' },
  { id: 'sniper', icon: '🎯', name: 'Снайпер', desc: '2+ гола за матч' },
  { id: 'fortress', icon: '🏟️', name: 'Дом-крепость', desc: '0 домашних поражений' },
  { id: 'elite', icon: '💎', name: 'Элита', desc: 'Средний рейтинг 80+' },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Легко',
  normal: 'Нормально',
  hard: 'Сложно',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22c55e',
  normal: '#3b82f6',
  hard: '#ef4444',
};

export default function ProfileScreen() {
  const { profileStats, resetGame, setScreen } = useGameStore();
  const [showHistory, setShowHistory] = useState(false);

  const winRate = profileStats.totalSeasons > 0
    ? Math.round((profileStats.totalWins / (profileStats.totalSeasons * 30)) * 100)
    : 0;

  const avgGoals = profileStats.totalSeasons > 0
    ? Math.round(profileStats.totalGoals / profileStats.totalSeasons)
    : 0;

  // Points chart data (last 10 seasons)
  const recentHistory = profileStats.history.slice(-10);
  const maxPoints = useMemo(() => Math.max(...recentHistory.map(h => h.points), 90), [recentHistory]);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header with avatar */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative inline-block"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-3xl shadow-lg shadow-[#22c55e]/20">
            ⚽
          </div>
          {profileStats.titles > 0 && (
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm shadow-lg">
              🏆
            </div>
          )}
        </motion.div>
        <h2 className="text-xl font-bold text-[#e2e8f0] mt-3">Профиль игрока</h2>
        <p className="text-sm text-[#94a3b8] mt-1">
          {profileStats.totalSeasons > 0
            ? `${profileStats.totalSeasons} ${profileStats.totalSeasons === 1 ? 'сезон' : profileStats.totalSeasons < 5 ? 'сезона' : 'сезонов'} · ${winRate}% побед`
            : 'Сыграйте первый сезон!'
          }
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: profileStats.totalSeasons, label: 'Сезоны', color: '#22c55e' },
          { value: profileStats.bestPoints, label: 'Очки', color: '#e2e8f0' },
          { value: profileStats.titles, label: 'Титулы', color: '#f97316' },
          { value: profileStats.perfect, label: '30-0', color: '#fbbf24' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-[#1a1a2e] p-3 text-center border border-[#1a1a2e] card-glow"
          >
            <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[10px] text-[#94a3b8]">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Win Rate Ring + Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Win rate ring */}
        <div className="rounded-2xl bg-[#1a1a2e] p-4 flex flex-col items-center justify-center border border-[#1a1a2e]">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1a1a2e" strokeWidth="3" />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
                strokeDasharray={`${winRate}, 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-[#22c55e]">{winRate}%</span>
            </div>
          </div>
          <div className="text-xs text-[#94a3b8] mt-2">Процент побед</div>
        </div>

        {/* Extra stats */}
        <div className="rounded-2xl bg-[#1a1a2e] p-4 space-y-3 border border-[#1a1a2e]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8]">Всего побед</span>
            <span className="text-sm font-bold text-[#3b82f6]">{profileStats.totalWins}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8]">Всего голов</span>
            <span className="text-sm font-bold text-[#8b5cf6]">{profileStats.totalGoals}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8]">Ср. голов/сезон</span>
            <span className="text-sm font-bold text-[#f97316]">{avgGoals}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8]">Формация</span>
            <span className="text-sm font-bold text-[#e2e8f0]">{profileStats.favoriteFormation}</span>
          </div>
        </div>
      </div>

      {/* Points per Season Chart (last 10) */}
      {recentHistory.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]">
          <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-3">Очки за сезон</h4>
          <div className="flex items-end gap-1.5 h-24">
            {recentHistory.map((h, i) => {
              const height = Math.max((h.points / maxPoints) * 100, 5);
              const isChampion = h.position === 1;
              return (
                <motion.div
                  key={h.id}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className="flex-1 rounded-t-sm relative group cursor-default"
                  style={{ backgroundColor: isChampion ? '#22c55e' : '#3b82f6' }}
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#e2e8f0] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {h.points}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex gap-1.5 mt-1">
            {recentHistory.map((h, i) => (
              <div key={h.id} className="flex-1 text-center text-[8px] text-[#94a3b8]/50">
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Season Form Indicator (last season) */}
      {profileStats.history.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]">
          <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Форма (последний сезон)</h4>
          {(() => {
            const lastSeason = profileStats.history[profileStats.history.length - 1];
            const total = lastSeason.wins + lastSeason.draws + lastSeason.losses;
            const formDots = [];
            for (let i = 0; i < lastSeason.wins && formDots.length < 10; i++) formDots.push('W');
            for (let i = 0; i < lastSeason.draws && formDots.length < 10; i++) formDots.push('D');
            for (let i = 0; i < lastSeason.losses && formDots.length < 10; i++) formDots.push('L');
            // Reorder to show W/D/L proportionally
            const ordered: string[] = [];
            const ratio = total > 0 ? 10 / total : 0;
            let wRemain = lastSeason.wins;
            let dRemain = lastSeason.draws;
            let lRemain = lastSeason.losses;
            for (let i = 0; i < 10 && (wRemain + dRemain + lRemain) > 0; i++) {
              const wShare = wRemain / (wRemain + dRemain + lRemain);
              const dShare = dRemain / (wRemain + dRemain + lRemain);
              const lShare = lRemain / (wRemain + dRemain + lRemain);
              if (wShare >= dShare && wShare >= lShare && wRemain > 0) {
                ordered.push('W');
                wRemain--;
              } else if (dShare >= lShare && dRemain > 0) {
                ordered.push('D');
                dRemain--;
              } else if (lRemain > 0) {
                ordered.push('L');
                lRemain--;
              } else if (wRemain > 0) {
                ordered.push('W');
                wRemain--;
              } else if (dRemain > 0) {
                ordered.push('D');
                dRemain--;
              } else {
                ordered.push('L');
                lRemain--;
              }
            }
            return (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {ordered.map((dot, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{
                        backgroundColor: dot === 'W' ? '#22c55e' : dot === 'D' ? '#f97316' : '#ef4444',
                      }}
                      title={dot === 'W' ? 'Победа' : dot === 'D' ? 'Ничья' : 'Поражение'}
                    >
                      {dot}
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#94a3b8]">
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-[#22c55e]" />В</span>
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-[#f97316]" />Н</span>
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-[#ef4444]" />П</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Trophy Cabinet */}
      <div className="rounded-2xl bg-[#1a1a2e] p-5 border border-[#1a1a2e]">
        <h3 className="text-sm font-bold text-[#e2e8f0] mb-3">🏆 Витрина трофеев</h3>
        <div className="grid grid-cols-4 gap-2">
          {TROPHIES.map((trophy) => {
            const earned = profileStats.achievements.includes(trophy.id);
            return (
              <motion.div
                key={trophy.id}
                whileHover={{ scale: 1.05 }}
                className={`rounded-xl p-2 text-center border transition-all ${
                  earned
                    ? 'bg-[#22c55e]/10 border-[#22c55e]/30'
                    : 'bg-[#0a0a0f]/50 border-[#1a1a2e] opacity-40'
                }`}
              >
                <div className={`text-xl mb-0.5 ${earned ? '' : 'grayscale'}`}>{trophy.icon}</div>
                <div className={`text-[9px] font-bold leading-tight ${earned ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
                  {trophy.name}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {profileStats.history.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] border border-[#1a1a2e] overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#0a0a0f]/30 transition-colors"
          >
            <span className="text-sm font-bold text-[#e2e8f0]">📜 История ({profileStats.history.length})</span>
            <motion.span animate={{ rotate: showHistory ? 180 : 0 }} className="text-[#94a3b8]">
              ▼
            </motion.span>
          </button>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-3 pb-3 max-h-96 overflow-y-auto custom-scrollbar"
            >
              <div className="space-y-2">
                {[...profileStats.history].reverse().map((h, i) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl bg-[#0a0a0f]/30 p-3 border border-[#1a1a2e]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#e2e8f0]">{h.formation}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{
                            color: DIFFICULTY_COLORS[h.difficulty] || '#94a3b8',
                            backgroundColor: `${DIFFICULTY_COLORS[h.difficulty] || '#94a3b8'}20`,
                          }}
                        >
                          {DIFFICULTY_LABELS[h.difficulty] || h.difficulty}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${
                        h.position === 1 ? 'text-[#22c55e]' :
                        h.position <= 3 ? 'text-[#3b82f6]' : 'text-[#94a3b8]'
                      }`}>
                        {h.position === 1 ? '🏆' : h.position <= 3 ? '🥈' : ''} {h.position} место
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] font-bold">{h.wins}В</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f97316]/15 text-[#f97316] font-bold">{h.draws}Н</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444] font-bold">{h.losses}П</span>
                      </div>
                      <span className="text-sm font-black text-[#e2e8f0]">{h.points} очков</span>
                    </div>
                    {h.managerName && (
                      <div className="text-[10px] text-[#94a3b8]/60 mt-1">
                        👨‍💼 {h.managerName}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Action */}
      <Button
        onClick={() => { resetGame(); setScreen('setup'); }}
        className="w-full h-14 text-lg font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20"
      >
        🎮 Новый сезон
      </Button>
    </div>
  );
}
