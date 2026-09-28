'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAutoAuth } from '@/hooks/use-telegram-auth';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { canFillSlot, FORMATIONS, POSITION_CATEGORY, type Position } from '@/lib/positions';
import TelegramLogin from '@/components/game/TelegramLogin';

type Slot = { slotPosition: string; playerSeasonId: string | null; playerLastName: string | null; playerRating: number | null };
type Run = { id: string; formation: string; completed: boolean; slots: Slot[] };
type Seat = { id: string; name: string; formation: string; ready: boolean; drafted: number; result: { wins: number; draws: number; losses: number; points: number; overallRating: number } | null; isYou: boolean; isHost: boolean };
type Room = { code: string; status: string; maxPlayers: number; ratingMode: string; eraStartYear: number; eraEndYear: number; isHost: boolean; seats: Seat[]; ownRun: Run | null };
type Player = { playerSeasonId: string; fullName: string; lastName: string; rating: number; primeRating: number; mainPosition: string; otherPositions: string[] };
type Spin = { clubName: string; seasonLabel: string; players: Player[] };

const box = 'rounded-2xl border border-white/10 bg-[#171a20] p-5';
const button = 'rounded-xl bg-[#30c798] px-5 py-3 font-bold text-[#06120f] disabled:opacity-40 hover:bg-[#50dfaf]';
const input = 'w-full rounded-xl border border-white/20 bg-[#0d1015] px-4 py-3 text-white';

