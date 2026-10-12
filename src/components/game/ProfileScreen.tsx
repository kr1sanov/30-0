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
import Link from 'next/link';
import { playerPath, AVATAR_COLORS, STATUS_EMOJIS } from '@/lib/profileLinks';
import { telegramWebApp } from '@/hooks/use-telegram';
import TelegramAvatar from './TelegramAvatar';
import { TROPHIES } from '@/lib/trophyCatalog';


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
  const { profileStats, resetGame, setScreen } = useGameStore();
  const { user, resetProfile } = useAuthStore();
  const [showHistory, setShowHistory] = useState(false);
  const [showTrophies, setShowTrophies] = useState(false);
  const [showCosmetics, setShowCosmetics] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);
  const [deleteAfterAt, setDeleteAfterAt] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [deletionBusy, setDeletionBusy] = useState(false);
  useEffect(() => {
    fetch('/api/users/deletion').then(r => r.ok ? r.json() : null).then(data => setDeleteAfterAt(data?.deleteAfterAt ?? null)).catch(() => undefined);
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [referrals, setReferrals] = useState<{ referralCount: number; inviteUrl: string | null; telegramInviteUrl: string | null; referredUsers: Array<{ id: string; displayName: string; username: string | null; createdAt: string }> } | null>(null);
  useEffect(() => { if (user) fetch('/api/referrals').then(r => r.ok ? r.json() : null).then(data => { if (data && typeof data.referralCount === 'number') setReferrals(data); }).catch(() => undefined); }, [user]);
  type Friend = { id: string; displayName: string; username: string | null; avatarColor: string; statusEmoji: string };
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Friend[]>([]);
  const [outgoing, setOutgoing] = useState<Friend[]>([]);
  const [suggestions, setSuggestions] = useState<Friend[]>([]);
  const [avatarColor, setAvatarColor] = useState('#00C896');
  const [statusEmoji, setStatusEmoji] = useState('🏆');
  const loadFriends = () => void fetch('/api/social/friends').then(r => r.ok ? r.json() : null).then(data => { if (data) { setFriends(data.friends ?? []); setIncoming(data.incoming ?? []); setOutgoing(data.outgoing ?? []); setSuggestions(data.suggestions ?? []); } }).catch(() => undefined);
  const updateStyle = async (changes: { avatarColor?: string; statusEmoji?: string }) => { const response = await fetch('/api/social/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }); if (!response.ok) { toast.error('Не удалось обновить профиль'); return; } const data = await response.json(); setAvatarColor(data.avatarColor); setStatusEmoji(data.statusEmoji); };
  const respondFriend = async (id: string, action: 'accept' | 'decline') => { const response = await fetch('/api/social/friends', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) }); if (response.ok) loadFriends(); else toast.error('Не удалось обработать заявку'); };
  useEffect(() => { if (!user) return; fetch('/api/social/players/' + encodeURIComponent(user.id)).then(r => r.ok ? r.json() : null).then(data => { if (data) { setAvatarColor(data.avatarColor); setStatusEmoji(data.statusEmoji); } }).catch(() => undefined); }, [user]);
  const [extraAchievements, setExtraAchievements] = useState<string[]>([]);
  const [trophyMode, setTrophyMode] = useState('classic');
  useEffect(() => { if (!user) return;
    loadFriends();
    void fetch('/api/social/achievements').then(r => r.ok ? r.json() : null).then(data => setExtraAchievements(data?.ids ?? [])).catch(() => undefined);
  }, [user]);
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

  const displayName = user?.username ? `@${user.username}` : user?.displayName || 'Игрок';
  const profileUrl = user ? `${typeof location === 'undefined' ? 'https://30-0.рф' : location.origin}${playerPath(user)}` : '';
  const shareProfile = async () => { const app = telegramWebApp(); if (app?.openTelegramLink) { const deepLink = `https://t.me/RPL30_bot?startapp=profile_${encodeURIComponent(user?.username || user?.id || '')}`; app.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent('Посмотри мой профиль в 30-0')}`); } else { try { await navigator.clipboard.writeText(profileUrl); toast.success('Ссылка на профиль скопирована'); } catch { toast.error('Не удалось скопировать ссылку'); } } };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in rounded-3xl border border-transparent p-3 pb-8 sm:p-5">
      {/* Header with avatar */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative inline-block"
        >
          <button type="button" onClick={() => setShowCosmetics(true)} aria-label="Настроить аватар и статус" className="rounded-full"><TelegramAvatar username={user?.username} name={displayName} color={avatarColor} size={80} /></button>
          {statusEmoji && (
            <button type="button" onClick={() => setShowCosmetics(true)} aria-label="Изменить статус" className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm shadow-lg">
              {statusEmoji}
            </button>
          )}
        </motion.div>
        <h2 className="mt-3 text-xl font-bold text-white">{displayName}</h2>
        {(user?.firstName || user?.lastName) && <p className="mt-1 text-sm text-slate-300">{[user.firstName, user.lastName].filter(Boolean).join(' ')}</p>}
        <p className="text-sm text-[#9CA3AF] mt-1">Игрок 30-0</p>
      </div>
      {showCosmetics && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setShowCosmetics(false); }}><div role="dialog" aria-modal="true" aria-label="Аватар и статус" className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#171717] p-5 text-center shadow-2xl"><div className="flex items-center justify-between"><h3 className="font-bold text-white">Аватар и статус</h3><button type="button" aria-label="Закрыть" onClick={() => setShowCosmetics(false)}>✕</button></div><p className="mt-5 text-sm text-slate-400">Цвет аватара</p><div className="mt-3 flex flex-wrap justify-center gap-3">{AVATAR_COLORS.map(color => <button key={color} type="button" aria-label={`Цвет аватара ${color}`} aria-pressed={avatarColor === color} onClick={() => void updateStyle({ avatarColor: color })} className={`h-9 w-9 rounded-full ${avatarColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#171717]' : ''}`} style={{ backgroundColor: color }}/>)}</div><p className="mt-6 text-sm text-slate-400">Статус</p><div className="mt-3 flex flex-wrap justify-center gap-2">{STATUS_EMOJIS.map(emoji => <button key={emoji} type="button" aria-label={`Статус ${emoji}`} aria-pressed={statusEmoji === emoji} onClick={() => void updateStyle({ statusEmoji: emoji })} className={`rounded-lg border px-2 py-1 text-lg ${statusEmoji === emoji ? 'border-[#00C896]' : 'border-white/10'}`}>{emoji}</button>)}</div></div></div>}

      {user && <div className="flex flex-wrap justify-center gap-2 text-xs"><Link href={playerPath(user)} className="rounded-lg border border-[#00C896]/35 px-3 py-2 text-[#00C896]">Открыть публичный профиль</Link><button onClick={() => void shareProfile()} className="rounded-lg border border-white/20 px-3 py-2 text-white">Поделиться профилем</button></div>}
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

      <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white">Друзья · {friends.length}</h3>
        <p className="mt-1 text-xs text-slate-400">Знакомые по игре и заявки в друзья.</p>
        {incoming.length > 0 && <div className="mt-4 border-t border-white/10 pt-3"><h4 className="mb-2 font-semibold text-white">Заявки в друзья · {incoming.length}</h4><div className="space-y-2">{incoming.map(friend => <div key={friend.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 p-2"><Link href={playerPath(friend)} className="flex min-w-0 flex-1 items-center gap-2 text-sm text-white"><TelegramAvatar username={friend.username} name={friend.displayName} color={friend.avatarColor} size={32}/><span className="truncate">{friend.username ? `@${friend.username}` : friend.displayName}</span></Link><button onClick={() => void respondFriend(friend.id, 'accept')} className="rounded-lg bg-[#00C896] px-3 py-2 text-xs font-bold text-black">Принять</button><button onClick={() => void respondFriend(friend.id, 'decline')} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Отклонить</button></div>)}</div></div>}
        <div className="mt-4 border-t border-white/10 pt-3"><h4 className="font-semibold text-white">Твои друзья</h4>{friends.length ? <div className="mt-2 flex flex-wrap gap-2">{friends.map(friend => <Link key={friend.id} href={playerPath(friend)} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white hover:border-[#00C896]"><TelegramAvatar username={friend.username} name={friend.displayName} color={friend.avatarColor} size={28}/>{friend.username ? `@${friend.username}` : friend.displayName}</Link>)}</div> : <p className="mt-2 text-xs text-slate-400">Пока никого нет. Открой профиль игрока и отправь заявку.</p>}</div>
        {outgoing.length > 0 && <div className="mt-4"><h4 className="text-xs font-semibold text-slate-400">Отправленные заявки</h4><div className="mt-2 flex flex-wrap gap-2">{outgoing.map(friend => <Link key={friend.id} href={playerPath(friend)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">{friend.username ? `@${friend.username}` : friend.displayName} · ожидает</Link>)}</div></div>}
        {suggestions.length > 0 && <div className="mt-4"><h4 className="text-xs font-semibold text-slate-400">Игроки, с которыми ты играл или которых пригласил</h4><div className="mt-2 flex flex-wrap gap-2">{suggestions.map(friend => <Link key={friend.id} href={playerPath(friend)} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300"><TelegramAvatar username={friend.username} name={friend.displayName} color={friend.avatarColor} size={24}/>{friend.username ? `@${friend.username}` : friend.displayName}</Link>)}</div></div>}
      </section>

      {/* Trophy Cabinet */}
      <div className="rounded-2xl p-5 border glass-showcase">
        <button type="button" onClick={() => setShowTrophies(open => !open)} aria-expanded={showTrophies} className="flex w-full items-center justify-between text-left">
          <h3 className="text-sm font-bold text-[#FFFFFF]">🏆 Достижения</h3>
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

      {/* Referrals */}
      <section className="rounded-2xl border border-[#00C896]/20 bg-[#141414] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={() => setShowReferrals(value => !value)} aria-expanded={showReferrals} className="text-left text-sm font-bold text-white">Приглашения · {referrals?.referralCount ?? 0} {showReferrals ? "▲" : "▼"}</button>
            <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">Пригласи игрока по ссылке.</p>
          </div>
          <div className="rounded-xl bg-[#00C896]/10 px-4 py-2 text-center">
            <div className="text-xl font-black text-[#00C896]">{referrals?.referralCount ?? '—'}</div>
            <div className="text-[10px] text-[#9CA3AF]">игроков пришло</div>
          </div>
        </div>
        {showReferrals && <div>{referralLink ? (
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
                <li key={`${invite.id}-${index}`} className="flex items-center justify-between gap-3 text-xs text-[#D1D5DB]">
                  <Link href={playerPath(invite)} className="truncate text-[#00C896] hover:underline">{invite.username ? `@${invite.username}` : invite.displayName || 'Игрок'}</Link>
                  <span className="shrink-0 text-[#64748b]">{new Date(invite.createdAt).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Link href="/multiplayer" className="mt-4 inline-block text-xs font-semibold text-[#00C896]">Перейти в мультиплеер →</Link></div>}
      </section>

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
