import { ImageResponse } from 'next/og';
import { sharedSeason } from '@/lib/sharedSeason';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await sharedSeason(runId);
  if (!run) return new ImageResponse(<div style={{ background: '#0a0a0a', color: '#fff', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>30-0</div>, size);
  return new ImageResponse(<div style={{ background: 'linear-gradient(145deg,#07170e,#111827)', color: '#fff', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 64, fontFamily: 'sans-serif' }}>
    <div style={{ fontSize: 40, fontWeight: 900, color: '#00C896' }}>30-0 · РПЛ</div>
    <div style={{ display: 'flex', fontSize: 34, marginTop: 30 }}>{`${run.teamName || run.clubFilter || 'Обычный драфт'} · ${run.formation}`}</div>
    <div style={{ display: 'flex', fontSize: 110, fontWeight: 900, marginTop: 25 }}>{run.points ?? 0} <span style={{ display: 'flex', fontSize: 36, alignSelf: 'center', marginLeft: 12 }}>{`очков · ${run.position ?? '—'} место`}</span></div>
    <div style={{ display: 'flex', gap: 30, fontSize: 34, marginTop: 35 }}><span style={{ color: '#00C896' }}>{`${run.wins ?? 0} побед`}</span><span>{`${run.draws ?? 0} ничьих`}</span><span style={{ color: '#f87171' }}>{`${run.losses ?? 0} поражений`}</span></div>
    <div style={{ display: 'flex', fontSize: 27, color: '#aeb9c7', marginTop: 35 }}>{`Голы ${run.goalsFor ?? 0}:${run.goalsAgainst ?? 0} · Собери свою команду на 30-0.рф`}</div>
  </div>, size);
}
