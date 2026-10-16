import { challengeModeTitle } from '@/lib/weeklyChallenges';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { sharedSeason } from '@/lib/sharedSeason';
import { db } from '@/lib/db';
import { getClubTheme } from '@/lib/clubThemes';

export async function storyImage(run: NonNullable<Awaited<ReturnType<typeof sharedSeason>>>, lang: 'ru' | 'en') {
  const logoSvg = await readFile(path.join(process.cwd(), 'public/brand-30-0.svg'));
  const logoPng = await sharp(logoSvg).resize(300, 300).png().toBuffer();
  const logo = `data:image/png;base64,${logoPng.toString('base64')}`;
  const club = run.clubFilter ? await db.club.findUnique({ where: { id: run.clubFilter }, select: { nameRu: true, nameEn: true } }) : null;
  const theme = getClubTheme(club?.nameRu);
  const primary = run.gameMode === 'challenge_vagner' ? '#e53945' : run.gameMode === 'challenge_dzyuba' ? '#30a4e8' : run.gameMode === 'single_club' ? theme.primary : run.gameMode === 'multiplayer' ? '#a78bfa' : '#00C896';
  const secondary = run.gameMode === 'challenge_vagner' ? '#172554' : run.gameMode === 'challenge_dzyuba' ? '#163d5e' : run.gameMode === 'single_club' ? theme.secondary : '#092b25';
  const mode = run.gameMode.startsWith('challenge_') ? challengeModeTitle(run.gameMode, lang) : run.gameMode === 'single_club' ? (lang === 'en' ? club?.nameEn || club?.nameRu : club?.nameRu) || (lang === 'en' ? 'One club' : 'Один клуб') : run.gameMode === 'multiplayer' ? (lang === 'en' ? 'Multiplayer' : 'Мультиплеер') : (lang === 'en' ? 'Classic draft' : 'Обычный драфт');
  const words = lang === 'en' ? { project: 'Russian Premier League Draft', points: 'pts', place: 'place', scored: 'Scored', conceded: 'Conceded', formation: 'Formation', squad: 'SEASON XI', champion: 'CHAMPION' } : { project: 'Драфт Российской Премьер-лиги', points: 'очков', place: 'место', scored: 'Забито', conceded: 'Пропущено', formation: 'Схема', squad: 'СОСТАВ СЕЗОНА', champion: 'ЧЕМПИОН' };
  return new ImageResponse(<div style={{ display: 'flex', width: 1080, height: 1920, background: `linear-gradient(155deg, ${secondary}, #070b10 65%)`, padding: 58, boxSizing: 'border-box', color: '#fff', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', border: `3px solid ${primary}88`, borderRadius: 46, background: 'linear-gradient(155deg, #0b211b, #080a11 70%)', padding: '56px 48px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}><img src={logo} alt="30-0" width={100} height={100}/><div style={{ display: 'flex', border: `2px solid ${primary}`, borderRadius: 44, color: primary, padding: '14px 28px', fontSize: 27, fontWeight: 800 }}>{mode}</div></div>
      <div style={{ display: 'flex', marginTop: 32, fontSize: 42, fontWeight: 900, textAlign: 'center' }}>30-0 · {words.project}</div>
      <div style={{ display: 'flex', marginTop: 132, fontSize: 165, fontWeight: 900, lineHeight: 1 }}>{run.wins ?? 0}-{run.draws ?? 0}-{run.losses ?? 0}</div>
      <div style={{ display: 'flex', marginTop: 24, letterSpacing: 5, color: '#a7b6bd', fontSize: 24 }}>{lang === 'en' ? 'WON · DRAWN · LOST' : 'ПОБЕДЫ · НИЧЬИ · ПОРАЖЕНИЯ'}</div>
      <div style={{ display: 'flex', marginTop: 55, alignItems: 'center', color: primary, fontSize: 55, fontWeight: 800 }}>{run.points ?? 0} {words.points}<span style={{ color: '#d1d5db', fontSize: 37 }}> · {run.position ?? '—'} {words.place}</span></div>
      {run.position === 1 && <div style={{ display: 'flex', marginTop: 30, border: '2px solid #d5a62f', borderRadius: 40, padding: '10px 25px', color: '#f8cc44', fontSize: 29 }}>🏆 {words.champion}</div>}
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', marginTop: 90, padding: '40px 0', borderTop: `2px solid ${primary}77`, borderBottom: `2px solid ${primary}77` }}>{[[run.goalsFor, words.scored], [run.goalsAgainst, words.conceded], [run.formation, words.formation]].map(([value, label], index) => <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><strong style={{ color: primary, fontSize: 58 }}>{value ?? 0}</strong><span style={{ color: '#a7b6bd', fontSize: 25 }}>{label}</span></div>)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: 68, borderRadius: 34, border: `2px solid ${primary}66`, background: '#101821', padding: 38, boxSizing: 'border-box' }}><strong style={{ display: 'flex', color: primary, fontSize: 29, marginBottom: 33 }}>{words.squad}</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>{run.slots.filter(slot => slot.playerName).map((slot, index) => <div key={index} style={{ display: 'flex', width: '47%', justifyContent: 'space-between', fontSize: 25 }}><span>{slot.playerName}</span><strong>{slot.playerRating}</strong></div>)}</div></div>
      <div style={{ display: 'flex', marginTop: 'auto', paddingTop: 80, fontSize: 66, fontWeight: 900, color: primary }}>@RPL30_bot</div>
    </div>
  </div>, { width: 1080, height: 1920 });
}
