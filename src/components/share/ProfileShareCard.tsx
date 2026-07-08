'use client';

import { useAuthStore } from '@/store/authStore';

const BG = '#0A0A0A';
const CARD_BG = '#141414';
const ACCENT = '#00C896';
const GOLD = '#FFD700';

interface ProfileShareCardProps {
  stats: {
    totalSeasons: number;
    bestPoints: number;
    titles: number;
    perfect: number;
    totalWins: number;
    totalGoals: number;
    favoriteFormation: string;
    achievements: string[];
  };
}

const TROPHY_MAP: Record<string, { icon: string; name: string }> = {
  perfect_30_0: { icon: '🏆', name: '30-0' },
  invincible: { icon: '🛡️', name: 'Непобедимый' },
  champion: { icon: '🥇', name: 'Чемпион' },
  top4: { icon: '⭐', name: 'Топ-4' },
  goal_machine: { icon: '⚽', name: 'Голевая' },
  iron_defense: { icon: '🧱', name: 'Оборона' },
  iron_curtain: { icon: '🥅', name: 'Занавес' },
  personal_best: { icon: '📈', name: 'Взлёт' },
  win_streak: { icon: '🔥', name: 'Серия' },
};

export default function ProfileShareCard({ stats }: ProfileShareCardProps) {
  const { user } = useAuthStore();
  const winRate = stats.totalSeasons > 0
    ? Math.round((stats.totalWins / (stats.totalSeasons * 30)) * 100)
    : 0;
  const earnedTrophies = stats.achievements
    .map(id => TROPHY_MAP[id])
    .filter(Boolean);

  return (
    <div
      style={{
        width: 400,
        background: BG,
        padding: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header with avatar */}
      <div style={{
        background: `linear-gradient(135deg, ${ACCENT}15 0%, ${BG} 50%)`,
        padding: '20px 24px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {user?.photoUrl ? (
          <img
            src={user.photoUrl}
            alt=""
            style={{
              width: 48, height: 48, borderRadius: '50%',
              border: `2px solid ${ACCENT}`,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: CARD_BG, border: `2px solid ${ACCENT}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>⚽</div>
        )}
        <div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>
            {user?.displayName || 'Игрок'}
          </div>
          <div style={{ color: '#64748b', fontSize: 11 }}>
            {stats.totalSeasons} {stats.totalSeasons === 1 ? 'сезон' : stats.totalSeasons < 5 ? 'сезона' : 'сезонов'}
            {user?.username ? ` · @${user.username}` : ''}
          </div>
        </div>
        {/* Logo */}
        <div style={{ marginLeft: 'auto' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `linear-gradient(135deg, ${ACCENT} 0%, #00a878 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 900, color: '#000',
          }}>30</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '16px 24px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: GOLD }}>{stats.titles}</div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>титулов</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: ACCENT }}>{stats.perfect}</div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>30-0</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{winRate}%</div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>побед</div>
        </div>
      </div>

      {/* Secondary stats */}
      <div style={{ padding: '4px 24px 12px', display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{stats.bestPoints}</div>
          <div style={{ color: '#64748b', fontSize: 9 }}>макс. очков</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{stats.totalGoals}</div>
          <div style={{ color: '#64748b', fontSize: 9 }}>голов</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{stats.totalWins}</div>
          <div style={{ color: '#64748b', fontSize: 9 }}>побед</div>
        </div>
      </div>

      {/* Trophies */}
      {earnedTrophies.length > 0 && (
        <div style={{ padding: '4px 24px 12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {earnedTrophies.map((t, i) => (
              <div key={i} style={{
                background: CARD_BG, borderRadius: 6, padding: '3px 8px',
                display: 'flex', alignItems: 'center', gap: 3,
                border: '1px solid #1f1f1f',
              }}>
                <span style={{ fontSize: 12 }}>{t.icon}</span>
                <span style={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formation */}
      {stats.favoriteFormation && (
        <div style={{ padding: '0 24px 8px' }}>
          <span style={{ color: '#64748b', fontSize: 11 }}>📐 Любимая формация: <b style={{ color: '#fff' }}>{stats.favoriteFormation}</b></span>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid #1f1f1f',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#4a5568', fontSize: 10 }}>30-0 RPL · Драфт симулятор</span>
        <span style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>t.me/RPL30_bot</span>
      </div>
    </div>
  );
}
