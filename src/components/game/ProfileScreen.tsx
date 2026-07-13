'use client';

import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import ShareModal from '@/components/share/ShareModal';
import ProfileShareCard from '@/components/share/ProfileShareCard';
import { useTelegram } from '@/hooks/use-telegram';

const TROPHIES = [
  { id: 'perfect_30_0', icon: '🏆', name: '30-0', desc: 'Выиграть все 30 матчей' },
  { id: 'invincible', icon: '🛡️', name: 'Непобедимый', desc: '0 поражений за сезон' },
  { id: 'champion', icon: '🥇', name: 'Чемпион', desc: 'Занять 1-е место' },
  { id: 'top4', icon: '⭐', name: 'Топ-4', desc: 'Попасть в топ-4' },
  { id: 'goal_machine', icon: '⚽', name: 'Голевая машина', desc: '60+ голов за сезон' },
  { id: 'iron_defense', icon: '🧱', name: 'Железная оборона', desc: '20 или менее пропущенных' },
  { id: 'iron_curtain', icon: '🥅', name: 'Железный занавес', desc: '10 или менее пропущенных' },
  { id: 'personal_best', icon: '📈', name: 'Взлёт', desc: 'Новый личный рекорд очков' },
  { id: 'win_streak', icon: '🔥', name: 'Серия побед', desc: '5+ побед подряд' },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Легко',
  normal: 'Нормально',
  hard: 'Сложно',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#00C896',
  normal: '#3b82f6',
  hard: '#ef4444',
};

