'use client';

import { getClubTheme } from '@/lib/clubThemes';

interface Props {
  data: { points: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; position: number; formation?: string };
  trophies?: Array<{ icon: string; name: string }>;
  teamName?: string | null;
  managerName?: string | null;
  mode?: 'classic' | 'single_club' | 'challenge' | 'multiplayer';
  challengeId?: string | null;
  clubName?: string | null;
  players?: Array<{ name: string; position: string; rating?: number }>;
}

/** Fixed 540 × 960 layout captured at scale 2 for a 1080 × 1920 story. */
export default function ResultShareCard({ data, trophies = [], teamName, managerName, mode = 'classic', challengeId, clubName, players = [] }: Props) {
  const club = getClubTheme(mode === 'single_club' ? clubName ?? undefined : undefined);
  const primary = mode === 'challenge' ? challengeId === 'challenge_vagner' ? '#e53945' : '#30a4e8' : mode === 'multiplayer' ? '#a78bfa' : club.primary;
  const secondary = mode === 'challenge' ? challengeId === 'challenge_vagner' ? '#1844a4' : '#132d53' : mode === 'multiplayer' ? '#59309b' : club.secondary;
  const modeLabel = mode === 'single_club' ? clubName || 'Один клуб' : mode === 'challenge' ? challengeId === 'challenge_vagner' ? 'Вагнер Лав · Легенда' : 'Голевая эпоха · Дзюба' : mode === 'multiplayer' ? 'Мультиплеер' : 'Обычный драфт';
  return <div style={{ width: 540, height: 960, boxSizing: 'border-box', overflow: 'hidden', position: 'relative', background: '#080b10', color: '#fff', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 28%, ${primary}60, transparent 44%), linear-gradient(160deg, ${secondary}55, #080b10 60%)` }} />
    <div style={{ position: 'absolute', left: -150, right: -150, top: 470, height: 390, border: `2px solid ${primary}22`, borderRadius: '50%', transform: 'rotate(-12deg)' }} />
    <div style={{ position: 'relative', height: '100%', padding: '42px 38px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <img src="/brand-30-0.svg" alt="30-0" width={148} height={148} style={{ width: 148, height: 148, objectFit: 'contain', filter: 'drop-shadow(0 7px 25px #0009)' }} />
      <div style={{ marginTop: 5, textAlign: 'center', fontWeight: 900, fontSize: 20, lineHeight: 1.2 }}>30-0 · Драфт Российской Премьер-лиги</div>
      <div style={{ marginTop: 16, padding: '9px 20px', background: `${primary}33`, border: `1px solid ${primary}aa`, borderRadius: 30, fontWeight: 800, fontSize: 16, maxWidth: '100%', textAlign: 'center' }}>{modeLabel}</div>
      {teamName && teamName !== modeLabel && <div style={{ marginTop: 11, fontSize: 18, fontWeight: 700 }}>{teamName}</div>}
      <div style={{ marginTop: 32, textAlign: 'center', fontSize: 104, lineHeight: 1, fontWeight: 900, letterSpacing: -6, color: data.position === 1 ? '#ffe079' : '#fff' }}>{data.points}</div>
      <div style={{ marginTop: 6, textAlign: 'center', fontSize: 22, fontWeight: 700 }}>очков · {data.position}-е место</div>
      <div style={{ marginTop: 28, width: '100%', display: 'flex', justifyContent: 'space-around', padding: '18px 0', borderTop: `1px solid ${primary}66`, borderBottom: `1px solid ${primary}66` }}>
        {[[data.wins, 'побед'], [data.draws, 'ничьих'], [data.losses, 'поражений']].map(([value, label], i) => <div key={label} style={{ textAlign: 'center' }}><strong style={{ display: 'block', fontSize: 36, color: i === 0 ? primary : i === 2 ? '#fb7185' : '#fff' }}>{value}</strong><span style={{ fontSize: 14, color: '#b7c2d0' }}>{label}</span></div>)}
      </div>
      <div style={{ marginTop: 18, fontSize: 17, color: '#cbd5e1' }}>Голы: {data.goalsFor}–{data.goalsAgainst} · {data.formation || '4-3-3'}</div>
      <div style={{ marginTop: 26, width: '100%', borderRadius: 20, background: '#0f1725dd', border: `1px solid ${primary}44`, padding: 22, boxSizing: 'border-box' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: 13, fontWeight: 900, color: primary, marginBottom: 15 }}>Состав сезона</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 14px' }}>
          {players.slice(0, 11).map((player, index) => <div key={`${player.name}-${index}`} style={{ display: 'flex', gap: 5, minWidth: 0, fontSize: 13 }}><b style={{ color: primary }}>{player.position}</b><span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{player.name}</span><b>{player.rating ?? ''}</b></div>)}
        </div>
        {managerName && <div style={{ marginTop: 14, fontSize: 13, color: '#cbd5e1' }}>Тренер: {managerName}</div>}
        {!players.length && <div style={{ fontSize: 13, color: '#94a3b8' }}>Сезон завершён</div>}
      </div>
      {trophies.length > 0 && <div style={{ marginTop: 16, width: '100%', textAlign: 'center', fontSize: 14, color: '#fcd34d' }}>{trophies.slice(0, 3).map(t => `${t.icon} ${t.name}`).join(' · ')}</div>}
      <div style={{ marginTop: 'auto', textAlign: 'center', paddingTop: 18, borderTop: `1px solid ${primary}55`, width: '100%' }}><strong style={{ display: 'block', fontSize: 25, color: primary }}>@RPL30_bot</strong><span style={{ display: 'block', marginTop: 7, fontSize: 14, color: '#b7c2d0' }}>30-0.рф · Сыграй свой сезон</span></div>
    </div>
  </div>;
}
