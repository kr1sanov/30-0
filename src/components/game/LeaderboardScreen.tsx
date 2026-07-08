'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// API response type (matches raw GameRun from Prisma)
// ---------------------------------------------------------------------------
interface LeaderboardRun {
  id: string;
  formation: string;
  difficulty: string;
  draftMode: string;
  ratingMode: string;
  completed: boolean;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  points: number | null;
  position: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  overallRating: number | null;
  managerName: string | null;
  teamName: string | null;
  userId: string | null;
  createdAt: string;
  slots: Array<{ playerSeasonId: string | null }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60) return 'только что';
    if (diffMin < 60) return `${diffMin} мин назад`;
    if (diffHour < 24) return `${diffHour} ч назад`;
    if (diffDay < 7) return `${diffDay} дн назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

const DIFFICULTY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]', label: 'Легко' },
  normal: { bg: 'bg-[#f97316]/15', text: 'text-[#f97316]', label: 'Нормально' },
  hard: { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]', label: 'Сложно' },
};

function getRankStyle(idx: number): { bg: string; border: string; glow: string } {
  if (idx === 0) return { bg: 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5', border: 'border-yellow-500/30', glow: 'shadow-[0_0_12px_rgba(234,179,8,0.15)]' };
  if (idx === 1) return { bg: 'bg-gradient-to-r from-gray-400/10 to-gray-400/5', border: 'border-gray-400/20', glow: 'shadow-[0_0_8px_rgba(156,163,175,0.1)]' };
  if (idx === 2) return { bg: 'bg-gradient-to-r from-amber-700/10 to-amber-700/5', border: 'border-amber-700/20', glow: 'shadow-[0_0_8px_rgba(180,83,9,0.1)]' };
  return { bg: 'bg-[#0d2d0d]', border: 'border-[#1a3a1a]', glow: '' };
}

function getRankEmoji(idx: number): string {
  if (idx === 0) return '🥇';
  if (idx === 1) return '🥈';
  if (idx === 2) return '🥉';
  return '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LeaderboardScreen() {
  const { setScreen, resetGame, goHome } = useGameStore();
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<LeaderboardRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();
        if (!cancelled) {
          setEntries(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Не удалось загрузить лидерборд');
          console.error('Failed to fetch leaderboard:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchLeaderboard();
    return () => { cancelled = true; };
  }, []);

  // Find the current user's best entry (highest points)
  const currentUserId = user && user.id !== 'guest' ? user.id : null;
  const userBestEntryId = currentUserId
    ? entries
        .filter((e) => e.userId === currentUserId)
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0]?.id ?? null
    : null;

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={goHome}
          className="shrink-0 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-[#e2e8f0] flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#fbbf24]" />
            Лидерборд
          </h2>
          <p className="text-xs text-[#94a3b8]">Топ-50 лучших результатов</p>
        </div>
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin mb-3" />
          <span className="text-sm text-[#94a3b8]">Загрузка...</span>
        </div>
      )}

      {/* ── Error state ── */}
      {error && !loading && (
        <Card className="bg-[#0d2d0d] border-[#1a3a1a]">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-3">😕</div>
            <div className="text-sm text-[#ef4444] mb-4">{error}</div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10"
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && entries.length === 0 && (
        <Card className="bg-[#0d2d0d] border-[#1a3a1a]">
          <CardContent className="p-10 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-lg font-bold text-[#e2e8f0] mb-2">Пока нет результатов</div>
            <div className="text-sm text-[#94a3b8] mb-6">
              Сыграйте первый сезон и попадите в таблицу лидеров!
            </div>
            <Button
              onClick={() => { resetGame(); setScreen('setup'); }}
              className="h-12 px-8 text-base font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20"
            >
              ⚽ Сыграть сезон
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Leaderboard list ── */}
      {!loading && !error && entries.length > 0 && (
        <div className="space-y-2 max-h-[calc(100dvh-180px)] overflow-y-auto pr-1 scrollbar-thin">
          {entries.map((entry, idx) => {
            const rankStyle = getRankStyle(idx);
            const rankEmoji = getRankEmoji(idx);
            const diff = DIFFICULTY_CONFIG[entry.difficulty] || DIFFICULTY_CONFIG.normal;
            const isUserEntry = entry.id === userBestEntryId;
            const wins = entry.wins ?? 0;
            const draws = entry.draws ?? 0;
            const losses = entry.losses ?? 0;
            const points = entry.points ?? 0;
            const goalsFor = entry.goalsFor ?? 0;
            const goalsAgainst = entry.goalsAgainst ?? 0;
            const position = entry.position ?? 16;
            const overallRating = entry.overallRating ?? 0;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.8), duration: 0.3 }}
              >
                <Card
                  className={`${rankStyle.bg} ${rankStyle.border} ${rankStyle.glow} transition-all hover:scale-[1.005] ${
                    isUserEntry ? 'ring-1 ring-[#22c55e]/40 shadow-[0_0_16px_rgba(34,197,94,0.15)]' : ''
                  }`}
                >
                  <CardContent className="p-3">
                    {/* Top row: Rank + Formation + Difficulty + Points */}
                    <div className="flex items-center gap-2.5">
                      {/* Rank badge */}
                      <div className="w-9 h-9 rounded-lg bg-[#0a1a0a]/50 flex items-center justify-center shrink-0">
                        {rankEmoji ? (
                          <span className="text-lg">{rankEmoji}</span>
                        ) : (
                          <span className="text-sm font-bold text-[#94a3b8]">{idx + 1}</span>
                        )}
                      </div>

                      {/* Middle info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Formation */}
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold px-1.5 py-0 h-5 border-[#3b82f6]/30 text-[#3b82f6] bg-[#3b82f6]/10"
                          >
                            {entry.formation}
                          </Badge>
                          {/* Difficulty */}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${diff.bg} ${diff.text}`}
                          >
                            {diff.label}
                          </span>
                          {/* User badge */}
                          {isUserEntry && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold px-1.5 py-0 h-5 border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/10"
                            >
                              Вы
                            </Badge>
                          )}
                        </div>
                        {/* W-D-L row */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] font-bold">
                            {wins}В
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f97316]/15 text-[#f97316] font-bold">
                            {draws}Н
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444] font-bold">
                            {losses}П
                          </span>
                          <span className="text-[9px] text-[#94a3b8]/50 ml-1">
                            ⚽ {goalsFor}-{goalsAgainst}
                          </span>
                        </div>
                      </div>

                      {/* Points & Position */}
                      <div className="text-right shrink-0">
                        <div className="text-xl font-black text-[#22c55e]">{points}</div>
                        <div className="text-[9px] text-[#94a3b8]">
                          {position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : ''} {position} место
                        </div>
                      </div>
                    </div>

                    {/* Bottom meta row */}
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        {overallRating > 0 && (
                          <span className="text-[9px] text-[#fbbf24] font-medium">
                            ★ {overallRating}
                          </span>
                        )}
                        {entry.teamName && (
                          <span className="text-[9px] text-[#94a3b8]/50 truncate max-w-[100px]">
                            {entry.teamName}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[#94a3b8]/40">
                        {getRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Play button ── */}
      {!loading && entries.length > 0 && (
        <Button
          onClick={() => { resetGame(); setScreen('setup'); }}
          className="w-full h-12 text-base font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20"
        >
          ⚽ Сыграть сезон
        </Button>
      )}
    </div>
  );
}