export default function ProfileScreen() {
  const { profileStats, resetGame, setScreen } = useGameStore();
  const { user, updateDisplayName } = useAuthStore();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const { haptic, notify, showConfirm, isTelegram, showSecondaryButton, hideSecondaryButton, showAlert } = useTelegram();

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

  const shareText = [
    '⚽ Вот моя статистика в 30-0!',
    '',
    `🏆 Лучший результат — ${profileStats.bestPoints} очков`,
    `📈 Побед — ${winRate}%`,
    `🎮 Сыграно сезонов — ${profileStats.totalSeasons}`,
    `🥇 Титулов — ${profileStats.titles}`,
    '',
    'Здесь можно собрать команду мечты из лучших игроков РПЛ разных лет, пройти сезон и проверить, насколько ты разбираешься в российском футболе.',
    '',
    'Попробуй побить мой рекорд 👇',
  ].join('\n');

  const handleSaveName = () => {
    if (editName.trim().length >= 2) {
      updateDisplayName(editName.trim());
      setIsEditingName(false);
      haptic('light');
      notify('success');
      toast.success('Никнейм обновлён!');
    } else {
      haptic('heavy');
      notify('error');
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
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00C896] to-[#00A67A] flex items-center justify-center text-3xl shadow-lg shadow-[#00C896]/20 avatar-conic-ring overflow-hidden">
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
                className="bg-[#141414] border border-[#00C896]/30 rounded-lg px-3 py-1.5 text-sm font-bold text-[#FFFFFF] focus:outline-none focus:border-[#00C896] w-40"
                autoFocus
                maxLength={20}
              />
              <button
                onClick={handleSaveName}
                className="text-xs font-bold text-[#00C896] hover:text-[#00A67A]"
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
              <h2 className="text-xl font-bold text-[#FFFFFF]">{displayName}</h2>
              <button
                onClick={() => { setIsEditingName(true); setEditName(displayName); }}
                className="text-[10px] text-[#64748b] hover:text-[#9CA3AF] transition-colors"
                title="Изменить никнейм"
              >
                ✏️
              </button>
            </>
          )}
        </div>

        <p className="text-sm text-[#9CA3AF] mt-1">
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
          className="rounded-2xl bg-gradient-to-r from-[#00C896]/10 to-[#3b82f6]/10 p-5 border border-[#00C896]/20 flex items-center justify-between"
        >
          <div className="text-center flex-1">
            <div className="text-3xl font-black text-[#00C896]">{profileStats.totalSeasons}</div>
            <div className="text-xs text-[#9CA3AF]">Сезонов</div>
          </div>
          <div className="w-px h-10 bg-[#141414]" />
          <div className="text-center flex-1">
            <div className="text-3xl font-black text-[#FFFFFF]">{profileStats.bestPoints}</div>
            <div className="text-xs text-[#9CA3AF]">Лучший результат</div>
          </div>
          <div className="w-px h-10 bg-[#141414]" />
          <div className="text-center flex-1">
            <div className="text-3xl font-black text-[#f97316]">{profileStats.titles}</div>
            <div className="text-xs text-[#9CA3AF]">Титулов</div>
          </div>
        </motion.div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: profileStats.totalSeasons, label: 'Сезоны', color: '#00C896' },
          { value: profileStats.bestPoints, label: 'Очки', color: '#FFFFFF' },
          { value: profileStats.titles, label: 'Титулы', color: '#f97316' },
          { value: profileStats.perfect, label: '30-0', color: '#fbbf24' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-[#141414] p-3 text-center border border-[#141414] card-glow stat-card-hover"
          >
            <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[10px] text-[#9CA3AF]">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Win Rate Ring + Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Win rate ring */}
        <div className="rounded-2xl bg-[#141414] p-4 flex flex-col items-center justify-center border border-[#141414]">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#141414" strokeWidth="3" />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#00C896"
                strokeWidth="3"
                strokeDasharray={`${winRate}, 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-[#00C896]">{winRate}%</span>
            </div>
          </div>
          <div className="text-xs text-[#9CA3AF] mt-2">Процент побед</div>
        </div>

        {/* Extra stats */}
        <div className="rounded-2xl bg-[#141414] p-4 space-y-3 border border-[#141414]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">Всего побед</span>
            <span className="text-sm font-bold text-[#3b82f6]">{profileStats.totalWins}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">Всего голов</span>
            <span className="text-sm font-bold text-[#8b5cf6]">{profileStats.totalGoals}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">Ср. голов/сезон</span>
            <span className="text-sm font-bold text-[#f97316]">{avgGoals}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">Формация</span>
            <span className="text-sm font-bold text-[#FFFFFF]">{profileStats.favoriteFormation}</span>
          </div>
        </div>
      </div>

      {/* Points per Season Chart (last 10) */}
      {recentHistory.length > 0 && (
        <div className="rounded-2xl bg-[#141414] p-4 border border-[#141414]">
          <h4 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Очки за сезон</h4>
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
                  style={{ backgroundColor: isChampion ? '#00C896' : '#3b82f6' }}
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#FFFFFF] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {h.points}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex gap-1.5 mt-1">
            {recentHistory.map((h, i) => (
              <div key={h.id} className="flex-1 text-center text-[8px] text-[#9CA3AF]/50">
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Season Form Indicator (last season) */}
      {profileStats.history.length > 0 && (
        <div className="rounded-2xl bg-[#141414] p-4 border border-[#141414]">
          <h4 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Форма (последний сезон)</h4>
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
                        backgroundColor: dot === 'W' ? '#00C896' : dot === 'D' ? '#f97316' : '#ef4444',
                      }}
                      title={dot === 'W' ? 'Победа' : dot === 'D' ? 'Ничья' : 'Поражение'}
                    >
                      {dot}
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-[#00C896]" />В</span>
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
          <h3 className="text-sm font-bold text-[#FFFFFF]">🏆 Витрина трофеев</h3>
          <span className="text-xs text-[#9CA3AF]">{earnedTrophies}/{TROPHIES.length}</span>
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
                <div className={`text-[9px] font-bold leading-tight ${earned ? 'text-yellow-400' : 'text-[#9CA3AF]/40'}`}>
                  {trophy.name}
                </div>
                <div className={`text-[8px] leading-tight mt-0.5 ${earned ? 'text-[#9CA3AF]/60' : 'text-[#9CA3AF]/20'}`}>
                  {trophy.desc}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {profileStats.history.length > 0 && (
        <div className="rounded-2xl bg-[#141414] border border-[#141414] overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#0A0A0A]/30 transition-colors"
          >
            <span className="text-sm font-bold text-[#FFFFFF]">📜 История ({profileStats.history.length})</span>
            <motion.span animate={{ rotate: showHistory ? 180 : 0 }} className="text-[#9CA3AF]">
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
                    className={`rounded-xl bg-[#0A0A0A]/30 p-3 border ${
                      h.position === 1
                        ? 'history-border-gold border-[#141414]'
                        : h.position === 2
                        ? 'history-border-silver border-[#141414]'
                        : h.position === 3
                        ? 'history-border-bronze border-[#141414]'
                        : 'history-border-gray border-[#141414]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#FFFFFF]">{h.formation}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{
                            color: DIFFICULTY_COLORS[h.difficulty] || '#9CA3AF',
                            backgroundColor: `${DIFFICULTY_COLORS[h.difficulty] || '#9CA3AF'}20`,
                          }}
                        >
                          {DIFFICULTY_LABELS[h.difficulty] || h.difficulty}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${
                        h.position === 1 ? 'text-[#00C896]' :
                        h.position <= 3 ? 'text-[#3b82f6]' : 'text-[#9CA3AF]'
                      }`}>
                        {h.position === 1 ? '🥇' : h.position === 2 ? '🥈' : h.position === 3 ? '🥉' : ''} {h.position} место
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00C896]/15 text-[#00C896] font-bold">{h.wins}В</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f97316]/15 text-[#f97316] font-bold">{h.draws}Н</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444] font-bold">{h.losses}П</span>
                      </div>
                      <span className="text-sm font-black text-[#FFFFFF]">{h.points} очков</span>
                    </div>
                    {h.managerName && (
                      <div className="text-[10px] text-[#9CA3AF]/60 mt-1">
                        👨‍💼 {h.managerName}
                      </div>
                    )}
                    {h.teamName && (
                      <div className="text-[10px] text-[#9CA3AF]/60 mt-0.5">
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

      {/* Share Profile */}
      <div className="space-y-3">
        <Button
          onClick={() => { haptic('light'); setIsShareOpen(true); }}
          variant="outline"
          className="w-full h-12 text-sm font-bold border-[#2AABEE]/30 text-[#2AABEE] hover:bg-[#2AABEE]/10 rounded-xl"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.02-1.628 4.472-1.636z"/>
          </svg>
          Поделиться в Telegram
        </Button>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        shareText={shareText}
        cardContent={<ProfileShareCard stats={profileStats} />}
      />
    </div>
  );
}