async function json<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Ошибка соединения');
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
  const [maxPlayers, setMaxPlayers] = useState(2);

  useEffect(() => {
    if (user) setName(current => current || (user.username && user.displayName === user.firstName ? `@${user.username}` : user.displayName));
    const invite = new URLSearchParams(location.search).get('room');
    if (invite && /^[A-HJ-NP-Z2-9]{6}$/i.test(invite)) { setJoinCode(invite.toUpperCase()); setStage('entry'); }
  }, [user]);

  const refresh = useCallback(async () => {
    if (!code) return;
    try { setRoom(await json<Room>(`/api/multiplayer/rooms/${code}`)); }
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
      const result = await json<{ code: string }>('/api/multiplayer/rooms', 'POST', { name: cleanName, ...(invite ? { code: invite } : { maxPlayers }) });
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
  const filled = run?.slots.filter(slot => slot.playerSeasonId).length ?? 0;

  return <main className="min-h-screen bg-[#0a0c11] text-white pb-20">
    <header className="border-b border-white/10 px-5 py-4 flex justify-between max-w-6xl mx-auto"><a href="/" className="text-sm text-gray-300 hover:text-white">⌂ Домой</a><button onClick={() => { useGameStore.getState().setScreen('profile'); location.href = '/'; }} className="text-sm text-gray-300 hover:text-white">♙ Мой профиль</button></header>
    <div className="mx-auto max-w-5xl px-4 py-12">
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-red-200">{error}</div>}
      {!code && stage === 'landing' && <div className="text-center">
        <h1 className="text-4xl font-black mb-3">Многопользовательский режим</h1><p className="text-gray-400 mb-10">Три способа определить, кто создаст лучшую команду.</p>
        <div className="grid gap-4 sm:grid-cols-2 text-left">
          <button onClick={() => setStage('entry')} className={`${box} hover:border-[#30c798] text-left`}><strong className="text-xl">🔴 Живой драфт</strong><p className="text-gray-400 mt-3">До шести менеджеров собирают составы одновременно и сравнивают результаты сезонов.</p><span className="text-[#30c798]">Играть →</span></button>
          <div className={`${box} opacity-70`}><strong className="text-xl">🏆 Лиги</strong><p className="text-gray-400 mt-3">Асинхронные драфты и общая турнирная таблица.</p><span className="text-gray-400">Скоро</span></div>
        </div>
      </div>}
      {!code && stage === 'entry' && <div className="mx-auto max-w-lg">
        <button onClick={() => setStage('landing')} className="text-gray-400 mb-6">← Режимы</button>
        <div className="text-sm text-[#30c798] mb-2">Многопользовательский режим · Бета</div><h1 className="text-3xl font-bold mb-3">Сыграй с другом</h1><p className="text-gray-400 mb-8">Соберите команды из 11 игроков, сыграйте сезон и сравните очки.</p>
        {!_hasHydrated ? <p>Проверяем вход…</p> : !user ? <div className={box}><p className="mb-4">Для живого драфта войдите через Telegram.</p><TelegramLogin /></div> : <div className="space-y-5">
          <label className="block">Ваше имя<input aria-label="Ваше имя" maxLength={30} value={name} onChange={e => setName(e.target.value)} className={`${input} mt-2`} /></label>
          <div className={box}><h2 className="font-bold mb-3">🔴 Новая игра в прямом эфире</h2><label>Менеджеров: {maxPlayers}<input type="range" min={2} max={6} value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className="block w-full my-4 accent-[#30c798]" /></label><button disabled={busy || name.trim().length < 2} onClick={() => void enter()} className={`${button} w-full`}>Создать комнату</button></div>
          <div className={box}><h2 className="font-bold mb-3">Присоединиться по коду</h2><input aria-label="Код комнаты" value={joinCode} maxLength={6} onChange={e => setJoinCode(e.target.value.toUpperCase())} className={`${input} mb-3 uppercase`} placeholder="Код из 6 символов" /><button disabled={busy || joinCode.length !== 6 || name.trim().length < 2} onClick={() => void enter(joinCode)} className={`${button} w-full`}>Войти в комнату</button></div>
        </div>}
      </div>}
      {code && !room && <p className="text-center">Загружаем комнату {code}…</p>}
      {room && <div>
        <div className="flex flex-wrap justify-between gap-3 mb-7"><div><div className="text-sm text-[#30c798]">Живой драфт · {room.code}</div><h1 className="text-3xl font-bold">{room.status === 'lobby' ? 'Комната ожидания' : 'Драфт с друзьями'}</h1></div><button className="text-gray-300 underline" onClick={() => void navigator.clipboard.writeText(`${location.origin}/multiplayer?room=${room.code}`)}>Скопировать приглашение</button></div>
        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <aside className={box}><h2 className="font-bold mb-4">Участники · {room.seats.length}/{room.maxPlayers}</h2><div className="space-y-2">{room.seats.map(seat => <div key={seat.id} className="rounded-lg bg-white/5 p-3 flex justify-between gap-2"><span>{seat.name} {seat.isHost ? '👑' : ''} {seat.isYou ? '(вы)' : ''}</span><span className="text-[#30c798]">{room.status === 'lobby' ? seat.ready ? 'Готов' : 'Ожидает' : `${seat.drafted}/11`}</span></div>)}</div>
          {room.status === 'lobby' && <div className="mt-6 space-y-4"><label className="block">Ваша схема<select value={own?.formation || '4-3-3'} onChange={e => void seatUpdate(false, e.target.value)} className={`${input} mt-2`}>{FORMATIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label><button disabled={busy} onClick={() => void seatUpdate(!own?.ready, own?.formation || '4-3-3')} className={`${button} w-full`}>{own?.ready ? 'Отменить готовность' : 'Я готов'}</button>
          {room.isHost && <><label className="block">Мест: {room.maxPlayers}<input type="range" min={room.seats.length} max={6} value={room.maxPlayers} onChange={e => void action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', { action: 'settings', maxPlayers: Number(e.target.value), eraStartYear: room.eraStartYear, eraEndYear: room.eraEndYear, ratingMode: room.ratingMode }); await refresh(); })} className="block w-full accent-[#30c798]" /></label><label className="block">Рейтинг<select value={room.ratingMode} onChange={e => void action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', { action: 'settings', maxPlayers: room.maxPlayers, eraStartYear: room.eraStartYear, eraEndYear: room.eraEndYear, ratingMode: e.target.value }); await refresh(); })} className={`${input} mt-2`}><option value="season">Сезон</option><option value="prime">Прайм</option></select></label><label className="block">Период<select value={`${room.eraStartYear}-${room.eraEndYear}`} onChange={e => void action(async () => { const [eraStartYear, eraEndYear] = e.target.value.split('-').map(Number); await json(`/api/multiplayer/rooms/${code}`, 'PATCH', { action: 'settings', maxPlayers: room.maxPlayers, eraStartYear, eraEndYear, ratingMode: room.ratingMode }); await refresh(); })} className={`${input} mt-2`}><option value="2010-2026">2010–2026</option><option value="2010-2018">2010–2018</option><option value="2019-2026">2019–2026</option><option value="2024-2026">2024–2026</option></select></label><button disabled={busy || room.seats.length < 2 || room.seats.some(seat => !seat.ready)} onClick={() => void action(async () => { await json(`/api/multiplayer/rooms/${code}/start`, 'POST'); await refresh(); })} className={`${button} w-full`}>Начать драфт</button></>}</div>}
          </aside>
          <section className={box}>{room.status === 'lobby' ? <><h2 className="text-xl font-bold mb-3">Пригласи друзей</h2><p className="text-gray-400 mb-4">Отправь код {room.code} или ссылку. Каждый выбирает схему и отмечает готовность. Драфт начнётся одновременно.</p><div className="text-sm text-gray-400">Правила: {room.ratingMode === 'prime' ? 'Прайм' : 'Рейтинг сезона'} · {room.eraStartYear}–{room.eraEndYear} · 1 переброс</div></> : run ? <>
            <h2 className="text-xl font-bold mb-2">Ваш состав · {filled}/11</h2><p className="text-gray-400 mb-5">{run.formation} · {room.ratingMode === 'prime' ? 'Прайм' : 'Сезон'}</p>
            <div className="rounded-xl border border-green-400/30 bg-[repeating-linear-gradient(180deg,#125832_0px,#125832_56px,#17663b_56px,#17663b_112px)] p-4 grid grid-cols-4 gap-3 mb-6 min-h-[360px] items-center">
              {run.slots.map(slot => { const pos = slot.slotPosition.split('_')[0] as Position; const color = ({ gk: '#fb923c', def: '#60a5fa', mid: '#34d399', att: '#f87171' })[POSITION_CATEGORY[pos]]; return <div key={slot.slotPosition} className="text-center min-w-0"><div className="mx-auto rounded-full border-2 w-11 h-11 flex items-center justify-center font-bold text-xs" style={{ background: color, borderColor: '#fff8', color: '#101820' }}>{slot.playerRating ?? pos}</div><span className="text-[11px] font-bold break-words">{slot.playerLastName || pos}</span></div>; })}
            </div>
            {run.completed ? <p className="text-[#30c798] font-bold">Сезон сыгран. Ожидаем результаты остальных.</p> : filled === 11 ? <button disabled={busy} className={button} onClick={() => void action(async () => { await json(`/api/runs/${run.id}/simulate`, 'POST', {}); await refresh(); })}>Сыграть сезон</button> : <><button disabled={busy} className={button} onClick={() => void action(async () => { setSpin(await json<Spin>(`/api/runs/${run.id}/spin`, 'POST')); })}>🎰 Крутить колесо</button>
              {spin && <div className="mt-6"><h3 className="font-bold mb-3">{spin.clubName} · {spin.seasonLabel}</h3><div className="max-h-80 overflow-y-auto space-y-2">{spin.players.map(player => { const options = run.slots.filter(slot => !slot.playerSeasonId && canFillSlot(player.mainPosition as Position, player.otherPositions as Position[], slot.slotPosition.split('_')[0] as Position).canFill); return options.length ? <details key={player.playerSeasonId} className="rounded-lg bg-white/5 p-3"><summary className="cursor-pointer"><strong>{player.lastName}</strong> · {player.fullName} · {room.ratingMode === 'prime' ? player.primeRating : player.rating} · {player.mainPosition}</summary><div className="flex flex-wrap gap-2 mt-3">{options.map(slot => <button key={slot.slotPosition} disabled={busy} className="rounded-lg bg-[#30c798] px-3 py-2 text-black font-bold" onClick={() => void action(async () => { await json(`/api/runs/${run.id}/draft`, 'POST', { playerSeasonId: player.playerSeasonId, slotPosition: slot.slotPosition }); setSpin(null); await refresh(); })}>{slot.slotPosition.split('_')[0]}</button>)}</div></details> : null; })}</div></div>}</>}
            {room.seats.every(seat => seat.result) && <div className="mt-6 border-t border-white/10 pt-5"><h3 className="font-bold text-lg mb-3">Итоги сезона</h3>{[...room.seats].sort((a,b) => (b.result?.points ?? 0) - (a.result?.points ?? 0)).map((seat, index) => <div key={seat.id} className="flex justify-between py-2"><span>{index + 1}. {seat.name}</span><span>{seat.result?.points} очков · {seat.result?.wins}–{seat.result?.draws}–{seat.result?.losses}</span></div>)}</div>}
          </> : <p>Загружаем состав…</p>}</section>
        </div>
      </div>}
    </div>
  </main>;
}
