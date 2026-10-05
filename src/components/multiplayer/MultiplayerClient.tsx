'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAutoAuth } from '@/hooks/use-telegram-auth';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { canFillSlot, FORMATIONS, POSITION_CATEGORY, getPitchColumn, type Position } from '@/lib/positions';
import { FORMATION_LAYOUTS } from '@/components/game/FormationView';
import TelegramLogin from '@/components/game/TelegramLogin';

type Slot = { slotPosition: string; playerSeasonId: string | null; playerLastName: string | null; playerRating: number | null };
type Run = { id: string; formation: string; completed: boolean; slots: Slot[] };
type Seat = { id: string; name: string; formation: string; ready: boolean; drafted: number; result: { wins: number; draws: number; losses: number; points: number; overallRating: number } | null; isYou: boolean; isHost: boolean; isBot: boolean; pickDeadline: string | null; managerName: string | null; managerRating: number | null };
type RoomResult = { id: string; name: string; points: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; rating: number; matches: { opponent: string; opponentId?: string; home: boolean; for: number; against: number }[] };
type Room = { code: string; status: string; maxPlayers: number; ratingMode: string; eraStartYear: number; eraEndYear: number; withManager: boolean; isHost: boolean; seats: Seat[]; ownRun: Run | null; results: RoomResult[] | null };
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
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    if (user) setName(current => current || (user.username && user.displayName === user.firstName ? `@${user.username}` : user.displayName));
    const invite = new URLSearchParams(location.search).get('room');
    if (invite && /^[A-HJ-NP-Z2-9]{6}$/i.test(invite)) {
      const normalized = invite.toUpperCase();
      setJoinCode(normalized); setStage('entry');
      if (user) void json<Room>(`/api/multiplayer/rooms/${normalized}`).then(value => { setRoom(value); setCode(normalized); }).catch(() => undefined);
    }
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
  const remaining = Math.max(0, Math.ceil(((own?.pickDeadline ? Date.parse(own.pickDeadline) : now) - now) / 1000));
  const ownResult = room?.results?.find(result => result.id === own?.id);
  const updateSettings = (changes: Partial<Room>) => room && action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', {
    action: 'settings', maxPlayers: room.maxPlayers, ratingMode: room.ratingMode, eraStartYear: room.eraStartYear,
    eraEndYear: room.eraEndYear, withManager: room.withManager, ...changes,
  }); await refresh(); });

  return <main className="min-h-screen bg-[#0a0c11] text-white pb-20">
    <header className="border-b border-white/10 px-5 py-4 flex justify-between max-w-6xl mx-auto"><a href="/" className="text-sm text-gray-300 hover:text-white">⌂ Домой</a><button onClick={() => { useGameStore.getState().setScreen('profile'); location.href = '/'; }} className="text-sm text-gray-300 hover:text-white">♙ Мой профиль</button></header>
    <div className="mx-auto max-w-5xl px-4 py-12">
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-red-200">{error}</div>}
      {!code && stage === 'landing' && <div className="text-center">
        <h1 className="text-4xl font-black mb-3">Мультиплеер</h1><p className="text-gray-400 mb-10">Играйте с друзьями в режиме реального времени.</p>
        <div className="mx-auto max-w-lg text-left">
          <button onClick={() => setStage('entry')} className={`${box} hover:border-[#30c798] text-left w-full`}><strong className="text-xl">🔴 Live драфт</strong><p className="text-gray-400 mt-3">Соревнуйтесь в реальном времени: до 6 игроков одновременно собирают лучшие команды из 11 футболистов.</p><span className="text-[#30c798]">Играть →</span></button>
        </div>
      </div>}
      {!code && stage === 'entry' && <div className="mx-auto max-w-lg">
        <button onClick={() => setStage('landing')} className="text-gray-400 mb-6">← Режимы</button>
        <div className="text-sm text-[#30c798] mb-2">Мультиплеер · Бета</div><h1 className="text-3xl font-bold mb-3">Играй с другом</h1><p className="text-gray-400 mb-8">Создайте команду из 11 игроков, сыграйте сезон и узнайте, кто собрал лучший состав.</p>
        {!_hasHydrated ? <p>Проверяем вход…</p> : !user ? <div className={box}><p className="mb-4">Для живого драфта войдите через Telegram.</p><TelegramLogin /></div> : <div className="space-y-5">
          <label className="block">Ваше имя<input aria-label="Ваше имя" maxLength={30} value={name} onChange={e => setName(e.target.value)} className={`${input} mt-2`} /></label>
          <p className="text-xs text-gray-400">Имя будет общим для этого режима, таблиц лидеров и лиг.</p>
          <div className={box}><button disabled={busy || name.trim().length < 2} onClick={() => void enter()} className={`${button} w-full`}>Новая игра в прямом эфире</button><p className="text-xs text-gray-400 mt-3">2–6 менеджеров участвуют одновременно. Правила можно изменить в лобби.</p></div>
          <div className={box}><h2 className="font-bold mb-3">Присоединиться по коду</h2><input aria-label="Код комнаты" value={joinCode} maxLength={6} onChange={e => setJoinCode(e.target.value.toUpperCase())} className={`${input} mb-3 uppercase`} placeholder="Код из 6 символов" /><button disabled={busy || joinCode.length !== 6 || name.trim().length < 2} onClick={() => void enter(joinCode)} className={`${button} w-full`}>Войти в комнату</button></div>
        </div>}
      </div>}
      {code && !room && <p className="text-center">Загружаем комнату {code}…</p>}
      {room && <div>
        <div className="flex flex-wrap justify-between gap-3 mb-7"><div><div className="text-sm text-[#30c798]">Live драфт · Бета</div><h1 className="text-3xl font-bold">{room.status === 'lobby' ? 'Лобби' : room.status === 'completed' ? 'Результаты сезона' : 'Драфт с друзьями'}</h1></div><div className="flex flex-wrap items-center gap-3"><button className="rounded-lg border border-white/20 px-3 py-2 font-mono font-bold" title="Скопировать код" onClick={() => void navigator.clipboard.writeText(room.code)}>{room.code} ⧉</button><button className="text-gray-300 underline" onClick={() => void navigator.clipboard.writeText(`${location.origin}/multiplayer?room=${room.code}`)}>Скопировать приглашение</button><a className="text-sky-300 underline" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(`${location.origin}/multiplayer?room=${room.code}`)}&text=${encodeURIComponent('Присоединяйся к драфту 30-0')}`}>Отправить в Telegram</a></div></div>
        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <aside className={box}><h2 className="font-bold mb-4">Участники · {room.seats.length}/{room.maxPlayers}</h2><div className="space-y-2">{room.seats.map(seat => <div key={seat.id} className="rounded-lg bg-white/5 p-3 flex justify-between gap-2"><span>{seat.name} {seat.isHost ? '👑' : ''} {seat.isBot ? '🤖' : ''} {seat.isYou ? '(вы)' : ''}</span><span className="text-[#30c798]">{room.status === 'lobby' ? seat.ready ? 'Готов' : 'Ожидает' : room.status === 'completed' ? `${seat.result?.points ?? 0} очков` : `${seat.drafted}/11${seat.ready ? ' ✓' : ''}`}</span></div>)}</div>
          {room.status === 'lobby' && <div className="mt-6 space-y-4"><label className="block">Ваша схема<select value={own?.formation || '4-3-3'} onChange={e => void seatUpdate(false, e.target.value)} className={`${input} mt-2`}>{FORMATIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>{room.seats.length >= 2 && <button disabled={busy} onClick={() => void seatUpdate(!own?.ready, own?.formation || '4-3-3')} className={`${button} w-full`}>{own?.ready ? 'Отменить готовность' : 'Я готов'}</button>}
          {room.isHost && <><label className="block">Мест: {room.maxPlayers}<input type="range" min={room.seats.length} max={6} value={room.maxPlayers} onChange={e => void updateSettings({ maxPlayers: Number(e.target.value) })} className="block w-full accent-[#30c798]" /></label><label className="block">Рейтинг<select value={room.ratingMode} onChange={e => void updateSettings({ ratingMode: e.target.value })} className={`${input} mt-2`}><option value="season">Сезон</option><option value="prime">Прайм</option></select></label><label className="block">Период<select value={`${room.eraStartYear}-${room.eraEndYear}`} onChange={e => { const [eraStartYear, eraEndYear] = e.target.value.split('-').map(Number); void updateSettings({ eraStartYear, eraEndYear }); }} className={`${input} mt-2`}><option value="2010-2026">2010–2026</option><option value="2010-2018">2010–2018</option><option value="2019-2026">2019–2026</option></select></label><label className="flex items-center gap-3"><input type="checkbox" checked={room.withManager} onChange={e => void updateSettings({ withManager: e.target.checked })} /> Тренер</label><button disabled={busy || room.seats.length >= room.maxPlayers} onClick={() => void action(async () => { await json(`/api/multiplayer/rooms/${code}`, 'PATCH', { action: 'bot' }); await refresh(); })} className="w-full rounded-xl border border-white/20 py-2">+ Добавить бота</button><button disabled={busy || room.seats.length < 2 || room.seats.some(seat => !seat.ready)} onClick={() => void action(async () => { await json(`/api/multiplayer/rooms/${code}/start`, 'POST'); await refresh(); })} className={`${button} w-full`}>Начать</button></>}</div>}
          </aside>
          <section className={box}>{room.status === 'lobby' ? <><h2 className="text-xl font-bold mb-3">Пригласи друзей</h2><p className="text-gray-400 mb-4">Отправь код {room.code} или ссылку. Каждый выбирает схему и отмечает готовность. Драфт начнётся одновременно.</p><div className="text-sm text-gray-400">Правила: {room.ratingMode === 'prime' ? 'Прайм' : 'Рейтинг сезона'} · {room.eraStartYear}–{room.eraEndYear} · 1 переброс</div></> : run ? <>
            <h2 className="text-xl font-bold mb-2">Ваш состав · {filled}/11</h2><p className="text-gray-400 mb-5">{run.formation} · {room.ratingMode === 'prime' ? 'Прайм' : 'Сезон'} {room.withManager && own?.managerName ? `· Тренер: ${own.managerName} (+2)` : ''}</p>
            <div className="relative mx-auto w-full max-w-[410px] aspect-[0.7] rounded-xl border-4 border-green-700 bg-[repeating-linear-gradient(180deg,#125832_0px,#125832_56px,#17663b_56px,#17663b_112px)] mb-6 overflow-hidden">
              <div className="absolute inset-3 border border-white/30 rounded-sm pointer-events-none"><div className="absolute left-1/4 right-1/4 top-0 h-[12%] border border-t-0 border-white/30"/><div className="absolute left-1/4 right-1/4 bottom-0 h-[12%] border border-b-0 border-white/30"/><div className="absolute left-0 right-0 top-1/2 border-t border-white/30"/></div>
              {run.slots.map((slot, index) => { const pos = slot.slotPosition.split('_')[0] as Position; const coords = (FORMATION_LAYOUTS[run.formation] || FORMATION_LAYOUTS['4-3-3'])[index]; const color = ({ gk: '#fbbf24', def: '#3b82f6', mid: '#22c55e', att: '#f97316' })[POSITION_CATEGORY[pos]]; return <div key={slot.slotPosition} className="absolute w-[18%] -translate-x-1/2 -translate-y-1/2 text-center min-w-0" style={{ top: `${coords.row}%`, left: `${getPitchColumn(coords.col)}%` }}><div className="mx-auto rounded-full border-2 w-10 h-10 flex items-center justify-center font-bold text-xs shadow-lg" style={{ background: color, borderColor: '#fff8', color: '#101820' }}>{slot.playerRating ?? pos}</div><span className="text-[10px] font-bold break-words bg-black/60 rounded px-1">{slot.playerLastName || pos}</span></div>; })}
            </div>
            {room.status === 'completed' ? null : filled === 11 ? <div><p className="text-gray-400 mb-3">Все 11 игроков готовы. Сезон начнётся, когда каждый участник соберёт состав.</p><button disabled={busy || own?.ready} className={button} onClick={() => void action(async () => { await json(`/api/multiplayer/rooms/${room.code}/finish`, 'POST'); await refresh(); })}>{own?.ready ? 'Ожидаем друзей…' : 'Начало сезона'}</button></div> : <><div className="mb-4 text-sm text-amber-300">На выбор игрока: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</div><button disabled={busy || remaining === 0} className={button} onClick={() => void action(async () => { setSpin(await json<Spin>(`/api/runs/${run.id}/spin`, 'POST')); })}>🎰 Крутить колесо</button>
              {spin && <div className="mt-6"><h3 className="font-bold mb-3">{spin.clubName} · {spin.seasonLabel}</h3><div className="max-h-80 overflow-y-auto space-y-2">{spin.players.map(player => { const options = run.slots.filter(slot => !slot.playerSeasonId && canFillSlot(player.mainPosition as Position, player.otherPositions as Position[], slot.slotPosition.split('_')[0] as Position).canFill); return options.length ? <details key={player.playerSeasonId} className="rounded-lg bg-white/5 p-3"><summary className="cursor-pointer"><strong>{player.lastName}</strong> · {player.fullName} · {room.ratingMode === 'prime' ? player.primeRating : player.rating} · {player.mainPosition}</summary><div className="flex flex-wrap gap-2 mt-3">{options.map(slot => <button key={slot.slotPosition} disabled={busy} className="rounded-lg bg-[#30c798] px-3 py-2 text-black font-bold" onClick={() => void action(async () => { await json(`/api/runs/${run.id}/draft`, 'POST', { playerSeasonId: player.playerSeasonId, slotPosition: slot.slotPosition }); setSpin(null); await refresh(); })}>{slot.slotPosition.split('_')[0]}</button>)}</div></details> : null; })}</div></div>}</>}
            {room.results && <div className="mt-6 border-t border-white/10 pt-5"><h3 className="font-bold text-lg mb-3">Итоги сезона · 30 матчей</h3>{room.results.map((result, index) => <div key={result.id} className={`flex justify-between gap-3 py-2 ${result.id === own?.id ? 'text-[#30c798]' : ''}`}><span>{index + 1}. {result.name}</span><span>{result.points} очков · {result.wins}–{result.draws}–{result.losses}</span></div>)}{ownResult && <><h4 className="font-bold mt-5 mb-2">Матчи с друзьями</h4>{ownResult.matches.filter(match => Boolean(match.opponentId)).map((match, index) => <div key={index} className="flex justify-between text-sm border-b border-white/10 py-2"><span>{match.home ? 'Дома' : 'В гостях'} · {match.opponent}</span><strong>{match.for}:{match.against}</strong></div>)}</>}</div>}
          </> : <p>Загружаем состав…</p>}</section>
        </div>
      </div>}
    </div>
  </main>;
}
