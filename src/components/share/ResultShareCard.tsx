'use client';

import { useEffect, useState } from 'react';
import { getClubTheme } from '@/lib/clubThemes';
import { localizePlayerName } from '@/lib/footballNames';
import { localizedClubName } from '@/lib/clubDisplayName';
import { translateInterface } from '@/lib/enTranslations';

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
  const [english, setEnglish] = useState(false);
  useEffect(() => {
    const update = () => setEnglish(document.documentElement.lang === 'en');
    const onLanguageChange = (event: Event) => setEnglish((event as CustomEvent<string>).detail === 'en');
    update();
    window.addEventListener('30-0-language-change', onLanguageChange);
    return () => window.removeEventListener('30-0-language-change', onLanguageChange);
  }, []);
  const club = getClubTheme(mode === 'single_club' ? clubName ?? undefined : undefined);
  const primary = mode === 'challenge' ? challengeId === 'challenge_vagner' ? '#e53945' : '#30a4e8' : mode === 'multiplayer' ? '#a78bfa' : club.primary;
  const secondary = mode === 'challenge' ? challengeId === 'challenge_vagner' ? '#1844a4' : '#132d53' : mode === 'multiplayer' ? '#59309b' : club.secondary;
  const modeLabel = mode === 'single_club' ? localizedClubName(clubName, english ? 'en' : 'ru') || (english ? 'One club' : 'Один клуб') : mode === 'challenge' ? challengeId === 'challenge_vagner' ? (english ? 'Vagner Love · Legend' : 'Вагнер Лав · Легенда') : (english ? 'Dzyuba · Goalscoring era' : 'Голевая эпоха · Дзюба') : mode === 'multiplayer' ? (english ? 'Multiplayer' : 'Мультиплеер') : (english ? 'Classic draft' : 'Обычный драфт');
  return <div style={{ width: 540, height: 960, boxSizing: 'border-box', overflow: 'hidden', position: 'relative', padding: 30, background: `radial-gradient(circle at 50% 0%, ${secondary}, #070b10 55%)`, color: '#fff', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ height: '100%', border: `1px solid ${primary}70`, borderRadius: 22, background: 'linear-gradient(150deg, #0b211bdd, #080a11f5 65%)', padding: '27px 25px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><img src="/brand-30-0.svg" alt="30-0" width={48} height={48} /><span style={{ border: `1px solid ${primary}99`, borderRadius: 20, color: primary, padding: '5px 12px', fontSize: 11, fontWeight: 700 }}>{modeLabel}</span></div>
      <div style={{ marginTop: 10, fontWeight: 900, fontSize: 19, textAlign: 'center' }}>30-0 · {english ? 'Russian Premier League Draft' : 'Драфт Российской Премьер-лиги'}</div>
      {teamName && teamName !== modeLabel && <div style={{ marginTop: 8, fontSize: 14, color: '#cbd5e1' }}>{teamName}</div>}
      <div style={{ marginTop: 37, fontSize: 76, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{data.wins}-{data.draws}-{data.losses}</div>
      <div style={{ marginTop: 7, fontSize: 11, letterSpacing: 2, color: '#a7b6bd' }}>{english ? 'WON · DRAWN · LOST' : 'ПОБЕДЫ · НИЧЬИ · ПОРАЖЕНИЯ'}</div>
      <div style={{ marginTop: 18, color: primary, fontSize: 22, fontWeight: 800 }}>{data.points} {english ? 'pts' : 'очков'} <span style={{ color: '#d1d5db', fontSize: 17 }}>· {data.position} {english ? 'place' : 'место'}</span></div>
      {data.position === 1 && <div style={{ marginTop: 12, padding: '5px 14px', borderRadius: 20, border: '1px solid #c99a20', color: '#f8cc44', background: '#6b480b55', fontSize: 12, fontWeight: 800 }}>🏆 {english ? 'CHAMPION' : 'ЧЕМПИОН'}</div>}
      <div style={{ marginTop: 26, width: '100%', display: 'flex', justifyContent: 'space-around', borderTop: `1px solid ${primary}55`, borderBottom: `1px solid ${primary}55`, padding: '18px 0', textAlign: 'center' }}>{[[data.goalsFor, english ? 'Scored' : 'Забито'], [data.goalsAgainst, english ? 'Conceded' : 'Пропущено'], [data.formation || '4-3-3', english ? 'Formation' : 'Схема']].map(([value, label]) => <div key={label}><strong style={{ display: 'block', color: primary, fontSize: 25 }}>{value}</strong><span style={{ fontSize: 11, color: '#a7b6bd' }}>{label}</span></div>)}</div>
      <div style={{ marginTop: 25, width: '100%', padding: '17px 15px', borderRadius: 15, border: `1px solid ${primary}45`, background: '#101821', boxSizing: 'border-box' }}><div style={{ color: primary, fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{english ? 'SEASON XI' : 'СОСТАВ СЕЗОНА'}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 9px' }}>{players.slice(0, 11).map((player, index) => <div key={`${localizePlayerName(player.name, english ? 'en' : 'ru')}-${index}`} style={{ minWidth: 0, display: 'flex', gap: 4, fontSize: 11 }}><b style={{ color: primary }}>{english ? translateInterface(player.position) : player.position}</b><span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{localizePlayerName(player.name, english ? 'en' : 'ru')}</span><b>{player.rating ?? ''}</b></div>)}</div>{managerName && <div style={{ marginTop: 12, fontSize: 11, color: '#a7b6bd' }}>{english ? 'Manager' : 'Тренер'}: {english ? translateInterface(managerName) : managerName}</div>}</div>
      {trophies.length > 0 && <div style={{ marginTop: 13, textAlign: 'center', color: '#eac457', fontSize: 11 }}>{trophies.slice(0, 2).map(t => `${t.icon} ${english ? translateInterface(t.name) : t.name}`).join(' · ')}</div>}
      <div style={{ marginTop: 'auto', color: primary, fontSize: 24, fontWeight: 900, paddingTop: 28 }}>@RPL30_bot</div>
    </div>
  </div>;
}
