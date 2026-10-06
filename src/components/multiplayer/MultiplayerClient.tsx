'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useAutoAuth } from '@/hooks/use-telegram-auth';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import TelegramLogin from '@/components/game/TelegramLogin';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Draft, Lobby, Results, type Player, type Room, type Spin, type Slot } from './MultiplayerViews';

const card = 'rounded-2xl border border-[#1E1E1E] bg-[#141414] p-6';
const button = 'rounded-xl bg-[#00C896] px-5 py-3.5 font-bold text-[#07130f] transition hover:bg-[#00A67A] disabled:opacity-40';
const input = 'w-full rounded-xl border border-white/20 bg-[#0A0A0A] px-4 py-3 text-white focus:border-[#00C896] focus:outline-none';

async function json<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Ошибка соединения'), { status: response.status });
  return data as T;
}

export default function MultiplayerPage() {
  useAutoAuth();
  const { user, _hasHydrated, updateDisplayName } = useAuthStore();
  const [stage, setStage] = useState<'landing' | 'entry'>('landing');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const autoJoinAttempted = useRef('');
  const [inviteCode, setInviteCode] = useState('');
  const [joiningInvite, setJoiningInvite] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    if (user) setName(current => current || (user.username && user.displayName === user.firstName ? `@${user.username}` : user.displayName));
    const params = new URLSearchParams(location.search);
    const telegramStart = params.get('tgWebAppStartParam') || (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } } }).Telegram?.WebApp?.initDataUnsafe?.start_param || '';
    const invite = params.get('room') || telegramStart.match(/^room_([A-HJ-NP-Z2-9]{6})$/i)?.[1];
    if (invite && /^[A-HJ-NP-Z2-9]{6}$/i.test(invite)) {
      const normalized = invite.toUpperCase();
      setJoinCode(normalized); setInviteCode(normalized); setStage('entry');
      if (user && autoJoinAttempted.current !== `${user.id}:${normalized}`) {
        autoJoinAttempted.current = `${user.id}:${normalized}`;
        setJoiningInvite(true);
        void (async () => {
          try {
            let value: Room;
            try { value = await json<Room>(`/api/multiplayer/rooms/${normalized}`); }
            catch (error) {
              if ((error as Error & { status?: number }).status !== 404) throw error;
              await json('/api/multiplayer/rooms', 'POST', { code: normalized, name: user.displayName });
              value = await json<Room>(`/api/multiplayer/rooms/${normalized}`);
            }
            setRoom(value); setCode(normalized); setError('');
          } catch (e) { setError((e as Error).message); }
          finally { setJoiningInvite(false); }
        })();
      }
    }
  }, [user]);

  const refresh = useCallback(async () => {
    if (!code) return;
    try { const value = await json<Room>(`/api/multiplayer/rooms/${code}`); setRoom(value); if (value.status === 'completed') setSpin(null); }
    catch (e) { setError((e as Error).message); }
  }, [code]);
  useEffect(() => {
    if (!code) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [code, refresh]);

  async function action(task: () => Promise<void>) {
    setBusy(true); setError('');
    try { await task(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function enter(invite?: string) {
    await action(async () => {
      const cleanName = name.trim();
      if (cleanName !== user?.displayName) await updateDisplayName(cleanName);
      const result = await json<{ code: string }>('/api/multiplayer/rooms', 'POST', { name: cleanName, ...(invite ? { code: invite } : { maxPlayers: 2 }) });
      setCode(result.code);
      history.replaceState(null, '', `/multiplayer?room=${result.code}`);
    });
  }
  async function seatUpdate(ready: boolean, formation: string) {
    if (!room) return;
    await action(async () => { await json(`/api/multiplayer/rooms/${room.code}`, 'PATCH', { action: 'seat', ready, formation, name }); await refresh(); });
  }
  const own = room?.seats.find(seat => seat.isYou);
  const run = room?.ownRun;
  const remaining = Math.max(0, Math.ceil(((own?.pickDeadline ? Date.parse(own.pickDeadline) : now) - now) / 1000));
  const updateSettings = (changes: Partial<Room>) => room && void action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', {
    action: 'settings', maxPlayers: room.maxPlayers, ratingMode: room.ratingMode, eraStartYear: room.eraStartYear,
    eraEndYear: room.eraEndYear, withManager: room.withManager, ...changes,
  }); await refresh(); });

  const home = () => { location.href = '/'; };
  const profile = () => { useGameStore.getState().setScreen('profile'); location.href = '/'; };
  return <main className="club-theme-shell flex min-h-[100dvh] flex-col bg-[#0A0A0A] text-white">
    <div className="football-field-bg"/>
    <Header onHome={home} onProfile={profile}/>
    <div className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-9 sm:pb-12 sm:pt-12">
      {error && <div role="alert" className="mx-auto mb-5 max-w-2xl rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-red-200">{error}</div>}
      {!code && stage === 'landing' && <div className="mx-auto max-w-xl text-center"><span className="text-xs font-bold uppercase tracking-[.25em] text-emerald-400">Играй вместе</span><h1 className="mb-3 mt-3 text-4xl font-black sm:text-5xl">Мультиплеер</h1><p className="mb-10 text-slate-400">Соберите лучший состав и сыграйте сезон с друзьями.</p><button onClick={() => setStage('entry')} className={`${card} w-full text-left transition hover:border-emerald-400`}><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><Users size={25}/></span><strong className="text-xl">Live драфт</strong><p className="my-3 leading-6 text-slate-400">2–6 участников одновременно выбирают футболистов. Сравните результаты после 30 матчей РПЛ.</p><span className="font-semibold text-emerald-400">Играть →</span></button></div>}
      {joiningInvite && <p role="status" className="mx-auto max-w-lg rounded-xl border border-[#00C896]/30 bg-[#00C896]/10 p-4 text-center text-[#00C896]">Подключаем к комнате {inviteCode}…</p>}
      {!code && !joiningInvite && stage === 'entry' && <div className="mx-auto max-w-lg"><button onClick={() => setStage('landing')} className="mb-6 text-sm text-slate-400 hover:text-white">← Режимы</button><div className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-400">Мультиплеер · Live драфт</div><h1 className="mb-3 text-3xl font-black">Сыграй с другом</h1><p className="mb-8 text-slate-400">Создайте команду из 11 игроков и узнайте, чей сезон окажется лучше.</p>{!_hasHydrated ? <p>Проверяем вход…</p> : !user ? <div className={card}><p className="mb-4">Для живого драфта войдите через Telegram.</p><TelegramLogin startParam={inviteCode ? `room_${inviteCode}` : undefined}/></div> : <div className="space-y-5"><label className="block text-sm font-semibold">Ваше имя<input aria-label="Ваше имя" maxLength={30} value={name} onChange={e => setName(e.target.value)} className={`${input} mt-2`} /></label><button disabled={busy || name.trim().length < 2} onClick={() => void enter()} className={`${button} w-full`}>Создать комнату →</button><div className={`${card} space-y-3`}><h2 className="font-bold">Есть код приглашения?</h2><input aria-label="Код комнаты" value={joinCode} maxLength={6} onChange={e => setJoinCode(e.target.value.toUpperCase())} className={`${input} uppercase`} placeholder="Код из 6 символов" /><button disabled={busy || joinCode.length !== 6 || name.trim().length < 2} onClick={() => void enter(joinCode)} className="w-full rounded-xl border border-white/20 py-3 font-bold transition hover:bg-white/10 disabled:opacity-40">Войти в комнату</button></div></div>}</div>}
      {code && !room && <p className="text-center text-slate-400">Загружаем комнату {code}…</p>}
      {room?.status === 'lobby' && <Lobby room={room} busy={busy} onSeat={(ready, formation) => void seatUpdate(ready, formation)} onSettings={updateSettings} onBot={() => void action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', { action:'bot' }); await refresh(); })} onRemoveBot={botId => void action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', { action:'remove-bot', botId }); await refresh(); })} onStart={() => void action(async () => { await json(`/api/multiplayer/rooms/${code}/start`, 'POST'); await refresh(); })}/>}
      {room?.status === 'drafting' && run && <><div className="mb-6 text-center"><div className="text-xs font-bold uppercase tracking-widest text-emerald-400">Комната {room.code}</div><h1 className="mt-1 text-3xl font-black">Драфт с друзьями</h1></div><Draft room={room} run={run} spin={spin} busy={busy} remaining={remaining} onSpin={() => void action(async () => { setSpin(await json<Spin>(`/api/runs/${run.id}/spin`, 'POST')); })} onPick={(player: Player, slot: Slot) => void action(async () => { await json(`/api/runs/${run.id}/draft`, 'POST', { playerSeasonId: player.playerSeasonId, slotPosition: slot.slotPosition }); setSpin(null); await refresh(); })} onSkip={() => setSpin(null)} onFinish={() => void action(async () => { await json(`/api/multiplayer/rooms/${room.code}/finish`, 'POST'); await refresh(); })}/></>}
      {room?.status === 'completed' && <Results room={room} run={run || null}/>}
      {room && !['lobby','drafting','completed'].includes(room.status) && <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-center text-slate-400">Готовим сезон…</motion.p>}
    </div>
    <Footer onHome={home} onPlay={home} onProfile={profile}/>
  </main>;
}
