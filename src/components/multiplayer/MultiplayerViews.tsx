'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Clipboard, Crown, Plus, Share2, Trash2, UserRound, Users } from 'lucide-react';
import { FORMATIONS, POSITION_CATEGORY, type Position } from '@/lib/positions';
import SpinWheel from '@/components/game/SpinWheel';
import FormationView from '@/components/game/FormationView';
import PlayerList from '@/components/game/PlayerList';
import SimulationResult from '@/components/game/SimulationResult';
import { ERA_CONFIG, ERA_MIN_YEAR, ERA_MAX_YEAR, type DraftSlot, type GameConfig, type PlayerOption, type SpinResult } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { telegramWebApp } from '@/hooks/use-telegram';

export type Slot = { slotPosition: string; playerSeasonId: string | null; playerLastName: string | null; playerName: string | null; playerRating: number | null; playerSeasonYear: number | null; playerPosition: string | null; playerOtherPositions: string[] };
export type Run = { id: string; formation: string; completed: boolean; rerollsLeft: number; slots: Slot[] };
export type Seat = { id: string; forfeited: boolean; name: string; formation: string; ready: boolean; drafted: number; seriesMemberKey: string; result: { wins: number; draws: number; losses: number; points: number; overallRating: number } | null; isYou: boolean; isHost: boolean; isBot: boolean; pickDeadline: string | null; managerName: string | null; managerRating: number | null };
export type RoomResult = { id: string; forfeited: boolean; name: string; points: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; rating: number; matches: { opponent: string; opponentId?: string; home: boolean; for: number; against: number }[] };
export type Room = { code: string; status: string; maxPlayers: number; ratingMode: string; draftMode: string; showRatings: boolean; eraFilter: keyof typeof ERA_CONFIG; eraStartYear: number; eraEndYear: number; withManager: boolean; isHost: boolean; seats: Seat[]; ownRun: Run | null; pendingSpin: (Spin & { targetSlotPosition?: string }) | null; results: RoomResult[] | null; seriesTargetWins: number; seriesRound: number; seriesScores: Record<string, { name: string; wins: number; seasonWins: number; points: number; isBot: boolean }>; seriesWinnerKey: string | null; nextRoomCode: string | null; ownResultViewed: boolean };
export type Player = PlayerOption;
export type Spin = SpinResult;

const panel = 'rounded-2xl border border-[#1E1E1E] bg-[#141414]';
const active = 'border-[#00C896]/70 bg-[#00C896]/15 text-[#00C896] shadow-[0_0_16px_var(--club-glow)]';
const neutral = 'border-[#292929] bg-[#1E1E1E] text-[#9CA3AF] hover:border-white/30';
const primary = 'rounded-xl bg-[#00C896] px-5 py-3.5 font-bold text-[#07130f] transition hover:bg-[#00A67A] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40';

