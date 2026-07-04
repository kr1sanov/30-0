'use client';

import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

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
  const { user, updateDisplayName } = useAuthStore();
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');

  const winRate = profileStats.totalSeasons > 0
    ? Math.round((profileStats.totalWins / (profileStats.totalSeasons * 30)) * 100)
    : 0;

  const avgGoals = profileStats.totalSeasons > 0
    ? Math.round(profileStats.totalGoals / profileStats.totalSeasons)
    : 0;

  // Points chart data (last 10 seasons)
  const recentHistory = profileStats.history.slice(-10);
  const maxPoints = useMemo(() => Math.max(...recentHistory.map(h => h.points), 90), [recentHistory]);

  // Total earned trophies
  const earnedTrophies = TROPHIES.filter(t => profileStats.achievements.includes(t.id)).length;

  const handleShareProfile = () => {
    const lines = [
      '👤 Профиль 30-0 RPL',
      `📊 ${profileStats.totalSeasons} ${profileStats.totalSeasons === 1 ? 'сезон' : profileStats.totalSeasons < 5 ? 'сезона' : 'сезонов'}`,
      `🏆 Титулов: ${profileStats.titles}`,
      `✨ Идеальных 30-0: ${profileStats.perfect}`,
      `⭐ Лучший результат: ${profileStats.bestPoints} очков`,
      `🎯 Побед: ${profileStats.totalWins} · Голов: ${profileStats.totalGoals}`,
      `🏅 Достижений: ${earnedTrophies}/${TROPHIES.length}`,
    ];
    if (profileStats.favoriteFormation) {
      lines.push(`📐 Любимая формация: ${profileStats.favoriteFormation}`);
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
        // fall through
      }
    }

    if (navigator.share) {
      navigator.share({ title: '30-0 RPL — Профиль', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('📋 Профиль скопирован!');
      }).catch(() => {});
    }
  };

  const handleSaveName = () => {
    if (editName.trim().length >= 2) {
      updateDisplayName(editName.trim());
      setIsEditingName(false);
      toast.success('Никнейм обновлён!');
    } else {
      toast.error('Минимум 2 символа');
    }
  };

  // Avatar source — Telegram photo or fallback
  const avatarUrl = user?.photoUrl;
  const displayName = user?.displayName || 'Игрок';

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header with avatar */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative inline-block"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-3xl shadow-lg shadow-[#22c55e]/20 avatar-conic-ring overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              '⚽'
            )}
          </div>
          {profileStats.titles > 0 && (
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm shadow-lg">
              🏆
            </div>
          )}
        </motion.div>

        {/* Display name with edit button */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="bg-[#0d2d0d] border border-[#22c55e]/30 rounded-lg px-3 py-1.5 text-sm font-bold text-[#e2e8f0] focus:outline-none focus:border-[#22c55e] w-40"
                autoFocus
                maxLength={20}
              />
              <button
                onClick={handleSaveName}
                className="text-xs font-bold text-[#22c55e] hover:text-[#16a34a]"
              >
                ✓
              </button>
              <button
                onClick={() => { setIsEditingName(false); setEditName(user?.displayName || ''); }}
                className="text-xs font-bold text-[#ef4444] hover:text-[#dc2626]"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#e2e8f0]">{displayName}</h2>
              <button
                onClick={() => { setIsEditingName(true); setEditName(displayName); }}
                className="text-[10px] text-[#64748b] hover:text-[#94a3b8] transition-colors"
                title="Изменить никнейм"
              >
                ✏️
              </button>
            </>
          )}
        </div>

        <p className="text-sm text-[#94a3b8] mt-1">
          {profileStats.totalSeasons > 0
            ? `${profileStats.totalSeasons} ${profileStats.totalSeasons === 1 ? 'сезон' : profileStats.totalSeasons < 5 ? 'сезона' : 'сезонов'} · ${winRate}% побед`
            : 'Сыграйте первый сезон!'
          }
        </p>
      </div>

      {/* Prominent Season Count + Best Result */}
      {profileStats.totalSeasons > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-r from-[#22c55e]/10 to-[#3b82f6]/10 p-5 border border-[#22c55e]/20 flex items-center justify-between"
        >
          <div className="text-center flex-1">
            <div className="text-3xl font-black text-[#22c55e]">{profileStats.totalSeasons}</div>
            <div className="text-xs text-[#94a3b8]">Сезонов</div>
          </div>
          <div className="w-px h-10 bg-[#0d2d0d]" />
          <div className="text-center flex-1">
            <div className="text-3xl font-black text-[#e2e8f0]">{profileStats.bestPoints}</div>
            <div className="text-xs text-[#94a3b8]">Лучший результат</div>
          </div>
          <div className="w-px h-10 bg-[#0d2d0d]" />
          <div className="text-center flex-1">
            <div className="text-3xl font-black text-[#f97316]">{profileStats.titles}</div>
            <div className="text-xs text-[#94a3b8]">Титулов</div>
          </div>
        </motion.div>
      )}

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
            className="rounded-2xl bg-[#0d2d0d] p-3 text-center border border-[#0d2d0d] card-glow stat-card-hover"
          >
            <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[10px] text-[#94a3b8]">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Win Rate Ring + Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Win rate ring */}
        <div className="rounded-2xl bg-[#0d2d0d] p-4 flex flex-col items-center justify-center border border-[#0d2d0d]">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0d2d0d" strokeWidth="3" />
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
        <div className="rounded-2xl bg-[#0d2d0d] p-4 space-y-3 border border-[#0d2d0d]">
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
        <div className="rounded-2xl bg-[#0d2d0d] p-4 border border-[#0d2d0d]">
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
        <div className="rounded-2xl bg-[#0d2d0d] p-4 border border-[#0d2d0d]">
          <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Форма (последний сезон)</h4>
          {(() => {
            const lastSeason = profileStats.history[profileStats.history.length - 1];
            const total = lastSeason.wins + lastSeason.draws + lastSeason.losses;
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
      <div className="rounded-2xl p-5 border glass-showcase">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#e2e8f0]">🏆 Витрина трофеев</h3>
          <span className="text-xs text-[#94a3b8]">{earnedTrophies}/{TROPHIES.length}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TROPHIES.map((trophy) => {
            const earned = profileStats.achievements.includes(trophy.id);
            return (
              <motion.div
                key={trophy.id}
                whileHover={{ scale: earned ? 1.08 : 1.02 }}
                className={`rounded-xl p-2 text-center border transition-all relative ${
                  earned
                    ? 'bg-gradient-to-b from-yellow-500/15 to-yellow-500/5 border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.15)] trophy-shimmer'
                    : 'frosted-glass'
                }`}
              >
                {earned ? (
                  <div className="text-xl mb-0.5 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]">{trophy.icon}</div>
                ) : (
                  <div className="relative text-xl mb-0.5 grayscale opacity-40">
                    {trophy.icon}
                    <span className="absolute inset-0 flex items-center justify-center text-xs">🔒</span>
                  </div>
                )}
                <div className={`text-[9px] font-bold leading-tight ${earned ? 'text-yellow-400' : 'text-[#94a3b8]/40'}`}>
                  {trophy.name}
                </div>
                <div className={`text-[8px] leading-tight mt-0.5 ${earned ? 'text-[#94a3b8]/60' : 'text-[#94a3b8]/20'}`}>
                  {trophy.desc}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {profileStats.history.length > 0 && (
        <div className="rounded-2xl bg-[#0d2d0d] border border-[#0d2d0d] overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#0a1a0a]/30 transition-colors"
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
                    className={`rounded-xl bg-[#0a1a0a]/30 p-3 border ${
                      h.position === 1
                        ? 'history-border-gold border-[#0d2d0d]'
                        : h.position === 2
                        ? 'history-border-silver border-[#0d2d0d]'
                        : h.position === 3
                        ? 'history-border-bronze border-[#0d2d0d]'
                        : 'history-border-gray border-[#0d2d0d]'
                    }`}
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
                        {h.position === 1 ? '🥇' : h.position === 2 ? '🥈' : h.position === 3 ? '🥉' : ''} {h.position} место
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
                    {h.teamName && (
                      <div className="text-[10px] text-[#94a3b8]/60 mt-0.5">
                        ⚽ {h.teamName}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Share Profile — NO Reset Stats, NO New Season buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleShareProfile}
          variant="outline"
          className="w-full h-12 text-sm font-bold border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-xl btn-rainbow-hover"
        >
          📤 Поделиться профилем
        </Button>
      </div>
    </div>
  );
}
