'use client';

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Clipboard, Crown, Link2, Plus, Share2, Trash2, UserRound, Users } from 'lucide-react';
import { FORMATIONS, POSITION_CATEGORY, type Position } from '@/lib/positions';
import SpinWheel from '@/components/game/SpinWheel';
import FormationView from '@/components/game/FormationView';
import PlayerList from '@/components/game/PlayerList';
import SimulationResult from '@/components/game/SimulationResult';
import { ERA_CONFIG, ERA_MIN_YEAR, ERA_MAX_YEAR, type DraftSlot, type GameConfig, type PlayerOption, type SpinResult } from '@/lib/types';
import { Switch } from '@/components/ui/switch';

export type Slot = { slotPosition: string; playerSeasonId: string | null; playerLastName: string | null; playerName: string | null; playerRating: number | null; playerSeasonYear: number | null; playerPosition: string | null; playerOtherPositions: string[] };
export type Run = { id: string; formation: string; completed: boolean; rerollsLeft: number; slots: Slot[] };
export type Seat = { id: string; forfeited: boolean; name: string; formation: string; ready: boolean; drafted: number; result: { wins: number; draws: number; losses: number; points: number; overallRating: number } | null; isYou: boolean; isHost: boolean; isBot: boolean; pickDeadline: string | null; managerName: string | null; managerRating: number | null };
export type RoomResult = { id: string; forfeited: boolean; name: string; points: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; rating: number; matches: { opponent: string; opponentId?: string; home: boolean; for: number; against: number }[] };
export type Room = { code: string; status: string; maxPlayers: number; ratingMode: string; draftMode: string; showRatings: boolean; eraFilter: keyof typeof ERA_CONFIG; eraStartYear: number; eraEndYear: number; withManager: boolean; isHost: boolean; seats: Seat[]; ownRun: Run | null; results: RoomResult[] | null };
export type Player = PlayerOption;
export type Spin = SpinResult;

const panel = 'rounded-2xl border border-[#1E1E1E] bg-[#141414]';
const active = 'border-[#00C896]/70 bg-[#00C896]/15 text-[#00C896] shadow-[0_0_16px_var(--club-glow)]';
const neutral = 'border-[#292929] bg-[#1E1E1E] text-[#9CA3AF] hover:border-white/30';
const primary = 'rounded-xl bg-[#00C896] px-5 py-3.5 font-bold text-[#07130f] transition hover:bg-[#00A67A] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40';

