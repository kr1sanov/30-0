 'use client';
import { useState } from 'react';
import { useFootballNames } from '@/hooks/use-football-names';
import type { SeasonPlayerStat } from '@/lib/seasonAnalytics';
export default function SeasonPlayerStats({ stats, ownTeam }: { stats: SeasonPlayerStat[]; ownTeam: string }) {
  const { player, club, language } = useFootballNames();
  const en = language === 'en';
  const [team, setTeam] = useState('');
  const teams = [...new Set(stats.map(p => p.team))];
  const filtered = stats.filter(p => !team || p.team === team);
  return <section className="rounded-2xl border border-white/10 bg-[#141414] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{en ? 'Simulation player statistics' : 'Статистика игроков в симуляции'}</h2><select aria-label={en ? 'Team statistics' : 'Статистика команды'} value={team} onChange={event => setTeam(event.target.value)} className="max-w-full rounded-lg border border-white/20 bg-[#0a0a0a] p-2 text-sm"><option value="">{en ? 'All teams' : 'Все команды'}</option>{teams.map(name => <option key={name} value={name}>{name === ownTeam ? (en ? 'My team' : 'Моя команда') : club(name)}</option>)}</select></div>
    <div className="mt-4 grid gap-5 sm:grid-cols-2">{(['goals','assists'] as const).map(metric => <div key={metric}><h3 className="mb-2 text-sm font-bold text-emerald-300">{metric === 'goals' ? (en ? 'Top scorers' : 'Лучшие бомбардиры') : (en ? 'Top assisters' : 'Лучшие ассистенты')}</h3><ol className="space-y-2">{[...filtered].sort((a,b) => b[metric]-a[metric] || a.name.localeCompare(b.name)).filter(p => p[metric]>0).slice(0,10).map((p,i) => <li key={`${p.team}:${p.name}:${i}`} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 text-sm"><span className="min-w-0"><strong data-no-translate className="block truncate">{i+1}. {player(p.name)}</strong><span data-no-translate className="text-xs text-slate-400">{p.team === ownTeam ? (en ? 'My team' : 'Моя команда') : club(p.team)}</span></span><strong>{p[metric]}</strong></li>)}</ol></div>)}</div>
  </section>;
}
