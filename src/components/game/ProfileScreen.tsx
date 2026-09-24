'use client';

import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Metrics } from '@/lib/metrics';

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
  { id: 'minimalist', icon: '🎯', name: 'Минималист', desc: 'Сезон без перебросов' },
  { id: 'hard_champion', icon: '💎', name: 'Бриллиант', desc: 'Чемпион на сложности' },
  { id: 'squad_builder', icon: '🏗️', name: 'Архитектор', desc: 'Средний рейтинг 80+' },
  { id: 'centurion', icon: '💯', name: 'Центурион', desc: '100+ очков за сезон' },
  { id: 'clean_sheet', icon: '🧤', name: 'Сухарь', desc: '10+ сухих матчей' },
  { id: 'comeback_king', icon: '👑', name: 'Король камбэков', desc: '5+ побед после пропуска' },
  { id: 'globetrotter', icon: '🌍', name: 'Путешественник', desc: 'Игроки 5+ национальностей' },
  { id: 'veteran', icon: '🎖️', name: 'Ветеран', desc: '10+ сезонов сыграно' },
  { id: 'legend', icon: '🌟', name: 'Легенда', desc: '3+ чемпионских титула' },
  { id: 'marathon_5', icon: '🏃', name: 'Пятая дистанция', desc: 'Сыграть 5 сезонов' },
  { id: 'marathon_25', icon: '🦁', name: 'Главный ветеран', desc: 'Сыграть 25 сезонов' },
  { id: 'hundred_wins', icon: '💯', name: 'Клуб ста побед', desc: '100 побед за карьеру' },
  { id: 'three_hundred_wins', icon: '🏅', name: 'Победитель', desc: '300 побед за карьеру' },
  { id: 'goal_collector', icon: '🥅', name: 'Коллекционер голов', desc: '500 голов за карьеру' },
  { id: 'three_titles', icon: '👑', name: 'Династия', desc: '5 чемпионских титулов' },
  { id: 'points_1000', icon: '📊', name: 'Тысяча очков', desc: '1 000 очков за карьеру' },
  { id: 'perfect_twice', icon: '✨', name: 'Безупречная серия', desc: 'Два идеальных сезона' },
  { id: 'top_four_10', icon: '🎖️', name: 'Постоянство', desc: '10 раз попасть в топ-4' },
  { id: 'referral_invite', icon: '🤝', name: 'Первый приглашённый', desc: 'Пригласить первого игрока в 30-0' },
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
  const { profileStats, resetGame, setScreen, setAvatarEmoji } = useGameStore();
  const { user, updateDisplayName, resetProfile, updateNotificationCadence } = useAuthStore();
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [showAvatarChoices, setShowAvatarChoices] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [notificationCadence, setNotificationCadence] = useState(user?.notificationCadence || 'weekly');
  const [referrals, setReferrals] = useState<{ referralCount: number; inviteUrl: string | null; referredUsers: Array<{ displayName: string; username: string | null; createdAt: string }> } | null>(null);
  useEffect(() => { fetch('/api/auth/telegram').then(r => r.json()).then(data => { if (typeof data.botUsername === 'string') setBotUsername(data.botUsername); }).catch(() => undefined); }, []);
  useEffect(() => { if (user) fetch('/api/referrals').then(r => r.ok ? r.json() : null).then(data => { if (data && typeof data.referralCount === 'number') setReferrals(data); }).catch(() => undefined); }, [user]);

  // Track profile open in Metrika
  useEffect(() => { Metrics.profileOpen(); }, []);

  const winRate = profileStats.totalSeasons > 0
    ? Math.round((profileStats.totalWins / (profileStats.totalSeasons * 30)) * 100)
    : 0;

  const avgGoals = profileStats.totalSeasons > 0
    ? Math.round(profileStats.totalGoals / profileStats.totalSeasons)
    : 0;

  // Total earned trophies
  const hasReferralAchievement = (referrals?.referralCount ?? 0) > 0;
  const hasTrophy = (id: string) => id === 'referral_invite' ? hasReferralAchievement : profileStats.achievements.includes(id);
  const earnedTrophies = TROPHIES.filter(t => hasTrophy(t.id)).length;

  const handleSaveName = async () => {
    if (editName.trim().length >= 2) {
      try {
        await updateDisplayName(editName.trim());
        setIsEditingName(false);
        toast.success('Никнейм обновлён!');
      } catch { toast.error('Не удалось сохранить имя'); }
    } else {
      toast.error('Минимум 2 символа');
    }
  };

  // Local profile — no avatar URL from external provider
  const displayName = user?.displayName || 'Игрок';

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in pb-8">
      {/* Header with avatar */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative inline-block"
        >
          <button
            type="button"
            onClick={() => setShowAvatarChoices((open) => !open)}
            aria-label="Выбрать аватар"
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00C896] to-[#00A67A] flex items-center justify-center text-3xl shadow-lg shadow-[#00C896]/20 avatar-conic-ring overflow-hidden"
          >
            {profileStats.avatarEmoji || '⚽'}
          </button>
          {profileStats.titles > 0 && (
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm shadow-lg">
              🏆
            </div>
          )}
        </motion.div>
        {showAvatarChoices && (
          <div className="mx-auto mt-3 grid max-w-xs grid-cols-8 gap-1 rounded-xl border border-[#1E1E1E] bg-[#141414] p-2" aria-label="Выберите эмодзи">
            {['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥊', '🏆', '🏅', '🤸', '🏋️', '🚴', '🏃', '🤾', '🧑', '👨', '👩', '🙂', '😎', '🤩', '🥳', '😄', '🧔'].map((emoji) => (
              <button key={emoji} type="button" onClick={() => { setAvatarEmoji(emoji); setShowAvatarChoices(false); }} className="rounded-lg p-1.5 text-xl hover:bg-[#00C896]/15" aria-label={`Выбрать ${emoji}`}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Display name with edit button */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="ym-disable-keys bg-[#141414] border border-[#00C896]/30 rounded-lg px-3 py-1.5 text-sm font-bold text-[#FFFFFF] focus:outline-none focus:border-[#00C896] w-40"
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

        <p className="text-sm text-[#9CA3AF] mt-1">Игрок 30-0</p>
      </div>

      {/* Local profile info + reset button */}
      <div className="flex items-center justify-center gap-3 py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00C896]/10 border border-[#00C896]/20">
          <span className="text-xs" aria-hidden="true">✈️</span>
          <span className="text-xs font-medium text-[#00C896]">Авторизован через Telegram</span>
        </div>
        <button
          onClick={async () => {
            try { await resetProfile(); }
            catch { toast.error('Не удалось выйти'); }
          }}
          className="text-xs text-[#9CA3AF] hover:text-[#ef4444] transition-colors"
        >
          Выйти
        </button>
      </div>

      {/* Карьерная статистика: каждый показатель показывается один раз */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {[
          { value: profileStats.totalSeasons, label: 'Сезоны', color: '#00C896' },
          { value: profileStats.bestPoints, label: 'Лучший результат', color: '#FFFFFF' },
          { value: profileStats.titles, label: 'Титулы', color: '#f97316' },
          { value: profileStats.perfect, label: '30-0', color: '#fbbf24' },
          { value: `${winRate}%`, label: 'Процент побед', color: '#00C896' },
          { value: profileStats.totalWins, label: 'Всего побед', color: '#3b82f6' },
          { value: profileStats.totalGoals, label: 'Всего голов', color: '#8b5cf6' },
          { value: avgGoals, label: 'Среднее голов за сезон', color: '#f97316' },
          { value: profileStats.favoriteFormation || '—', label: 'Часто используемая схема', color: '#FFFFFF' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl bg-[#141414] p-3 text-center border border-[#141414] card-glow stat-card-hover"
          >
            <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[10px] text-[#9CA3AF]">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Referrals */}
      <section className="rounded-2xl border border-[#00C896]/20 bg-[#141414] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">🤝 Приглашай игроков</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">Поделитесь ссылкой. Здесь будет расти статистика приглашённых; за первого игрока открывается ачивка.</p>
          </div>
          <div className="rounded-xl bg-[#00C896]/10 px-4 py-2 text-center">
            <div className="text-xl font-black text-[#00C896]">{referrals?.referralCount ?? '—'}</div>
            <div className="text-[10px] text-[#9CA3AF]">игроков пришло</div>
          </div>
        </div>
        {referrals?.inviteUrl ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input readOnly aria-label="Реферальная ссылка" value={referrals.inviteUrl} className="min-w-0 flex-1 rounded-lg border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-xs text-[#d1d5db]" />
            <Button onClick={async () => { try { await navigator.clipboard.writeText(referrals.inviteUrl!); toast.success('Ссылка скопирована'); } catch { toast.error('Не удалось скопировать ссылку'); } }} className="bg-[#00C896] text-black hover:bg-[#00b386]">Скопировать ссылку</Button>
          </div>
        ) : <p className="mt-3 text-xs text-[#64748b]">Загружаем вашу ссылку…</p>}
        {referrals?.referredUsers.length ? <div className="mt-4 border-t border-[#252525] pt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Последние приглашённые</p><ul className="space-y-1">{referrals.referredUsers.map((invite, index) => <li key={`${invite.username ?? invite.displayName}-${index}`} className="text-xs text-[#9CA3AF]">{invite.displayName}{invite.username ? ` · @${invite.username}` : ''}</li>)}</ul></div> : null}
        <p className="mt-3 text-[10px] text-[#64748b]">Награды за приглашения пока не начисляются.</p>
      </section>

      {/* Trophy Cabinet */}
      <div className="rounded-2xl p-5 border glass-showcase">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#FFFFFF]">🏆 Витрина трофеев</h3>
          <span className="text-xs text-[#9CA3AF]">{earnedTrophies}/{TROPHIES.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {TROPHIES.map((trophy) => {
            const earned = hasTrophy(trophy.id);
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

      {/* Telegram notifications */}
      {user && (
        <section className="rounded-2xl border border-[#242424] bg-[#141414] p-4 space-y-3">
          <div>
            <h3 className="font-bold">Уведомления в Telegram</h3>
            <p className="text-xs text-[#9CA3AF] mt-1">Результаты сезона и редкие напоминания. Чтобы получать сообщения, сначала нажмите «Старт» у бота.</p>
          </div>
          {!user.telegramChatStarted && botUsername && (
            <a href={`https://t.me/${botUsername}?start=notifications`} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-[#229ED9] px-4 py-2 text-sm font-bold text-white">Открыть бота</a>
          )}
          <label className="flex items-center justify-between gap-3 rounded-xl bg-[#0A0A0A] p-3 text-sm">
            <span>Присылать уведомления</span>
            <input type="checkbox" checked={user.telegramNotificationsEnabled} onChange={async (event) => {
              const enabled = event.currentTarget.checked;
              try { await useAuthStore.getState().updateTelegramNotifications(enabled); }
              catch { toast.error('Не удалось сохранить настройки'); }
            }} className="h-5 w-5 accent-[#00C896]" />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-[#9CA3AF]">
            <span>Частота напоминаний</span>
            <select value={notificationCadence} onChange={async (event) => {
              const cadence = event.currentTarget.value; setNotificationCadence(cadence);
              try { await updateNotificationCadence(cadence); } catch { setNotificationCadence(user.notificationCadence || 'weekly'); toast.error('Не удалось сохранить частоту'); }
            }} className="rounded-lg border border-[#333] bg-[#0A0A0A] px-3 py-2 text-white">
              <option value="daily">Ежедневно</option><option value="weekly">Раз в неделю</option><option value="monthly">Раз в месяц</option>
            </select>
          </label>
        </section>
      )}

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
                    role="button"
                    tabIndex={0}
                    onClick={() => { localStorage.setItem('30-0-selected-run', h.id); setScreen('history'); }}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { localStorage.setItem('30-0-selected-run', h.id); setScreen('history'); } }}
                    className={`rounded-xl bg-[#0A0A0A]/30 p-3 border cursor-pointer hover:bg-[#1b1b1b] transition-colors ${
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
                    <div className="mt-2 text-[10px] font-semibold text-[#00C896]">Открыть сезон и поделиться →</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