export function Lobby({ room, busy, onSeat, onSettings, onBot, onRemoveBot, onStart, friends = [], onInvite }: { room: Room; busy: boolean; onSeat: (ready: boolean, formation: string) => void; onSettings: (changes: Partial<Room>) => void; onBot: () => void; onRemoveBot: (botId: string) => void; onStart: () => void; friends?: { id: string; name: string; games: number }[]; onInvite: (friendId: string) => void }) {
  const own = room.seats.find(s => s.isYou);
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const link = `${typeof window !== 'undefined' ? location.origin : 'https://30-0.рф'}/multiplayer?room=${room.code}`;
  return <div className="mx-auto max-w-[650px] space-y-5 pb-10">
    <div className="text-center"><span className="text-xs font-bold uppercase tracking-[.24em] text-emerald-400">Live драфт · Лобби</span><h1 className="mt-2 text-3xl font-black sm:text-4xl">Соберите команду</h1><p className="mt-2 text-slate-400">Пригласите друзей, выберите схему и начните драфт вместе.</p></div>
    <div className={`${panel} p-6 text-center sm:p-8`}><div className="text-[11px] font-bold uppercase tracking-[.23em] text-slate-400">Код комнаты</div><div className="my-3 font-mono text-4xl font-black tracking-[.22em] text-white sm:text-5xl">{room.code}</div><p className="mb-5 text-sm text-slate-400">Отправьте ссылку друзьям. При входе на сайт они увидят приглашение.</p><div className="flex flex-wrap justify-center gap-2"><button onClick={() => void copy(room.code)} className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"><Clipboard size={16}/>{copied ? 'Скопировано' : 'Скопировать код'}</button><button onClick={() => void copy(link)} className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"><Link2 size={16}/>Ссылка на комнату</button><button onClick={() => navigator.share ? void navigator.share({ title: '30-0 · Драфт', url: link }) : void copy(link)} className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"><Share2 size={16}/>Поделиться</button></div></div>
    <div className={`${panel} p-5 sm:p-6`}><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold"><Users size={18}/> Участники</h2><span className="text-sm text-slate-400">{room.seats.length}/{room.maxPlayers}</span></div><div className="space-y-2">{room.seats.map(seat => <motion.div layout key={seat.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">{seat.isBot ? '🤖' : <UserRound size={20}/>}</div><div className="min-w-0 flex-1"><div className="truncate font-semibold">{seat.name} {seat.isYou && <span className="text-xs text-slate-400">(вы)</span>}</div><div className="text-xs text-slate-500">{seat.isHost ? 'Организатор' : seat.isBot ? 'Бот' : 'Участник'} · {seat.formation}</div></div>{seat.isHost && <Crown size={17} className="text-amber-400"/>}<span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${seat.ready ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>{seat.ready ? '✓ Готов' : 'Ожидает'}</span>{room.isHost && seat.isBot && <button aria-label={`Удалить ${seat.name}`} title="Удалить бота" disabled={busy} onClick={() => onRemoveBot(seat.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-40"><Trash2 size={16}/></button>}</motion.div>)}{Array.from({ length: room.maxPlayers - room.seats.length }, (_, i) => <div key={i} className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 p-3 text-slate-500"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5"><Plus size={18}/></div><span className="flex-1 text-sm">Свободное место</span>{room.isHost && <button disabled={busy} onClick={onBot} className="text-sm text-emerald-400 hover:underline">+ Бот</button>}</div>)}</div></div>
    <div className={`${panel} p-5 sm:p-6`}><h2 className="text-lg font-bold">Ваша схема</h2><p className="mb-4 text-sm text-slate-400">Выберите расстановку для своих 11 игроков</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{FORMATIONS.map(f => <button key={f.id} disabled={busy} onClick={() => onSeat(false, f.id)} className={`rounded-xl border px-2 py-3 text-sm font-bold transition ${own?.formation === f.id ? active : neutral}`}>{f.name}</button>)}</div></div>
    {room.isHost && friends.length > 0 && <div className={`${panel} p-5 sm:p-6`}><h2 className="mb-2 text-lg font-bold">Друзья</h2><p className="mb-3 text-xs text-[#9CA3AF]">Пригласите участников, с которыми уже играли.</p><div className="flex flex-wrap gap-2">{friends.filter(friend => !room.seats.some(seat => seat.name === friend.name)).map(friend => <button key={friend.id} disabled={busy || room.seats.length >= room.maxPlayers} onClick={() => onInvite(friend.id)} className="rounded-lg border border-[#00C896]/30 px-3 py-2 text-xs font-semibold text-[#00C896] hover:bg-[#00C896]/10 disabled:opacity-40">+ {friend.name} · {friend.games} игр</button>)}</div></div>}
    <div className={`${panel} space-y-5 p-5 sm:p-6`}>
      <h2 className="text-lg font-bold">Правила драфта</h2>
      <div><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Участников</div><div className="grid grid-cols-5 gap-2">{[2,3,4,5,6].map(n => <button key={n} disabled={!room.isHost || busy || n < room.seats.length} onClick={() => onSettings({ maxPlayers:n })} className={`rounded-lg border py-2 text-sm font-bold ${room.maxPlayers === n ? active : neutral}`}>{n}</button>)}</div></div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[#292929] p-4"><div><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Показывать рейтинги</div><p className="mt-1 text-xs text-[#64748b]">{room.showRatings ? 'Рейтинги видны' : 'Слепой режим — рейтинги скрыты'}</p></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-[#00C896]">{room.showRatings ? 'Вкл' : 'Выкл'}</span><Switch checked={room.showRatings} disabled={!room.isHost || busy} onCheckedChange={value => onSettings({ showRatings:value })}/></div></div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[#292929] p-4"><div><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Тренер</div><p className="mt-1 text-xs text-[#64748b]">{room.withManager ? 'Случайный тренер добавит +2 к силе команды.' : 'Игра без тренера и бонуса.'}</p></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-[#00C896]">{room.withManager ? 'Вкл' : 'Выкл'}</span><Switch checked={room.withManager} disabled={!room.isHost || busy} onCheckedChange={value => onSettings({ withManager:value })}/></div></div>
      <div><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Режим драфта</div><div className="grid grid-cols-2 gap-2">{([['squad_first','Сначала состав','Крутите колесо, затем выберите игрока и позицию'],['position_first','Сначала позиция','Выберите позицию, затем крутите колесо']] as const).map(([mode,label,desc]) => <button key={mode} disabled={!room.isHost || busy} onClick={() => onSettings({ draftMode:mode })} className={`rounded-xl border p-3 text-center ${room.draftMode === mode ? active : neutral}`}><strong className="block text-sm">{label}</strong><span className="mt-1 block text-[11px] text-[#9CA3AF]">{desc}</span></button>)}</div></div>
      <div><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Рейтинг игроков</div><div className="grid grid-cols-2 gap-2">{([['season','Сезонный рейтинг','Рейтинг игрока в конкретном сезоне'],['prime','Прайм-рейтинг','Потенциал игрока в выбранном сезоне']] as const).map(([mode,label,desc]) => <button key={mode} disabled={!room.isHost || busy} onClick={() => onSettings({ ratingMode:mode })} className={`rounded-xl border p-3 text-center ${room.ratingMode === mode ? active : neutral}`}><strong className="block text-sm">{label}</strong><span className="mt-1 block text-[11px] text-[#9CA3AF]">{desc}</span></button>)}</div></div>
      <div><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Эпоха</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.entries(ERA_CONFIG) as [keyof typeof ERA_CONFIG, { label: string; minYear: number; maxYear: number }][]).map(([key,value]) => <button key={key} disabled={!room.isHost || busy} onClick={() => onSettings({ eraFilter:key, eraStartYear:value.minYear, eraEndYear:value.maxYear })} className={`rounded-full border px-2 py-2 text-sm font-bold ${room.eraFilter === key ? active : neutral}`}>{value.label}</button>)}</div>
      {room.eraFilter === 'custom' && <div className="mt-4 rounded-xl border border-[#292929] p-4"><div className="flex items-center justify-between text-xl font-black text-[#00C896]"><span>{room.eraStartYear}</span><span>—</span><span>{room.eraEndYear}</span></div><div className="mt-3 space-y-3"><label className="block text-xs text-[#9CA3AF]">Начало периода<input aria-label="Начало периода" className="mt-2 w-full accent-[#00C896]" type="range" min={ERA_MIN_YEAR} max={ERA_MAX_YEAR} value={room.eraStartYear} disabled={!room.isHost || busy} onChange={event => onSettings({ eraStartYear: Math.min(Number(event.target.value),room.eraEndYear) })}/></label><label className="block text-xs text-[#9CA3AF]">Конец периода<input aria-label="Конец периода" className="mt-2 w-full accent-[#00C896]" type="range" min={ERA_MIN_YEAR} max={ERA_MAX_YEAR} value={room.eraEndYear} disabled={!room.isHost || busy} onChange={event => onSettings({ eraEndYear: Math.max(Number(event.target.value),room.eraStartYear) })}/></label></div><p className="mt-2 text-center text-xs text-[#64748b]">Период: {room.eraEndYear-room.eraStartYear+1} лет · {ERA_MIN_YEAR}–{ERA_MAX_YEAR}</p></div>}
      </div>
    </div>
    <div className={`${panel} overflow-hidden`}><button className="flex w-full items-center justify-between p-5 text-left font-semibold" onClick={() => setRulesOpen(v => !v)}>Как это работает <ChevronDown size={18} className={rulesOpen ? 'rotate-180' : ''}/></button>{rulesOpen && <p className="border-t border-white/10 px-5 pb-5 pt-4 text-sm leading-6 text-slate-400">Все участники одновременно крутят клуб и сезон, выбирают игроков на свободные позиции и собирают состав из 11 человек. На весь драфт даётся 3 минуты. После завершения все команды сыграют сезон РПЛ из 30 матчей. Побеждает тот, кто наберёт больше очков.</p>}</div>
    <div className="space-y-2">{room.seats.length >= 2 && <button disabled={busy} onClick={() => onSeat(!own?.ready, own?.formation || '4-3-3')} className={`w-full ${own?.ready ? 'rounded-xl border border-emerald-500 py-3.5 font-bold text-emerald-300' : primary}`}>{own?.ready ? '✓ Вы готовы · Отменить' : 'Я готов'}</button>}{room.isHost && <button disabled={busy || room.seats.length < 2 || room.seats.some(s => !s.ready)} onClick={onStart} className={`w-full ${primary}`}>Начать драфт →</button>}<p className="text-center text-xs text-slate-500">{room.seats.length < 2 ? 'Нужен хотя бы ещё один участник или бот' : room.seats.some(s => !s.ready) ? 'Дождитесь готовности всех участников' : 'Все готовы к началу'}</p></div>
  </div>;
}

export function Draft({ room, run, spin, busy, remaining, onSpin, onReroll, onPick, onMove, onSkip, onFinish }: {
  room: Room; run: Run; spin: Spin | null; busy: boolean; remaining: number;
  onSpin: (target?: Slot) => Promise<void>; onReroll: (target?: Slot) => Promise<void>;
  onPick: (player: Player, slot: Slot) => void; onMove: (from: Slot, to: Slot) => void;
  onSkip: () => void; onFinish: () => void;
}) {
  const [selected, setSelected] = useState<PlayerOption | null>(null);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [lastPlaced, setLastPlaced] = useState('');
  const spinRef = useRef<HTMLDivElement>(null);
  const formation = FORMATIONS.find(value => value.id === run.formation);
  const slots = useMemo<DraftSlot[]>(() => run.slots.map((slot, index) => {
    const position = slot.slotPosition.split('_')[0] as Position;
    return {
      position, positionLabel: formation?.slots[index]?.label || position,
      category: POSITION_CATEGORY[position], playerId: slot.playerSeasonId ?? undefined,
      playerName: slot.playerName ?? undefined, playerLastName: slot.playerLastName ?? undefined,
      playerRating: slot.playerRating ?? undefined, playerSeasonYear: slot.playerSeasonYear ?? undefined,
      playerPosition: slot.playerPosition ?? undefined, playerOtherPositions: slot.playerOtherPositions,
    };
  }), [run.slots, formation]);
  const config: GameConfig = { formation: run.formation, difficulty: 'normal',
    ratingMode: room.ratingMode as 'season' | 'prime', eraFilter: room.eraFilter, eraStartYear: room.eraStartYear,
    eraEndYear: room.eraEndYear, gameMode: 'classic', showRatings: room.showRatings, draftMode: room.draftMode as 'squad_first' | 'position_first' };
  const filled = slots.filter(value => value.playerId).length;
  const locked = busy || remaining <= 0 || room.seats.find(value => value.isYou)?.ready === true;
  const rating = filled ? Math.round(slots.reduce((sum, value) => sum + (value.playerRating ?? 0), 0) / filled) : null;
  const categories = ['att', 'mid', 'def', 'gk'] as const;
  const labels = { att: 'Атака', mid: 'Полузащита', def: 'Защита', gk: 'ВР' };
  const colors = { att: '#ef4444', mid: '#00C896', def: '#3b82f6', gk: '#f97316' };
  const assign = (index: number) => {
    if (locked || !selected || room.draftMode === 'position_first' && targetSlotIndex !== index) return;
    const player = selected;
    onPick(player, run.slots[index]);
    setLastPlaced(`${player.fullName} → ${slots[index].positionLabel}`);
    setSelected(null);
    setTargetSlotIndex(null);
    setTimeout(() => spinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800);
  };
  const play = async (reroll = false) => {
    if (locked) return;
    setSpinning(true); setSelected(null);
    try { await (reroll ? onReroll(run.slots[targetSlotIndex ?? -1]) : onSpin(run.slots[targetSlotIndex ?? -1])); }
    finally { setSpinning(false); }
  };
  return <div className="space-y-3 animate-fade-in pb-24 sm:pb-4">
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#1E1E1E] bg-[#141414] px-4 py-2.5">
      <div><span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Время на весь драфт · {filled}/11</span>
        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[#9CA3AF]">{room.seats.filter(value => !value.isYou).map(value => <span key={value.id}>{value.name} · {value.drafted}/11</span>)}</div>
      </div>
      <strong role="timer" className={`font-mono text-2xl tabular-nums ${remaining < 30 ? 'text-red-400' : 'text-[#00C896]'}`}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</strong>
    </div>
    <div className="h-1 overflow-hidden rounded-full bg-[#1E1E1E]"><motion.div animate={{ width: `${remaining / 180 * 100}%` }} className="h-full bg-[#00C896]"/></div>
    <div className="lg:grid lg:grid-cols-[minmax(380px,480px)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="space-y-3 lg:sticky lg:top-20">
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-lg bg-[#1E1E1E] px-2 py-1 text-xs font-black">{run.formation}</span><span className="text-[10px] text-[#64748b]">{11-filled} поз. осталось</span></div><span className="text-[10px] font-bold text-[#fbbf24]">🔄 {run.rerollsLeft}/1</span></div>
        {selected && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[#00C896]/30 bg-[#00C896]/10 px-3 py-2 text-xs text-[#00C896]">👉 Выберите позицию для <strong>{selected.fullName}</strong> на поле или в списке ниже</motion.div>}
        {lastPlaced && !selected && <div className="rounded-xl border border-[#00C896]/30 bg-[#00C896]/10 px-3 py-2 text-xs text-[#00C896]">✅ {lastPlaced}</div>}
        {room.draftMode === 'position_first' && !spin && filled < 11 && <p className="rounded-xl border border-[#00C896]/30 bg-[#00C896]/10 px-3 py-2 text-xs text-[#00C896]">Сначала выберите свободную позицию на поле, затем крутите колесо.</p>}
        <FormationView multiplayer={{ config, slots, selectedPlayer: locked ? null : selected,
          targetSlotIndex, onChooseSlot: index => { if (!locked && !spin && room.draftMode === 'position_first') setTargetSlotIndex(index); },
          onAssign: assign, onMove: (from, to) => { if (!locked) onMove(run.slots[from], run.slots[to]); } }}/>
        <div className="rounded-xl border border-[#1E1E1E]/60 bg-[#141414] p-3"><div className="flex items-center gap-3"><div className="text-center"><div className="text-4xl font-black text-[#00C896]">{room.showRatings ? rating ?? '—' : '?'}</div><div className="mt-1 text-[10px] font-bold text-[#9CA3AF]">Рейтинг</div></div><div className="flex-1 space-y-1.5">{categories.map(category => { const values = slots.filter(slot => slot.category === category && slot.playerRating).map(slot => slot.playerRating!); const average = values.length ? Math.round(values.reduce((a,b) => a+b,0)/values.length) : 0; return <div key={category} className="flex items-center gap-2"><span className="w-14 text-[9px] text-[#9CA3AF]">{labels[category]}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1a2a1a]"><motion.div animate={{ width: `${room.showRatings ? average/99*100 : 0}%` }} className="h-full rounded-full" style={{ backgroundColor: colors[category] }}/></div><span className="w-5 text-right text-[9px] font-bold">{room.showRatings ? average || '—' : '?'}</span></div>; })}</div></div></div>
        {room.withManager && <p className="text-center text-xs text-[#9CA3AF]">Тренер: {room.seats.find(value => value.isYou)?.managerName}</p>}
      </div>
      <div className="mt-3 space-y-3 lg:mt-0">
        {filled === 11 || locked && remaining <= 0 ? <div className="rounded-2xl border border-[#1E1E1E] bg-[#141414] p-6 text-center"><h2 className="text-xl font-black">{filled === 11 ? 'Состав готов' : 'Время драфта истекло'}</h2><p className="my-3 text-sm text-[#9CA3AF]">{filled === 11 ? 'Ожидайте окончания общего времени и других участников.' : 'Оставшиеся позиции заполнятся автоматически.'}</p>{filled === 11 && <button disabled={busy || room.seats.find(value => value.isYou)?.ready} onClick={onFinish} className={primary}>Начать сезон →</button>}</div> : <>
          <div ref={spinRef}><SpinWheel multiplayer={{ currentSpin: spin, isSpinning: spinning, rerollsLeft: run.rerollsLeft,
            openCount: 11-filled, disabled: locked || room.draftMode === 'position_first' && targetSlotIndex === null, onSpin: () => play(false), onReroll: () => play(true) }}/></div>
          {spin && !spinning && <PlayerList multiplayer={{ currentSpin: spin, slots, ratingMode: config.ratingMode,
            selectedPlayer: selected, targetSlotIndex: room.draftMode === 'position_first' ? targetSlotIndex : null,
            showRatings: room.showRatings, onSelect: setSelected, onAssign: assign, onSkip, disabled: locked }}/>}
        </>}
      </div>
    </div>
  </div>;
}

export function Results({ room, run, onReplay }: { room: Room; run: Run | null; onReplay: () => void }) {
  const own = room.seats.find(value => value.isYou);
  const results = room.results ?? [];
  const mine = results.find(value => value.id === own?.id);
  if (!mine) return <div className="text-center text-[#9CA3AF]">Загружаем результаты сезона…</div>;
  const position = results.findIndex(value => value.id === mine.id) + 1;
  const matches = mine.matches.map((match, index) => ({
    matchday: index + 1, opponent: match.opponent, isHome: match.home,
    homeGoals: match.home ? match.for : match.against,
    awayGoals: match.home ? match.against : match.for,
    result: (match.for > match.against ? 'W' : match.for < match.against ? 'L' : 'D') as 'W' | 'D' | 'L',
  }));
  const table = results.map((result, index) => ({
    position: index + 1, name: result.name, played: result.matches.length,
    won: result.wins, drawn: result.draws, lost: result.losses,
    goalsFor: result.goalsFor, goalsAgainst: result.goalsAgainst,
    goalDifference: result.goalsFor - result.goalsAgainst, points: result.points,
  }));
  const formation = FORMATIONS.find(value => value.id === run?.formation);
  const slots: DraftSlot[] = (run?.slots ?? []).map((slot, index) => {
    const position = slot.slotPosition.split('_')[0] as Position;
    return { position, positionLabel: formation?.slots[index]?.label || position,
      category: POSITION_CATEGORY[position], playerId: slot.playerSeasonId ?? undefined,
      playerName: slot.playerName ?? undefined, playerLastName: slot.playerLastName ?? undefined,
      playerRating: slot.playerRating ?? undefined };
  });
  const config: GameConfig = { formation: run?.formation ?? '4-3-3', difficulty: 'normal',
    draftMode: 'squad_first', ratingMode: room.ratingMode as 'season' | 'prime', eraFilter: 'custom',
    eraStartYear: room.eraStartYear, eraEndYear: room.eraEndYear, gameMode: 'classic', teamName: mine.name };
  return <div>{mine.forfeited && <div role="alert" className="mx-auto mb-5 max-w-4xl rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-center"><strong className="block text-lg text-red-300">Вы проиграли: время драфта истекло</strong><span className="text-sm text-[#9CA3AF]">Вы не успели собрать 11 игроков за три минуты.</span><button onClick={onReplay} className="mt-3 block w-full rounded-lg bg-[#00C896] px-4 py-2 font-bold text-black">Повторить с теми же участниками →</button></div>}
    <SimulationResult multiplayer={{ data: { runId: run?.id, points: mine.points, wins: mine.wins,
    draws: mine.draws, losses: mine.losses, goalsFor: mine.goalsFor, goalsAgainst: mine.goalsAgainst,
    position, formation: config.formation, matches, table }, config, slots,
    onHome: () => { location.href = '/'; }, onReplay }}/></div>;
}
