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
      {/* Share image banner */}
      <div style={{
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <img
          src="/share-image.png"
          alt="30-0 RPL"
          style={{
            width: '100%',
            display: 'block',
            objectFit: 'cover',
          }}
        />
        {/* Gradient overlay at bottom for text readability */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40%',
          background: `linear-gradient(to top, ${BG} 10%, transparent 100%)`,
        }} />
      </div>

      {/* Player stats overlay */}
      <div style={{
        marginTop: -40,
        position: 'relative',
        padding: '0 24px 16px',
      }}>
        {/* Player name & avatar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {user?.photoUrl ? (
            <img
              src={user.photoUrl}
              alt=""
              style={{
                width: 44, height: 44, borderRadius: '50%',
                border: `2px solid ${ACCENT}`,
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: CARD_BG, border: `2px solid ${ACCENT}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>⚽</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>
              {user?.displayName || 'Игрок'}
            </div>
            <div style={{ color: '#64748b', fontSize: 10 }}>
              {stats.totalSeasons} {stats.totalSeasons === 1 ? 'сезон' : stats.totalSeasons < 5 ? 'сезона' : 'сезонов'}
              {user?.username ? ` · @${user.username}` : ''}
            </div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: `linear-gradient(135deg, ${ACCENT} 0%, #00a878 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: '#000',
          }}>30</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '0 24px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>{stats.bestPoints}</div>
          <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>очков</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{winRate}%</div>
          <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>побед</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#2AABEE' }}>{stats.totalSeasons}</div>
          <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>сезонов</div>
        </div>
        <div style={{ background: CARD_BG, borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: GOLD }}>{stats.titles}</div>
          <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>титулов</div>
        </div>
      </div>

      {/* Trophies */}
      {earnedTrophies.length > 0 && (
        <div style={{ padding: '4px 24px 8px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {earnedTrophies.map((t, i) => (
              <div key={i} style={{
                background: CARD_BG, borderRadius: 6, padding: '2px 6px',
                display: 'flex', alignItems: 'center', gap: 2,
                border: '1px solid #1f1f1f',
              }}>
                <span style={{ fontSize: 10 }}>{t.icon}</span>
                <span style={{ color: '#fff', fontSize: 9, fontWeight: 600 }}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar with link */}
      <div style={{
        padding: '10px 24px',
        borderTop: '1px solid #1f1f1f',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#4a5568', fontSize: 9 }}>30-0 RPL · Драфт симулятор</span>
        <span style={{ color: '#2AABEE', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>t.me/RPL30_bot</span>
      </div>
    </div>
  );
}
