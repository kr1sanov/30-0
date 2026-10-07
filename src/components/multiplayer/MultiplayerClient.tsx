'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAutoAuth } from '@/hooks/use-telegram-auth';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import TelegramLogin from '@/components/game/TelegramLogin';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useTelegram } from '@/hooks/use-telegram';
import { Draft, Lobby, Results, type Player, type Room, type Spin, type Slot } from './MultiplayerViews';

const card = 'rounded-2xl border border-[#1E1E1E] bg-[#141414] p-5 sm:p-6';
const button = 'rounded-xl bg-[#00C896] px-5 py-3.5 font-bold text-[#07130f] transition hover:bg-[#00A67A] disabled:opacity-40';
const input = 'w-full rounded-xl border border-white/20 bg-[#0A0A0A] px-4 py-3 text-white focus:border-[#00C896] focus:outline-none';

type Menu = {
  activeRoom: { code: string; status: string; deadline: string | null; drafted: number } | null;
  recentRooms: { code: string; date: string; participants: string[]; bots: number; openCode: string | null }[];
};

async function json<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method, cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Ошибка соединения'), { status: response.status });
  return data as T;
}

export default function MultiplayerPage() {
  useAutoAuth();
  const { user, _hasHydrated, updateDisplayName } = useAuthStore();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [busy, setBusy] = useState(false);
  const [joiningLink, setJoiningLink] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const openedLink = useRef('');
  const currentRoomCode = useRef('');
  const { showBackButton, hideBackButton } = useTelegram();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshMenu = useCallback(async () => {
    if (!user) return;
    try { setMenu(await json<Menu>('/api/multiplayer/active')); }
    catch { /* The room remains playable if the menu is unavailable. */ }
  }, [user]);

  useEffect(() => {
    if (!user || code) return;
    void refreshMenu();
    const timer = setInterval(() => void refreshMenu(), 15_000);
    return () => clearInterval(timer);
  }, [user, code, refreshMenu]);

  const openRoom = (nextCode: string) => {
    currentRoomCode.current = nextCode;
    setCode(nextCode);
    setRoom(null);
    setSpin(null);
    setError('');
    history.replaceState(null, '', `/multiplayer?room=${nextCode}`);
  };

  useEffect(() => {
    if (user) setName(current => current || user.displayName);
    const params = new URLSearchParams(location.search);
    const start = params.get('tgWebAppStartParam') ||
      (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } } }).Telegram?.WebApp?.initDataUnsafe?.start_param || '';
    const value = params.get('room') || start.match(/^room_([A-HJ-NP-Z2-9]{6})$/i)?.[1];
    if (!value || !/^[A-HJ-NP-Z2-9]{6}$/i.test(value)) return;
    const nextCode = value.toUpperCase();
    setJoinCode(nextCode);
    if (!user || openedLink.current === `${user.id}:${nextCode}`) return;
    openedLink.current = `${user.id}:${nextCode}`;
    setJoiningLink(true);
    void (async () => {
      try {
        try { await json<Room>(`/api/multiplayer/rooms/${nextCode}`); }
        catch (error) {
          if ((error as Error & { status?: number }).status !== 404) throw error;
          await json('/api/multiplayer/rooms', 'POST', { code: nextCode, name: user.displayName });
        }
        openRoom(nextCode);
      } catch (error) { openedLink.current = ''; setError((error as Error).message); }
      finally { setJoiningLink(false); }
    })();
  }, [user]);

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const value = await json<Room>(`/api/multiplayer/rooms/${code}`);
      if (currentRoomCode.current !== code) return;
      setRoom(value);
      if (value.status === 'completed') setSpin(null);
    } catch (error) { if (currentRoomCode.current === code) setError((error as Error).message); }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [code, refresh]);

  async function action(task: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    setError('');
    try { await task(); return true; }
    catch (error) { setError((error as Error).message); return false; }
    finally { setBusy(false); }
  }

  async function enter(targetCode?: string) {
    await action(async () => {
      const cleanName = name.trim() || user?.displayName || '';
      if (cleanName.length < 2) throw new Error('Введите имя от 2 символов');
      if (cleanName !== user?.displayName) await updateDisplayName(cleanName);
      const result = await json<{ code: string }>('/api/multiplayer/rooms', 'POST', {
        name: cleanName, ...(targetCode ? { code: targetCode } : { maxPlayers: 2 }),
      });
      openRoom(result.code);
    });
  }

  const rematch = (source: string) => void action(async () => {
    const next = await json<{ code: string }>(`/api/multiplayer/rooms/${source}/rematch`, 'POST');
    openRoom(next.code);
  });

  const backToMenu = useCallback(() => {
    currentRoomCode.current = '';
    setCode(''); setRoom(null); setSpin(null); setError('');
    history.replaceState(null, '', '/multiplayer');
    void refreshMenu();
  }, [refreshMenu]);
  useEffect(() => {
    if (!code) return;
    showBackButton(backToMenu);
    return () => hideBackButton(backToMenu);
  }, [code, backToMenu, showBackButton, hideBackButton]);

  const own = room?.seats.find(seat => seat.isYou);
  const run = room?.ownRun;
  const remaining = Math.max(0, Math.ceil(((own?.pickDeadline ? Date.parse(own.pickDeadline) : now) - now) / 1000));
  const updateSettings = (changes: Partial<Room>) => room && void action(async () => {
    await json(`/api/multiplayer/rooms/${room.code}`, 'PATCH', {
      action: 'settings', maxPlayers: room.maxPlayers, ratingMode: room.ratingMode,
      draftMode: room.draftMode, showRatings: room.showRatings, eraFilter: room.eraFilter,
      eraStartYear: room.eraStartYear, eraEndYear: room.eraEndYear, withManager: room.withManager,
      ...changes,
    });
    await refresh();
  });

  const home = () => { location.href = '/'; };
  const profile = () => { useGameStore.getState().setScreen('profile'); location.href = '/'; };

  return <main className="club-theme-shell flex min-h-[100dvh] flex-col bg-[#0A0A0A] text-white">
    <div className="football-field-bg"/>
    <Header onHome={home} onProfile={profile}/>
    <div className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 sm:pb-12 sm:pt-10">
      {error && <div role="alert" className="mx-auto mb-5 max-w-2xl rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-red-200">{error}</div>}

      {!code && !joiningLink && <div className="mx-auto max-w-2xl space-y-5">
        <div className="text-center">
          <h1 className="text-3xl font-black sm:text-4xl">Мультиплеер</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Создайте комнату или сыграйте снова с недавними соперниками.</p>
        </div>

        {menu?.activeRoom && <button onClick={() => openRoom(menu.activeRoom!.code)} className="w-full rounded-2xl border border-[#00C896]/50 bg-[#00C896]/10 p-4 text-left transition hover:bg-[#00C896]/20">
          <span className="flex items-center justify-between gap-3 text-lg font-bold text-[#00C896]">
            <span>▶ Продолжить игру</span>
            {menu.activeRoom.deadline && menu.activeRoom.status === 'drafting' && <span className="font-mono tabular-nums">{Math.floor(Math.max(0, Math.ceil((Date.parse(menu.activeRoom.deadline) - now) / 1000)) / 60)}:{String(Math.max(0, Math.ceil((Date.parse(menu.activeRoom.deadline) - now) / 1000)) % 60).padStart(2, '0')}</span>}
          </span>
          <span className="mt-1 block text-sm text-[#9CA3AF]">{menu.activeRoom.status === 'drafting' ? `${menu.activeRoom.drafted}/11 · Время драфта продолжается` : 'Комната ожидает участников'}</span>
        </button>}

        {!_hasHydrated ? <p className="text-center text-[#9CA3AF]">Проверяем вход…</p> : !user ? <div className={card}>
          <TelegramLogin compact startParam={joinCode ? `room_${joinCode}` : undefined}/>
        </div> : <div className={`${card} space-y-4`}>
          <label className="block text-sm font-semibold">Ваше имя
            <input aria-label="Ваше имя" maxLength={30} value={name} onChange={event => setName(event.target.value)} className={`${input} mt-2`}/>
          </label>
          <button disabled={busy || name.trim().length < 2} onClick={() => void enter()} className={`${button} w-full`}>Создать игру →</button>
          <div className="flex items-center gap-3 text-xs text-[#64748b]"><div className="h-px flex-1 bg-white/10"/>или войдите по коду<div className="h-px flex-1 bg-white/10"/></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input aria-label="Код комнаты" value={joinCode} maxLength={6} onChange={event => setJoinCode(event.target.value.toUpperCase())} className={`${input} uppercase sm:flex-1`} placeholder="Код комнаты"/>
            <button disabled={busy || joinCode.length !== 6 || name.trim().length < 2} onClick={() => void enter(joinCode)} className="rounded-xl border border-white/20 px-5 py-3 font-bold transition hover:bg-white/10 disabled:opacity-40">Войти</button>
          </div>
        </div>}

        {user && menu?.recentRooms && menu.recentRooms.length > 0 && <div className={`${card} space-y-3`}>
          <h2 className="text-base font-bold">Недавние соперники</h2>
          {menu.recentRooms.map(previous => <div key={previous.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0A0A0A] p-3">
            <div className="min-w-0 text-sm"><strong className="block truncate">{previous.participants.join(' · ') || 'Игра с ботами'}{previous.bots && previous.participants.length ? ` · ${previous.bots} бот` : ''}</strong>
              <span className="text-xs text-[#64748b]">{new Date(previous.date).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : 'ru-RU')}</span>
            </div>
            {previous.openCode
              ? <button disabled={busy || name.trim().length < 2} onClick={() => void enter(previous.openCode!)} className="rounded-lg border border-[#00C896]/40 px-3 py-2 text-xs font-bold text-[#00C896] transition hover:bg-[#00C896]/10 disabled:opacity-40">Присоединиться →</button>
              : <button disabled={busy} onClick={() => rematch(previous.code)} className="rounded-lg border border-[#00C896]/40 px-3 py-2 text-xs font-bold text-[#00C896] transition hover:bg-[#00C896]/10 disabled:opacity-40">Повторить →</button>}
          </div>)}
        </div>}
      </div>}

      {joiningLink && <p role="status" className="mx-auto max-w-lg rounded-xl border border-[#00C896]/30 bg-[#00C896]/10 p-4 text-center text-[#00C896]">Открываем комнату {joinCode}…</p>}
      {code && <button onClick={backToMenu} className="mb-5 text-sm font-semibold text-[#9CA3AF] hover:text-white">← К списку игр</button>}
      {code && !room && <p className="text-center text-[#9CA3AF]">Загружаем комнату {code}…</p>}
      {code && room?.status === 'lobby' && <Lobby room={room} busy={busy}
        onSeat={(ready, formation) => void action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', { action: 'seat', ready, formation, name }); await refresh(); })}
        onSettings={updateSettings}
        onBot={() => void action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', { action: 'bot' }); await refresh(); })}
        onRemoveBot={botId => void action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', { action: 'remove-bot', botId }); await refresh(); })}
        onStart={() => void action(async () => { await json(`/api/multiplayer/rooms/${code}/start`, 'POST'); await refresh(); })}/>}
      {code && room?.status === 'drafting' && run && <>
        <h1 className="sr-only">Драфт · комната {room.code}</h1>
        <Draft room={room} run={run} spin={spin} busy={busy} remaining={remaining}
          onSpin={async target => { await action(async () => { setSpin(await json<Spin>(`/api/runs/${run.id}/spin`, 'POST', target ? { targetSlotPosition: target.slotPosition } : undefined)); }); }}
          onReroll={async target => { await action(async () => { const next = await json<Spin>(`/api/runs/${run.id}/reroll`, 'POST', target ? { targetSlotPosition: target.slotPosition } : undefined); setSpin(next); await refresh(); }); }}
          onPick={(player: Player, slot: Slot) => action(async () => { await json(`/api/runs/${run.id}/draft`, 'POST', { playerSeasonId: player.playerSeasonId, slotPosition: slot.slotPosition }); setSpin(null); await refresh(); })}
          onMove={(from: Slot, to: Slot) => void action(async () => { await json(`/api/runs/${run.id}/swap`, 'POST', { fromSlotPosition: from.slotPosition, toSlotPosition: to.slotPosition }); await refresh(); })}
          onSkip={() => setSpin(null)} onFinish={() => void action(async () => { await json(`/api/multiplayer/rooms/${room.code}/finish`, 'POST'); await refresh(); })}/>
      </>}
      {code && room?.status === 'completed' && <Results room={room} run={run || null} onReplay={() => rematch(room.code)}/>}
      {code && room && !['lobby', 'drafting', 'completed'].includes(room.status) && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[#9CA3AF]">Готовим сезон…</motion.p>}
    </div>
    <Footer onHome={home} onPlay={home} onProfile={profile}/>
  </main>;
}
