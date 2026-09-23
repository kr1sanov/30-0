'use client';

import { useGameStore } from '@/store/gameStore';
import { getClubTheme } from '@/lib/clubThemes';

const BG = '#0A0A0A';
const CARD_BG = '#141414';
const GOLD = '#FFD700';

interface ResultShareCardProps {
  data: {
    points: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    position: number;
    formation?: string;
  };
  trophies?: Array<{ icon: string; name: string }>;
  teamName?: string | null;
  managerName?: string | null;
  mode?: 'classic' | 'single_club';
  clubName?: string | null;
  players?: Array<{ name: string; position: string; rating?: number }>;
}

function getPositionSuffix(pos: number): string {
  if (pos === 1) return 'е';
  if (pos >= 2 && pos <= 4) return 'е';
  return 'е';
}

export default function ResultShareCard({ data, trophies, teamName, managerName, mode = 'classic', clubName, players = [] }: ResultShareCardProps) {
  const { profileStats } = useGameStore();
  const theme = getClubTheme(mode === 'single_club' ? clubName ?? undefined : undefined);
  const posSuffix = getPositionSuffix(data.position);
  const isChampion = data.position === 1;
  const isTop4 = data.position <= 4;

  return (
    <div
      style={{
        width: 400,
        background: BG,
        padding: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1a1a 100%)', padding: '20px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: theme.onPrimary,
          }}>30</div>
          <div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>30-0 RPL</div>
            <div style={{ color: '#64748b', fontSize: 10, letterSpacing: 2 }}>РОССИЙСКАЯ ПРЕМЬЕР-ЛИГА</div>
          </div>
        </div>
      </div>

      {/* Result hero */}
      <div style={{
        background: isChampion
          ? `linear-gradient(180deg, ${GOLD}15 0%, ${BG} 100%)`
          : isTop4
            ? `linear-gradient(180deg, ${theme.primary}18 0%, ${BG} 100%)`
            : BG,
        padding: '12px 24px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: isChampion ? GOLD : isTop4 ? theme.primary : '#fff' }}>
          {data.points}
        </div>
        <div style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 600, marginTop: -4 }}>
          очков · {data.position}-{posSuffix} место
        </div>

        {/* W-D-L */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: theme.primary }}>{data.wins}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>побед</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{data.draws}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>ничьих</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{data.losses}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>поражений</div>
          </div>
        </div>

        {/* Goals */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 10 }}>
          <span style={{ color: '#9CA3AF', fontSize: 12 }}>Забито <b style={{ color: '#fff' }}>{data.goalsFor}</b></span>
          <span style={{ color: '#9CA3AF', fontSize: 12 }}>Пропущено <b style={{ color: '#fff' }}>{data.goalsAgainst}</b></span>
        </div>
      </div>

      <div style={{ padding: '0 24px 12px', color: '#9CA3AF', fontSize: 11, fontWeight: 700 }}>
        {mode === 'single_club' ? `МОЙ КЛУБ · ${clubName ?? 'КЛУБ'}` : 'ОБЫЧНЫЙ РЕЖИМ'}
      </div>

      {players.length > 0 && (
        <div style={{ padding: '10px 24px 14px', background: CARD_BG, borderTop: `2px solid ${theme.primary}55` }}>
          <div style={{ color: '#64748b', fontSize: 9, fontWeight: 800, letterSpacing: 1.4, marginBottom: 8 }}>СОСТАВ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
            {players.slice(0, 11).map((player, index) => (
              <div key={`${player.position}-${player.name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ color: theme.primary, fontSize: 9, fontWeight: 900, width: 24 }}>{player.position}</span>
                <span style={{ color: '#FFFFFF', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{player.name}</span>
                {player.rating ? <span style={{ color: '#9CA3AF', fontSize: 9, fontWeight: 800 }}>{player.rating}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trophies */}
      {trophies && trophies.length > 0 && (
        <div style={{ padding: '12px 24px', background: BG }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {trophies.map((t, i) => (
              <div key={i} style={{
                background: CARD_BG, borderRadius: 8, padding: '4px 10px',
                display: 'flex', alignItems: 'center', gap: 4,
                border: '1px solid #1f1f1f',
              }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info line */}
      <div style={{ padding: '8px 24px', display: 'flex', gap: 12 }}>
        {data.formation && (
          <span style={{ color: '#64748b', fontSize: 11 }}>📐 {data.formation}</span>
        )}
        {teamName && (
          <span style={{ color: '#64748b', fontSize: 11 }}>🏷️ {teamName}</span>
        )}
        {managerName && (
          <span style={{ color: '#64748b', fontSize: 11 }}>👔 {managerName}</span>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid #1f1f1f',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#4a5568', fontSize: 10 }}>Сезонов: {profileStats.totalSeasons} · Титулов: {profileStats.titles}</span>
        <span style={{ color: theme.primary, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>30-0.рф</span>
      </div>
    </div>
  );
}
