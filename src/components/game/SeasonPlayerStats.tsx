'use client';
import { useState } from 'react';
import { useFootballNames } from '@/hooks/use-football-names';
import type { SeasonPlayerStat } from '@/lib/seasonAnalytics';
export default function SeasonPlayerStats({ stats, ownTeam }: { stats: SeasonPlayerStat[]; ownTeam: string }) {
  const { displayName, club, language } = useFootballNames();
  const en = language === 'en';
  const [team, setTeam] = useState('');
  const [expanded, setExpanded] = useState(false);
  const teams = [...new Set(stats.map(p => p.team))];
  const filtered = stats.filter(p => !team || p.team === team);
  return <details open className="rounded-2xl border border-white/10 bg-[#141414] p-4">
    <summary className="min-h-8 cursor-pointer font-bold">{en ? 'Player statistics' : 'Статистика игроков'}</summary>
    <select aria-label={en ? 'Team statistics' : 'Статистика команды'} value={team} onChange={event => { setTeam(event.target.value); setExpanded(false); }} className="mt-3 max-w-full rounded-lg border border-white/20 bg-[#0a0a0a] p-2 text-sm"><option value="">{en ? 'All teams' : 'Все команды'}</option>{teams.map(name => <option key={name} value={name}>{name === ownTeam ? (en ? 'My team' : 'Моя команда') : name.startsWith('@') ? name : club(name)}</option>)}</select>
    <div className="mt-4 grid gap-5 sm:grid-cols-2">{(['goals','assists'] as const).map(metric => <div key={metric}><h3 className="mb-2 text-sm font-bold text-emerald-300">{metric === 'goals' ? (en ? 'Top scorers' : 'Лучшие бомбардиры') : (en ? 'Top assisters' : 'Лучшие ассистенты')}</h3><ol className={`space-y-2 ${expanded ? 'max-h-96 overflow-y-auto' : ''}`}>{[...filtered].sort((a,b) => b[metric]-a[metric] || a.name.localeCompare(b.name)).filter(p => p[metric]>0).slice(0,expanded ? undefined : 3).map((p,i) => { const name = displayName(p.name, ''); return <li key={`${p.team}:${p.name}:${i}`} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 text-sm"><span className="min-w-0"><span data-no-translate className="block truncate">{i+1}. <strong>{name.surname}</strong>{name.given && ` ${name.given}`}</span><span data-no-translate className="text-xs text-slate-400">{p.team === ownTeam ? (en ? 'My team' : 'Моя команда') : p.team.startsWith('@') ? p.team : club(p.team)}</span></span><strong>{p[metric]}</strong></li>; })}</ol></div>)}</div>
    {filtered.some(p => p.goals > 0) && <button aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="mt-3 min-h-11 w-full rounded-lg border border-white/15 px-3 text-xs font-bold text-emerald-300">{expanded ? (en ? 'Show top 3' : 'Показать тройку лучших') : (en ? 'Show all players' : 'Показать всех игроков')}</button>}
  </details>;
}
