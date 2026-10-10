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
  const mode = run.gameMode === 'challenge_vagner' ? 'Vagner Love' : run.gameMode === 'challenge_dzyuba' ? 'Artem Dzyuba' : run.gameMode === 'single_club' ? (lang === 'en' ? club?.nameEn || club?.nameRu : club?.nameRu) || (lang === 'en' ? 'One club' : 'Один клуб') : run.gameMode === 'multiplayer' ? (lang === 'en' ? 'Multiplayer' : 'Мультиплеер') : (lang === 'en' ? 'Classic draft' : 'Обычный драфт');
  const words = lang === 'en' ? { project: 'Russian Premier League Draft', points: 'points', place: 'place', wins: 'wins', draws: 'draws', losses: 'losses', goals: 'Goals', squad: 'Season XI', play: 'Play your season' } : { project: 'Драфт Российской Премьер-лиги', points: 'очков', place: 'место', wins: 'побед', draws: 'ничьих', losses: 'поражений', goals: 'Голы', squad: 'Состав сезона', play: 'Сыграй свой сезон' };
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 76, boxSizing: 'border-box', background: `linear-gradient(160deg, ${secondary}, #080b10 68%)`, color: '#fff', fontFamily: 'sans-serif' }}>
    <img src={logo} alt="30-0" width={290} height={290}/>
    <div style={{ display: 'flex', marginTop: 15, fontSize: 43, fontWeight: 900, textAlign: 'center' }}>30-0 · {words.project}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 65, minHeight: 80, border: `3px solid ${primary}`, borderRadius: 60, padding: '10px 36px', fontSize: 36, fontWeight: 800 }}>{mode}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 70, height: 240, lineHeight: 1, color: '#ffe079', fontSize: 190, fontWeight: 900 }}>{run.points ?? 0}</div>
    <div style={{ display: 'flex', marginTop: 12, fontSize: 46, fontWeight: 700 }}>{words.points} · {run.position ?? '—'} {words.place}</div>
    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', marginTop: 80, padding: '46px 0', borderTop: `3px solid ${primary}`, borderBottom: `3px solid ${primary}` }}>
      {[[run.wins, words.wins], [run.draws, words.draws], [run.losses, words.losses]].map(([value, title], index) => <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><strong style={{ fontSize: 78, color: index === 0 ? primary : '#fff' }}>{value ?? 0}</strong><span style={{ fontSize: 30 }}>{title}</span></div>)}
    </div>
    <div style={{ display: 'flex', marginTop: 36, fontSize: 35, color: '#cbd5e1' }}>{words.goals}: {run.goalsFor ?? 0}–{run.goalsAgainst ?? 0} · {run.formation}</div>
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: 75, padding: 38, border: `2px solid ${primary}66`, borderRadius: 32, background: '#0f1725' }}>
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 900, color: primary, marginBottom: 30 }}>{words.squad}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>{run.slots.filter(slot => slot.playerName).map((slot, index) => <div key={index} style={{ display: 'flex', width: '47%', justifyContent: 'space-between', fontSize: 24 }}><span>{slot.playerName}</span><strong>{slot.playerRating}</strong></div>)}</div>
    </div>
    <div style={{ display: 'flex', marginTop: 'auto', flexDirection: 'column', alignItems: 'center' }}><strong style={{ fontSize: 61, color: primary }}>@RPL30_bot</strong><span style={{ marginTop: 12, fontSize: 32 }}>30-0.рф · {words.play}</span></div>
  </div>, { width: 1080, height: 1920 });
}