export function Lobby({ room, busy, onSeat, onSettings, onBot, onRemoveBot, onStart }: { room: Room; busy: boolean; onSeat: (ready: boolean, formation: string) => void; onSettings: (changes: Partial<Room>) => void; onBot: () => void; onRemoveBot: (botId: string) => void; onStart: () => void }) {
  const own = room.seats.find(s => s.isYou);
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(room.eraStartYear);
  const [draftEnd, setDraftEnd] = useState(room.eraEndYear);
  useEffect(() => { setDraftStart(room.eraStartYear); setDraftEnd(room.eraEndYear); }, [room.eraStartYear, room.eraEndYear]);
  const saveEra = () => {
    if (draftStart !== room.eraStartYear || draftEnd !== room.eraEndYear)
      onSettings({ eraStartYear: draftStart, eraEndYear: draftEnd });
  };
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const link = `https://t.me/RPL30_bot?startapp=room_${room.code}`;
  const share = () => {
    const shareLink = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Сыграем в 30-0? Код: ${room.code}`)}`;
    const app = telegramWebApp();
    if (app?.openTelegramLink) app.openTelegramLink(shareLink);
    else if (navigator.share) void navigator.share({ title: '30-0 · Мультиплеер', url: link }).catch(() => undefined);
    else window.open(shareLink, '_blank', 'noopener,noreferrer');
  };
  return <div className="mx-auto max-w-[760px] space-y-5 pb-10">
    <h1 className="text-center text-2xl font-black sm:text-3xl">Лобби</h1>
    {room.seriesTargetWins > 0 && room.seriesRound > 1 && <div className={`${panel} p-4 text-center font-semibold text-[#00C896]`}>Раунд {room.seriesRound} · серия до {room.seriesTargetWins} побед<div className="mt-2 flex flex-wrap justify-center gap-3 text-sm text-white">{room.seats.map(seat => <span key={seat.id}>{seat.name}: {room.seriesScores[seat.seriesMemberKey]?.wins ?? 0}</span>)}</div></div>}
    <div className={`${panel} p-5 text-center sm:p-7`}><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Код игры</p><strong className="my-3 block select-all font-mono text-4xl font-black tracking-[.18em] sm:text-6xl">{room.code}</strong><div className="grid gap-2 sm:grid-cols-2"><button onClick={() => void copy(room.code)} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10"><Clipboard size={18}/>{copied ? 'Скопировано' : 'Скопировать код'}</button><button onClick={share} className="flex items-center justify-center gap-2 rounded-xl border border-[#00C896]/40 bg-[#00C896]/15 px-4 py-3 font-semibold text-[#00C896] hover:bg-[#00C896]/25"><Share2 size={18}/>Поделиться ссылкой</button></div><p className="mt-3 text-xs text-slate-500">Отправьте код или ссылку другу</p></div>
    <div className={`${panel} p-5 sm:p-6`}><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold"><Users size={18}/> Участники</h2><span className="text-sm text-slate-400">{room.seats.length}/{room.maxPlayers}</span></div><div className="space-y-2">{room.seats.map(seat => <motion.div layout key={seat.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">{seat.isBot ? '🤖' : <UserRound size={20}/>}</div><div className="min-w-0 flex-1"><div className="truncate font-semibold">{seat.name} {seat.isYou && <span className="text-xs text-slate-400">(вы)</span>}</div><div className="text-xs text-slate-500">{seat.isHost ? 'Организатор' : seat.isBot ? 'Бот' : 'Участник'} · {seat.formation}</div></div>{seat.isHost && <Crown size={17} className="text-amber-400"/>}<span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${seat.ready ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>{seat.ready ? '✓ Готов' : 'Ожидает'}</span>{seat.isBot && room.seriesRound === 1 && <button aria-label={`Удалить ${seat.name}`} title="Удалить бота" disabled={busy} onClick={() => onRemoveBot(seat.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-40"><Trash2 size={16}/></button>}</motion.div>)}{room.seriesRound === 1 && Array.from({ length: room.maxPlayers - room.seats.length }, (_, i) => <div key={i} className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 p-3 text-slate-500"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5"><Plus size={18}/></div><span className="flex-1 text-sm">Свободное место</span><button disabled={busy} onClick={onBot} className="rounded-lg border border-[#00C896]/50 px-3 py-2 text-sm font-bold text-[#00C896] hover:bg-[#00C896]/10 disabled:opacity-40">+ Добавить бота</button></div>)}</div></div>
    <div className={`${panel} p-5 sm:p-6`}><h2 className="mb-4 text-lg font-bold">Ваша схема</h2><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{FORMATIONS.map(f => <button key={f.id} disabled={busy} onClick={() => onSeat(false, f.id)} className={`rounded-xl border px-2 py-3 text-sm font-bold transition ${own?.formation === f.id ? active : neutral}`}>{f.name}</button>)}</div></div>
    {room.seriesRound === 1 && <div className={`${panel} p-5 sm:p-6`}><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Количество игроков</div><div className="grid grid-cols-5 gap-2">{[2,3,4,5,6].map(n => <button key={n} disabled={busy || n < room.seats.length} onClick={() => onSettings({ maxPlayers:n })} className={`rounded-lg border py-2 text-sm font-bold ${room.maxPlayers === n ? active : neutral}`}>{n}</button>)}</div></div>}
    {room.isHost && room.seriesRound === 1 && <div className={`${panel} space-y-5 p-5 sm:p-6`}>
      <h2 className="text-lg font-bold">Правила драфта</h2>
      <div><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Формат игры</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([[0, 'Один сезон'], [2, 'До 2 побед'], [3, 'До 3 побед'], [5, 'До 5 побед']] as const).map(([wins, label]) => <button key={wins} disabled={busy} onClick={() => onSettings({ seriesTargetWins: wins })} className={`rounded-xl border px-2 py-3 text-sm font-bold ${room.seriesTargetWins === wins ? active : neutral}`}>{label}</button>)}</div><p className="mt-2 text-xs leading-5 text-slate-400">В серии каждый раунд — новый драфт и сезон с теми же правилами. Выше место в таблице — победа в раунде. При равенстве: очки, разница и забитые мячи.</p></div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[#292929] p-4"><div><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Показывать рейтинги</div><p className="mt-1 text-xs text-[#64748b]">{room.showRatings ? 'Рейтинги видны' : 'Слепой режим — рейтинги скрыты'}</p></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-[#00C896]">{room.showRatings ? 'Вкл' : 'Выкл'}</span><Switch checked={room.showRatings} disabled={!room.isHost || busy} onCheckedChange={value => onSettings({ showRatings:value })}/></div></div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[#292929] p-4"><div><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Тренер</div><p className="mt-1 text-xs text-[#64748b]">{room.withManager ? 'Случайный тренер добавит +2 к силе команды.' : 'Игра без тренера и бонуса.'}</p></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-[#00C896]">{room.withManager ? 'Вкл' : 'Выкл'}</span><Switch checked={room.withManager} disabled={!room.isHost || busy} onCheckedChange={value => onSettings({ withManager:value })}/></div></div>
      <div><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Режим драфта</div><div className="grid grid-cols-2 gap-2">{([['squad_first','Сначала состав','Крутите колесо, затем выберите игрока и позицию'],['position_first','Сначала позиция','Выберите позицию, затем крутите колесо']] as const).map(([mode,label,desc]) => <button key={mode} disabled={!room.isHost || busy} onClick={() => onSettings({ draftMode:mode })} className={`rounded-xl border p-3 text-center ${room.draftMode === mode ? active : neutral}`}><strong className="block text-sm">{label}</strong><span className="mt-1 block text-[11px] text-[#9CA3AF]">{desc}</span></button>)}</div></div>
      <div><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Рейтинг игроков</div><div className="grid grid-cols-2 gap-2">{([['season','Сезонный рейтинг','Рейтинг игрока в конкретном сезоне'],['prime','Прайм-рейтинг','Потенциал игрока в выбранном сезоне']] as const).map(([mode,label,desc]) => <button key={mode} disabled={!room.isHost || busy} onClick={() => onSettings({ ratingMode:mode })} className={`rounded-xl border p-3 text-center ${room.ratingMode === mode ? active : neutral}`}><strong className="block text-sm">{label}</strong><span className="mt-1 block text-[11px] text-[#9CA3AF]">{desc}</span></button>)}</div></div>
      <div><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Эпоха</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.entries(ERA_CONFIG) as [keyof typeof ERA_CONFIG, { label: string; minYear: number; maxYear: number }][]).map(([key,value]) => <button key={key} disabled={!room.isHost || busy} onClick={() => onSettings({ eraFilter:key, eraStartYear:value.minYear, eraEndYear:value.maxYear })} className={`rounded-full border px-2 py-2 text-sm font-bold ${room.eraFilter === key ? active : neutral}`}>{value.label}</button>)}</div>
      {room.eraFilter === 'custom' && <div className="mt-4 space-y-3"><div className="flex items-center justify-between text-2xl font-black text-[#00C896]"><span>{draftStart}</span><span className="mx-3 h-px flex-1 bg-[#00C896]/40"/><span className="text-sm font-normal text-[#9CA3AF]">—</span><span className="mx-3 h-px flex-1 bg-[#00C896]/40"/><span>{draftEnd}</span></div><div className="relative h-8"><div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#1f1f1f]"/><div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#00C896]/30" style={{ left: `${(draftStart-ERA_MIN_YEAR)/(ERA_MAX_YEAR-ERA_MIN_YEAR)*100}%`, right: `${(ERA_MAX_YEAR-draftEnd)/(ERA_MAX_YEAR-ERA_MIN_YEAR)*100}%` }}/><input aria-label="Начало периода" type="range" min={ERA_MIN_YEAR} max={ERA_MAX_YEAR-1} value={draftStart} onChange={event => setDraftStart(Math.min(Number(event.target.value),draftEnd-1))} onPointerUp={saveEra} onKeyUp={saveEra} onBlur={saveEra} className="era-range-slider pointer-events-none absolute inset-0 z-10 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0A0A0A] [&::-webkit-slider-thumb]:bg-[#00C896]"/><input aria-label="Конец периода" type="range" min={ERA_MIN_YEAR+1} max={ERA_MAX_YEAR} value={draftEnd} onChange={event => setDraftEnd(Math.max(Number(event.target.value),draftStart+1))} onPointerUp={saveEra} onKeyUp={saveEra} onBlur={saveEra} className="era-range-slider pointer-events-none absolute inset-0 z-20 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0A0A0A] [&::-webkit-slider-thumb]:bg-[#00C896]"/></div><div className="flex justify-between text-[10px] text-[#9CA3AF]/50">{Array.from({ length: ERA_MAX_YEAR-ERA_MIN_YEAR+1 }, (_,i) => ERA_MIN_YEAR+i).filter(year => year%5===0 || year===ERA_MAX_YEAR).map(year => <span key={year}>{year}</span>)}</div><p className="text-center text-xs text-[#64748b]">Период: {draftEnd-draftStart+1} лет</p></div>}
      </div>
    </div>}
    <div className={`${panel} overflow-hidden`}><button className="flex w-full items-center justify-between p-5 text-left font-semibold" onClick={() => setRulesOpen(v => !v)}>Как это работает <ChevronDown size={18} className={rulesOpen ? 'rotate-180' : ''}/></button>{rulesOpen && <p className="border-t border-white/10 px-5 pb-5 pt-4 text-sm leading-6 text-slate-400">Все участники одновременно крутят клуб и сезон, выбирают игроков на свободные позиции и собирают состав из 11 человек. На весь драфт даётся 3 минуты. После завершения все команды сыграют сезон РПЛ из 30 матчей. Побеждает участник выше в таблице. В серии состав собирается заново в каждом раунде.</p>}</div>
    <div className="space-y-2">{room.seats.length >= 2 && <button disabled={busy} onClick={() => onSeat(!own?.ready, own?.formation || '4-3-3')} className={`w-full ${own?.ready ? 'rounded-xl border border-emerald-500 py-3.5 font-bold text-emerald-300' : primary}`}>{own?.ready ? '✓ Вы готовы · Отменить' : 'Я готов'}</button>}{room.isHost && <button disabled={busy || room.seats.length < 2 || room.seats.some(s => !s.ready)} onClick={onStart} className={`w-full ${primary}`}>Начать драфт →</button>}<p className="text-center text-xs text-slate-500">{room.seats.length < 2 ? 'Нужен хотя бы ещё один участник или бот' : room.seats.some(s => !s.ready) ? 'Дождитесь готовности всех участников' : 'Все готовы к началу'}</p></div>
  </div>;
}

export function Draft({ room, run, spin, busy, remaining, onSpin, onReroll, onPick, onMove, onSkip, onFinish }: {
  room: Room; run: Run; spin: (Spin & { targetSlotPosition?: string }) | null; busy: boolean; remaining: number;
  onSpin: (target?: Slot) => Promise<void>; onReroll: (target?: Slot) => Promise<void>;
  onPick: (player: Player, slot: Slot) => Promise<boolean>; onMove: (from: Slot, to: Slot) => void;
  onSkip: () => void; onFinish: () => void;
}) {
  const [selected, setSelected] = useState<PlayerOption | null>(null);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [lastPlaced, setLastPlaced] = useState('');
  const spinRef = useRef<HTMLDivElement>(null);
  const pendingPick = useRef(false);
  useEffect(() => {
    if (spin?.targetSlotPosition) setTargetSlotIndex(run.slots.findIndex(slot => slot.slotPosition === spin.targetSlotPosition));
  }, [spin?.targetSlotPosition, run.slots]);
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
  const assign = async (index: number) => {
    if (locked || pendingPick.current || !selected || room.draftMode === 'position_first' && targetSlotIndex !== index) return;
    pendingPick.current = true;
    const player = selected;
    try {
      if (await onPick(player, run.slots[index])) {
        setLastPlaced(`${player.fullName} → ${slots[index].positionLabel}`);
        setSelected(null);
        setTargetSlotIndex(null);
        setTimeout(() => spinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800);
      }
    } finally { pendingPick.current = false; }
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
        {filled === 11 || locked && remaining <= 0 ? <div className="rounded-2xl border border-[#1E1E1E] bg-[#141414] p-6 text-center"><h2 className="text-xl font-black">{filled === 11 ? 'Состав готов' : 'Время драфта истекло'}</h2><p className="my-3 text-sm text-[#9CA3AF]">{filled === 11 ? 'Когда все закончат, начнётся отсчёт 10 секунд.' : 'Оставшиеся позиции заполнятся автоматически.'}</p>{filled === 11 && <button disabled={busy || room.seats.find(value => value.isYou)?.ready} onClick={onFinish} className={primary}>{room.seats.find(value => value.isYou)?.ready ? `Сезон начнётся через ${remaining} с` : 'Готово · ждать сезон'}</button>}</div> : <>
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

export function Results({ room, run, onReplay, onFinish, onNext, onMenu }: { room: Room; run: Run | null; onReplay: () => void; onFinish: () => void; onNext: () => void; onMenu: () => void }) {
  const own = room.seats.find(value => value.isYou);
  const results = room.results ?? [];
  const mine = results.find(value => value.id === own?.id);
  if (!mine) return <div className="text-center text-[#9CA3AF]">Загружаем результаты сезона…</div>;
  if (room.ownResultViewed) {
    const scores = Object.entries(room.seriesScores).sort((a,b) => b[1].wins-a[1].wins || b[1].seasonWins-a[1].seasonWins || b[1].points-a[1].points);
    const winner = room.seriesWinnerKey ? room.seriesScores[room.seriesWinnerKey] : null;
    return <div className="mx-auto max-w-2xl space-y-5 pb-14 animate-fade-in">
      <div className={`${panel} p-6 text-center sm:p-8`}>
        <span className="text-4xl">{winner ? '🏆' : '⚽'}</span>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">{winner ? 'Серия завершена' : 'Итоги сезона'}</h1>
        <p className="mt-2 text-sm text-slate-400">{winner ? `Победитель серии — ${winner.name}` : room.seriesTargetWins ? `Раунд ${room.seriesRound} · до ${room.seriesTargetWins} побед` : 'Матч завершён'}</p>
      </div>
      <div className={`${panel} p-5 sm:p-6`}><h2 className="mb-4 font-bold">{room.seriesTargetWins ? 'Счёт серии' : 'Таблица участников'}</h2>
        {(room.seriesTargetWins ? scores.map(([key, score], index) => ({ id: key, name: score.name, wins: score.wins, points: score.points, isYou: key === own?.seriesMemberKey, position: index + 1 })) : results.map((result, index) => ({ id: result.id, name: result.name, wins: 0, points: result.points, isYou: result.id === mine.id, position: index + 1 }))).map(item => <div key={item.id} className={`flex items-center justify-between gap-3 border-b border-white/10 py-3 last:border-0 ${item.isYou ? 'text-[#00C896]' : 'text-slate-200'}`}><span className="font-semibold">{item.name}{item.isYou ? ' · вы' : ''}</span><strong>{room.seriesTargetWins ? `${item.wins} побед` : `${item.position}-е место · ${item.points} очков`}</strong></div>)}
      </div>
      {winner && <SeriesFinalDetails code={room.code}/>}
      {room.seriesTargetWins > 0 && !winner ? <button className={`${primary} w-full`} onClick={onNext}>{room.nextRoomCode ? 'Перейти к следующему раунду →' : 'Создать следующий раунд →'}</button> : <button className={`${primary} w-full`} onClick={onReplay}>Сыграть снова →</button>}
      <button onClick={onMenu} className="w-full rounded-xl border border-white/20 py-3 font-semibold hover:bg-white/5">В меню</button>
    </div>;
  }
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
  return <div>{mine.forfeited && <div role="alert" className="mx-auto mb-5 max-w-4xl rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-center"><strong className="block text-lg text-red-300">Время драфта истекло</strong><span className="text-sm text-[#9CA3AF]">Вы не успели собрать 11 игроков за три минуты.</span></div>}
    <SimulationResult multiplayer={{ data: { runId: run?.id, points: mine.points, wins: mine.wins,
    draws: mine.draws, losses: mine.losses, goalsFor: mine.goalsFor, goalsAgainst: mine.goalsAgainst,
    position, formation: config.formation, matches, table }, config, slots,
    onHome: onFinish, onReplay: onFinish }}/></div>;
}

type SeriesDetails = { bestSquad: { name: string; rating: number } | null; bestStreak: { name: string; wins: number } | null;
  rounds: { round: number; code: string; winner: string; squads: { memberKey: string; name: string; rank: number; rating: number;
    points: number; wins: number; goalsFor: number; winStreak: number; formation: string;
    players: { position: string; name: string; rating: number }[] }[] }[] };

function SeriesFinalDetails({ code }: { code: string }) {
  const [details, setDetails] = useState<SeriesDetails | null>(null);
  const [error, setError] = useState(false);
  const [openRound, setOpenRound] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/multiplayer/rooms/${code}/series`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Не удалось загрузить серию'); return response.json(); })
      .then(value => setDetails(value))
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [code]);
  if (error) return <p role="alert" className="text-center text-sm text-rose-300">Не удалось загрузить составы серии. Обновите страницу.</p>;
  if (!details) return <p role="status" className="text-center text-sm text-slate-400">Загружаем статистику серии…</p>;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <div className={`${panel} p-4`}><div className="text-xs uppercase tracking-widest text-slate-400">Лучший состав</div><strong className="mt-2 block text-lg text-[#00C896]">{details.bestSquad?.name ?? '—'}</strong><span className="text-sm text-slate-300">Сила команды: {details.bestSquad?.rating ?? '—'}</span></div>
      <div className={`${panel} p-4`}><div className="text-xs uppercase tracking-widest text-slate-400">Самая длинная серия побед в сезоне</div><strong className="mt-2 block text-lg text-[#00C896]">{details.bestStreak?.name ?? '—'}</strong><span className="text-sm text-slate-300">{details.bestStreak?.wins ?? 0} побед подряд</span></div>
    </div>
    <h2 className="pt-2 text-lg font-bold">Раунды и составы</h2>
    {details.rounds.map(round => <div key={round.code} className={`${panel} overflow-hidden`}>
      <button onClick={() => setOpenRound(openRound === round.round ? null : round.round)} aria-expanded={openRound === round.round} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-white/5">
        <span><strong>Раунд {round.round}</strong><span className="mt-1 block text-sm text-slate-400">Победитель: {round.winner}</span></span><ChevronDown size={18} className={`shrink-0 transition ${openRound === round.round ? 'rotate-180' : ''}`}/>
      </button>
      {openRound === round.round && <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2">{round.squads.map(squad => <div key={squad.memberKey} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
        <div className="flex justify-between gap-2"><strong className="truncate">{squad.rank}. {squad.name}</strong><span className="shrink-0 font-bold text-[#00C896]">{squad.points} очков</span></div>
        <p className="mt-1 text-xs text-slate-400">{squad.formation} · сила {squad.rating} · {squad.wins} побед · {squad.goalsFor} голов · серия {squad.winStreak}</p>
        <ul className="mt-3 grid gap-1 text-xs">{squad.players.map((player, index) => <li key={index} className="flex justify-between gap-2 border-t border-white/5 pt-1.5"><span className="min-w-0 truncate"><span className="mr-2 text-slate-500">{player.position}</span>{player.name}</span><strong className="text-[#00C896]">{player.rating}</strong></li>)}</ul>
      </div>)}</div>}
    </div>)}
  </div>;
}