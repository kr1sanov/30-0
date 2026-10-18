import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { escapeHtml } from './campaignContent.ts';
import { challengeModeTitle } from './weeklyChallenges.ts';
import type { BotLanguage } from './botLanguage';
let logoPromise: Promise<Buffer> | undefined;
export async function seasonResultImage(run: { teamName: string | null; points: number | null; wins: number | null; draws: number | null; losses: number | null; position: number | null; gameMode?: string; challengeIssueId?: string | null; goalsFor?: number | null; goalsAgainst?: number | null; formation?: string; eraStartYear?: number; eraEndYear?: number; user: { username: string | null; displayName: string } }, language: BotLanguage) {
  const ru = language === 'ru';
  const title = escapeHtml((run.teamName || (run.user.username ? `@${run.user.username}` : run.user.displayName)).slice(0, 36));
  const challenge = run.gameMode?.startsWith('challenge');
  const accent = run.gameMode === 'multiplayer' ? '#a78bfa' : run.gameMode === 'single_club' ? '#60a5fa' : challenge ? '#fbbf24' : '#00c896';
  const mode = escapeHtml(challenge ? challengeModeTitle(run.challengeIssueId, language) : run.gameMode === 'multiplayer' ? (ru ? 'МУЛЬТИПЛЕЕР' : 'MULTIPLAYER') : run.gameMode === 'single_club' ? (ru ? 'ОДИН КЛУБ' : 'ONE CLUB') : (ru ? 'ОБЫЧНЫЙ ДРАФТ' : 'CLASSIC DRAFT'));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760"><defs><radialGradient id="bg" cx="90%" cy="0%" r="110%"><stop stop-color="${accent}" stop-opacity=".38"/><stop offset="1" stop-color="#090d14"/></radialGradient></defs><rect width="1200" height="760" fill="#090d14"/><rect width="1200" height="760" fill="url(#bg)"/><rect x="28" y="28" width="1144" height="704" rx="30" fill="none" stroke="${accent}" stroke-opacity=".45"/><path d="M850 300h300v390H850z M850 495h300 M1000 300v390" fill="none" stroke="${accent}" stroke-opacity=".10" stroke-width="2"/><circle cx="1000" cy="495" r="70" fill="none" stroke="${accent}" stroke-opacity=".10"/><g font-family="DejaVu Sans,sans-serif" fill="white"><text x="176" y="100" font-size="32" font-weight="bold">30-0 · ${ru ? 'ДРАФТ РПЛ' : 'RPL DRAFT'}</text><text x="176" y="138" font-size="19" fill="${accent}">${mode}</text><text x="64" y="224" font-size="34" font-weight="bold">${title}</text><text x="64" y="280" font-size="20" fill="#b5c0d1">${ru ? 'СЕЗОН ЗАВЕРШЁН · 30 МАТЧЕЙ' : 'SEASON COMPLETE · 30 MATCHES'}</text><text x="58" y="422" font-size="128" font-weight="bold" fill="${accent}">${run.points || 0}</text><text x="64" y="466" font-size="23">${ru ? 'ОЧКОВ' : 'POINTS'}</text><text x="890" y="410" font-size="100" font-weight="bold">${run.position || '—'}</text><text x="880" y="456" font-size="22" fill="#b5c0d1">${ru ? 'МЕСТО / 16' : 'PLACE / 16'}</text><path d="M64 505h1072" stroke="white" stroke-opacity=".15"/>${[
    [String(run.wins || 0), ru ? 'ПОБЕДЫ' : 'WINS'], [String(run.draws || 0), ru ? 'НИЧЬИ' : 'DRAWS'], [String(run.losses || 0), ru ? 'ПОРАЖЕНИЯ' : 'LOSSES'], [`${run.goalsFor || 0}:${run.goalsAgainst || 0}`, ru ? 'ГОЛЫ' : 'GOALS']
  ].map(([value,label], index) => `<text x="${64+index*274}" y="576" font-size="38" font-weight="bold">${value}</text><text x="${64+index*274}" y="610" font-size="17" fill="#b5c0d1">${label}</text>`).join('')}<text x="64" y="686" font-size="19" fill="#b5c0d1">${escapeHtml(run.formation || '4-3-3')} · ${run.eraStartYear || 2006}–${run.eraEndYear || 2026}</text><text x="1136" y="686" text-anchor="end" font-size="19" fill="${accent}">t.me/RPL30_bot?startapp</text></g></svg>`;
  logoPromise ??= readFile(join(process.cwd(), 'public/brand-30-0.png')).catch(error => { logoPromise = undefined; throw error; });
  const logo = await sharp(await logoPromise).resize(88, 88).png().toBuffer();
  return sharp(Buffer.from(svg)).composite([{ input: logo, left: 64, top: 64 }]).png().toBuffer();
}
