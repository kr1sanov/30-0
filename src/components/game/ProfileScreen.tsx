'use client';

import { useGameStore } from '@/store/gameStore';
import HistoryScreen from '@/components/game/HistoryScreen';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Metrics } from '@/lib/metrics';
import { useTelegram } from '@/hooks/use-telegram';
import { AVATARS, STYLES } from '@/lib/profileEconomy';
import Link from 'next/link';

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
  { id: 'samba_attack', icon: '🇧🇷', name: 'Самба в атаке', desc: '3 бразильца в составе и 50 голов команды за сезон' },
  { id: 'russian_core', icon: '🇷🇺', name: 'Русский костяк', desc: 'Чемпионство с 7 россиянами в составе' },
  { id: 'army_season', icon: '🔴', name: 'Армейский сезон', desc: '20 побед за ЦСКА в режиме «Один клуб»' },
  { id: 'neva_attack', icon: '🌊', name: 'Невская атака', desc: '60 голов за «Зенит» в режиме «Один клуб»' },
  { id: 'vagner_legend', icon: '❤️', name: 'Вагнер навсегда', desc: 'Стань чемпионом в челлендже Вагнера Лава' },
  { id: 'dzyuba_record', icon: '🎯', name: 'Голевая эпоха', desc: 'Стань чемпионом с Дзюбой и забей командой 60 голов' },
  { id: 'referral_invite', icon: '🤝', name: 'Первый приглашённый', desc: 'Пригласить первого игрока в 30-0' },
  { id: 'multiplayer_series_champion', icon: '🏅', name: 'Победитель серии', desc: 'Выиграть серию сезонов в мультиплеере' },
  { id: 'club_crown', icon: '👑', name: 'Верность цветам', desc: 'Стать чемпионом с одним клубом' },
  { id: 'club_unbeaten', icon: '🛡️', name: 'Неприступная крепость', desc: 'Стать чемпионом своего клуба без поражений' },
  { id: 'club_attack', icon: '🚀', name: 'Трибуны ликуют', desc: 'Стать чемпионом своего клуба с 60 голами' },
  { id: 'club_collector', icon: '🧭', name: 'Три герба', desc: 'Стать чемпионом с тремя разными клубами' },
  { id: 'duel_winner', icon: '⚔️', name: 'Первый вызов', desc: 'Выиграть сезон против живого соперника' },
  { id: 'duel_unbeaten', icon: '🧱', name: 'Стена в дерби', desc: 'Выиграть мультиплеерный сезон без поражений' },
  { id: 'duel_hat_trick', icon: '🎩', name: 'Хет-трик дуэлей', desc: 'Трижды выиграть сезон против игроков' },
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
  const { isTelegram } = useTelegram();
  const { profileStats, resetGame, setScreen, setAvatarEmoji } = useGameStore();
  const { user, updateDisplayName, resetProfile } = useAuthStore();
  const [showHistory, setShowHistory] = useState(false);
  const [showTrophies, setShowTrophies] = useState(false);
  const [deleteAfterAt, setDeleteAfterAt] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [deletionBusy, setDeletionBusy] = useState(false);
  useEffect(() => {
    fetch('/api/users/deletion').then(r => r.ok ? r.json() : null).then(data => setDeleteAfterAt(data?.deleteAfterAt ?? null)).catch(() => undefined);
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [showAvatarChoices, setShowAvatarChoices] = useState(false);
  const [referrals, setReferrals] = useState<{ referralCount: number; inviteUrl: string | null; telegramInviteUrl: string | null; referredUsers: Array<{ displayName: string; username: string | null; createdAt: string }> } | null>(null);
  useEffect(() => { if (user) fetch('/api/referrals').then(r => r.ok ? r.json() : null).then(data => { if (data && typeof data.referralCount === 'number') setReferrals(data); }).catch(() => undefined); }, [user]);
  type Economy = { tokenBalance: number; selectedAvatar: string; profileStyle: string; unlocks: string[] };
  type Friend = { id: string; displayName: string; selectedAvatar: string; username: string | null };
  const [economy, setEconomy] = useState<Economy | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [extraAchievements, setExtraAchievements] = useState<string[]>([]);
  const [trophyMode, setTrophyMode] = useState('classic');
  useEffect(() => { if (!user) return;
    void fetch('/api/social/profile').then(r => r.ok ? r.json() : null).then(setEconomy).catch(() => undefined);
    void fetch('/api/social/friends').then(r => r.ok ? r.json() : null).then(data => setFriends(data?.friends ?? [])).catch(() => undefined);
    void fetch('/api/social/achievements').then(r => r.ok ? r.json() : null).then(data => setExtraAchievements(data?.ids ?? [])).catch(() => undefined);
  }, [user]);
  const chooseItem = async (kind: 'avatar' | 'style', key: string) => {
    const response = await fetch('/api/social/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, key }) });
    const data = await response.json();
    if (!response.ok) { toast.error(data.error || 'Не удалось выбрать оформление'); return; }
    setEconomy(previous => previous && ({ ...previous, ...data, unlocks: [...previous.unlocks, `${kind}:${key}`] }));
    if (kind === 'avatar') { setAvatarEmoji(AVATARS.find(a => a.key === key)?.emoji ?? '⚽'); setShowAvatarChoices(false); }
    toast.success('Оформление обновлено');
  };
  const [seriesWins, setSeriesWins] = useState(0);
  useEffect(() => { if (user) fetch('/api/multiplayer/series/stats').then(r => r.ok ? r.json() : null).then(data => setSeriesWins(data?.seriesWins ?? 0)).catch(() => undefined); }, [user]);

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
  const referralLink = isTelegram ? referrals?.telegramInviteUrl : referrals?.inviteUrl;
  const hasTrophy = (id: string) => id === 'referral_invite' ? hasReferralAchievement : id === 'multiplayer_series_champion' ? seriesWins > 0 : profileStats.achievements.includes(id) || extraAchievements.includes(id);
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
    <div className={`mx-auto max-w-4xl space-y-6 animate-fade-in rounded-3xl border p-3 pb-8 sm:p-5 ${economy?.profileStyle === 'gold' ? 'border-amber-500/35 bg-gradient-to-b from-amber-950/25 to-transparent' : economy?.profileStyle === 'night' ? 'border-indigo-400/35 bg-gradient-to-b from-indigo-950/30 to-transparent' : economy?.profileStyle === 'pitch' ? 'border-emerald-400/35 bg-gradient-to-b from-emerald-950/30 to-transparent' : 'border-transparent'}`}>
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
            {AVATARS.find(a => a.key === economy?.selectedAvatar)?.emoji ?? profileStats.avatarEmoji ?? '⚽'}
          </button>
          {profileStats.titles > 0 && (
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm shadow-lg">
              🏆
            </div>
          )}
        </motion.div>
        {showAvatarChoices && <div className="mx-auto mt-3 max-w-lg rounded-xl border border-[#00C896]/20 bg-[#141414] p-3 text-left">
          <div className="mb-2 text-xs font-bold text-white">Аватары · 3 бесплатных</div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{AVATARS.map(item => { const unlocked = !item.price || economy?.unlocks.includes(`avatar:${item.key}`); return <button key={item.key} type="button" onClick={() => void chooseItem('avatar', item.key)} className={`rounded-xl border p-2 text-center text-xl transition hover:border-[#00C896] ${economy?.selectedAvatar === item.key ? 'border-[#00C896] bg-[#00C896]/15' : 'border-white/10'}`} title={item.ru} aria-label={`${item.ru}, ${unlocked ? 'доступен' : `${item.price} токенов`}`}>{item.emoji}<span className="block text-[9px] text-slate-400">{unlocked ? item.ru : `${item.price} 🪙`}</span></button>; })}</div>
        </div>}

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

      {user && <div className="flex flex-wrap justify-center gap-2 text-xs"><Link href={`/players/${encodeURIComponent(user.id)}`} className="rounded-lg border border-[#00C896]/35 px-3 py-2 text-[#00C896]">Открыть публичный профиль</Link><button onClick={() => void navigator.clipboard.writeText(`${location.origin}/players/${encodeURIComponent(user.id)}`).then(() => toast.success('Ссылка на профиль скопирована'))} className="rounded-lg border border-white/20 px-3 py-2 text-white">Поделиться профилем</button></div>}
      {/* Local profile info + reset button */}
      <div className="flex items-center justify-center gap-3 py-2">
        <span role="status" className="inline-flex items-center gap-2 rounded-lg bg-[#229ED9] px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-[#229ED9]/20">
          <svg aria-hidden="true" viewBox="0 0 240 240" className="h-5 w-5 shrink-0">
            <circle cx="120" cy="120" r="120" fill="#229ED9" />
            <path fill="#fff" d="m49 116 137-53c7-3 13 2 10 11l-23 111c-2 8-7 10-14 6l-38-28-18 18c-3 3-6 3-7 0l4-40 73-66c3-3-1-4-5-2l-90 57-39-12c-9-3-9-9 2-12Z" />
          </svg>
          <span>Авторизован через Telegram</span>
        </span>
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
            <h3 className="text-sm font-bold text-white">Приглашай друзей</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">Поделись ссылкой — здесь появятся твои друзья.</p>
          </div>
          <div className="rounded-xl bg-[#00C896]/10 px-4 py-2 text-center">
            <div className="text-xl font-black text-[#00C896]">{referrals?.referralCount ?? '—'}</div>
            <div className="text-[10px] text-[#9CA3AF]">игроков пришло</div>
          </div>
        </div>
        {referralLink ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input readOnly aria-label="Реферальная ссылка" value={referralLink} className="min-w-0 flex-1 rounded-lg border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-xs text-[#d1d5db]" />
            <Button onClick={async () => { try { await navigator.clipboard.writeText(referralLink); toast.success('Ссылка скопирована'); } catch { toast.error('Не удалось скопировать ссылку'); } }} className="bg-[#00C896] text-black hover:bg-[#00b386]">Скопировать ссылку</Button>
          </div>
        ) : <p className="mt-3 text-xs text-[#64748b]">Загружаем твою ссылку…</p>}
        {referrals?.referredUsers.length ? (
          <div className="mt-4 border-t border-[#252525] pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Присоединились по ссылке</p>
            <ul className="space-y-1.5">
              {referrals.referredUsers.map((invite, index) => (
                <li key={`${invite.username ?? invite.displayName}-${index}`} className="flex items-center justify-between gap-3 text-xs text-[#D1D5DB]">
                  <span className="truncate">{invite.displayName || 'Игрок'}{invite.username ? ` · @${invite.username}` : ''}</span>
                  <span className="shrink-0 text-[#64748b]">{new Date(invite.createdAt).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#00C896]/25 bg-[#141414] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-white">🪙 Токены и оформление</h3><p className="mt-1 text-xs text-slate-400">Чемпион: драфт +20, один клуб +25, челлендж +30; мультиплеер +35 с игроком или +15 с ботом. Остальные результаты не начисляют токены.</p></div><strong className="shrink-0 text-xl text-[#00C896]">{economy?.tokenBalance ?? '—'} 🪙</strong></div>
        <h4 className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Стили профиля</h4>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{STYLES.map(item => <button key={item.key} onClick={() => void chooseItem('style', item.key)} className={`rounded-xl border px-3 py-3 text-xs ${economy?.profileStyle === item.key ? 'border-[#00C896] bg-[#00C896]/15 text-white' : 'border-white/10 text-slate-300'}`}>{item.ru}<span className="block pt-1 text-[#00C896]">{!item.price || economy?.unlocks.includes(`style:${item.key}`) ? 'Доступен' : `${item.price} 🪙`}</span></button>)}</div>
        <p className="mt-3 text-[11px] text-slate-500">Токены сохраняются в аккаунте. Позже ими можно будет открывать новые режимы и архивные челленджи.</p>
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5"><h3 className="font-bold text-white">Друзья · {friends.length}</h3>
        {friends.length ? <div className="mt-3 flex flex-wrap gap-2">{friends.map(friend => <Link key={friend.id} href={`/players/${friend.id}`} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white hover:border-[#00C896]">{AVATARS.find(a => a.key === friend.selectedAvatar)?.emoji ?? '⚽'} {friend.displayName}</Link>)}</div> : <p className="mt-2 text-xs text-slate-400">Открой ссылку на профиль игрока, чтобы добавить его в друзья.</p>}
        <Link href="/multiplayer" className="mt-3 inline-block text-xs font-semibold text-[#00C896]">Пригласить друзей в мультиплеер →</Link>
      </section>

      {/* Trophy Cabinet */}
      <div className="rounded-2xl p-5 border glass-showcase">
        <button type="button" onClick={() => setShowTrophies(open => !open)} aria-expanded={showTrophies} className="flex w-full items-center justify-between text-left">
          <h3 className="text-sm font-bold text-[#FFFFFF]">🏆 Витрина трофеев</h3>
          <span className="text-xs text-[#9CA3AF]">{earnedTrophies}/{TROPHIES.length} {showTrophies ? '▲' : '▼'}</span>
        </button>
        {showTrophies && <div className="mt-4">
          <div className="mb-4 flex flex-wrap gap-2">{[['classic', 'Обычный драфт'], ['single_club', 'Один клуб'], ['challenge', 'Челленджи'], ['multiplayer', 'Мультиплеер'], ['social', 'Профиль']].map(([key, label]) => <button key={key} onClick={() => setTrophyMode(key)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${trophyMode === key ? 'border-[#00C896] bg-[#00C896]/15 text-[#00C896]' : 'border-white/10 text-slate-400'}`}>{label}</button>)}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{TROPHIES.filter(trophy => {
            if (trophyMode === 'single_club') return trophy.id.startsWith('club_') || ['army_season', 'neva_attack'].includes(trophy.id);
            if (trophyMode === 'multiplayer') return trophy.id.startsWith('duel_') || trophy.id === 'multiplayer_series_champion';
            if (trophyMode === 'challenge') return ['vagner_legend', 'dzyuba_record'].includes(trophy.id);
            if (trophyMode === 'social') return trophy.id === 'referral_invite';
            return !['army_season', 'neva_attack', 'vagner_legend', 'dzyuba_record', 'referral_invite', 'multiplayer_series_champion'].includes(trophy.id) && !trophy.id.startsWith('club_') && !trophy.id.startsWith('duel_');
          }).map(trophy => { const earned = hasTrophy(trophy.id); return <motion.div key={trophy.id} whileHover={{ scale: 1.03 }} className={`relative rounded-xl border p-3 text-center ${earned ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-white/10 bg-black/20 opacity-50'}`}><div className="text-2xl">{earned ? trophy.icon : '🔒'}</div><div className="mt-1 text-xs font-bold text-white">{trophy.name}</div><p className="mt-1 text-[10px] text-slate-400">{trophy.desc}</p></motion.div>; })}</div>
        </div>}

      </div>

      {/* History */}
      {(
        <div className="rounded-2xl bg-[#141414] border border-[#141414] overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#0A0A0A]/30 transition-colors"
          >
            <span className="text-sm font-bold text-[#FFFFFF]">📜 История</span>
            <motion.span animate={{ rotate: showHistory ? 180 : 0 }} className="text-[#9CA3AF]">
              ▼
            </motion.span>
          </button>
          {showHistory && <div className="px-3 pb-3"><HistoryScreen embedded /></div>}
        </div>
      )}
      <div className="border-t border-white/5 pt-5 text-center">
        {deleteAfterAt ? (
          <div className="space-y-2 text-xs text-[#9CA3AF]">
            <p>Удаление профиля запланировано на {new Date(deleteAfterAt).toLocaleString('ru-RU')}.</p>
            <p>Осталось {Math.max(0, Math.ceil((new Date(deleteAfterAt).getTime() - clock) / 86400000))} дн. До удаления прогресс сохраняется.</p>
            <button disabled={deletionBusy} onClick={async () => {
              setDeletionBusy(true);
              try { const res = await fetch('/api/users/deletion', { method: 'DELETE' }); if (!res.ok) throw new Error(); setDeleteAfterAt(null); toast.success('Профиль восстановлен вместе с прогрессом'); }
              catch { toast.error('Срок восстановления истёк или сервер недоступен'); }
              finally { setDeletionBusy(false); }
            }} className="rounded-lg border border-[#00C896]/40 px-4 py-2 text-[#00C896]">Восстановить профиль</button>
          </div>
        ) : (
          <button disabled={deletionBusy} onClick={async () => {
            if (!window.confirm('Запланировать удаление профиля через 7 дней? После этого история сезонов, составы и прогресс будут удалены. До окончания срока можно восстановить профиль без потери прогресса.')) return;
            setDeletionBusy(true);
            try { const res = await fetch('/api/users/deletion', { method: 'POST' }); if (!res.ok) throw new Error(); const data = await res.json(); setDeleteAfterAt(data.deleteAfterAt); toast.info('Удаление запланировано. Ты можешь восстановить профиль в течение недели.'); }
            catch { toast.error('Не удалось запланировать удаление'); }
            finally { setDeletionBusy(false); }
          }} className="text-xs text-[#64748b] underline underline-offset-4 hover:text-[#ef4444]">Удалить профиль</button>
        )}
      </div>
    </div>
  );
}
