'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFootballNames } from '@/hooks/use-football-names';
import { useUiTranslation } from '@/hooks/use-ui-translation';
import { POSITION_NAMES, type Position } from '@/lib/positions';
import type { RoomResult } from './MultiplayerViews';

export default function ParticipantSquadDialog({ result, onClose }: { result: RoomResult | null; onClose: () => void }) {
  const t = useUiTranslation();
  const { player: playerName, displayName } = useFootballNames();
  const squad = result?.squad;
  const stats = result?.playerStats?.filter(stat => stat.team === result.name);
  const filled = squad?.players.filter(player => player.name) ?? [];
  const ratings = filled.flatMap(player => player.rating === null ? [] : [player.rating]);
  const average = ratings.length ? Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : null;
  const leader = (key: 'goals' | 'assists') => stats?.filter(stat => stat[key] > 0).sort((a,b) => b[key] - a[key])[0];
  const scorer = leader('goals'), assister = leader('assists');
  const cleanSheets = result?.matches.filter(match => match.against === 0).length ?? 0;
  return <Dialog open={Boolean(result)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent data-no-translate className="max-h-[85dvh] overflow-y-auto border-white/15 bg-[#111418] p-4 text-white sm:max-w-2xl sm:p-6">
      <DialogHeader className="pr-6 text-left">
        <DialogTitle className="break-words">{result?.name} · {t('Состав')}</DialogTitle>
        <DialogDescription className="text-slate-400">{t('Итоги сезона')} · {squad?.formation ?? '—'} · {filled.length}/11</DialogDescription>
      </DialogHeader>
      {result?.forfeited && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{t('Неполный состав: технические поражения 0:3 во всех матчах сезона.')}</p>}
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[[t('Рейтинг состава'), average ?? '—'], [t('Сухие матчи'), cleanSheets], [t('Голы'), result?.goalsFor ?? '—'], [t('Голевые передачи'), stats?.length ? stats.reduce((sum, stat) => sum + stat.assists, 0) : '—']].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3"><span className="block text-xs text-slate-400">{label}</span><strong className="mt-1 block text-lg text-emerald-300">{value}</strong></div>)}
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {[{ label: t('Лучший бомбардир'), player: scorer, count: scorer?.goals }, { label: t('Лучший ассистент'), player: assister, count: assister?.assists }].map(item => <div key={item.label} className="rounded-lg bg-emerald-500/5 p-3"><span className="block text-xs text-slate-400">{item.label}</span><strong>{item.player ? `${playerName(item.player.name)} · ${item.count}` : '—'}</strong></div>)}
      </div>
      {squad ? <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-white/5 text-slate-400"><tr><th className="px-3 py-3">{t('Игрок')} / {t('Позиция')}</th><th className="px-2 text-center">{t('Рейтинг')}</th><th className="px-2 text-center" title={t('Голы')}>⚽</th><th className="px-3 text-center" title={t('Голевые передачи')}>🅰</th></tr></thead>
          <tbody>{squad.players.map(player => {
            const role = player.slot.split('_')[0] as Position;
            const names = player.name ? displayName(player.name, player.surname || '') : null;
            const contributions = stats?.filter(stat => stat.name === player.name);
            const total = (key: 'goals' | 'assists') => stats?.length ? contributions?.reduce((sum, stat) => sum + stat[key], 0) ?? 0 : '—';
            return <tr key={player.slot} className="border-t border-white/10 align-top">
              <td className="px-3 py-3"><span className="block break-words">{names ? <><strong>{names.surname}</strong> {names.given}</> : <span className="text-slate-500">{t('Позиция свободна')}</span>}</span><span className="mt-1 block text-[11px] text-slate-400">{t(POSITION_NAMES[role] || role)}{player.season ? ` · ${player.season}` : ''}</span>{player.position && <span className="mt-1 block text-[10px] text-slate-500">{[player.position, ...player.otherPositions].filter((position,index,all) => all.indexOf(position) === index).map(position => t(POSITION_NAMES[position as Position] || position)).join(' · ')}</span>}</td>
              <td className="px-2 py-3 text-center font-bold text-emerald-300">{player.rating ?? '—'}</td><td className="px-2 py-3 text-center">{player.name ? total('goals') : '—'}</td><td className="px-3 py-3 text-center">{player.name ? total('assists') : '—'}</td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <p className="py-6 text-center text-slate-400">{t('Состав недоступен')}</p>}
    </DialogContent>
  </Dialog>;
}
