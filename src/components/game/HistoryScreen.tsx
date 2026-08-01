'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  Trophy,
  Calendar,
  Filter,
  ArrowUpDown,
  Frown,
  Shield,
  Swords,
  Target,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GameSlotData {
  id: string;
  slotPosition: string;
  playerName: string | null;
  playerLastName: string | null;
  playerRating: number | null;
  playerPosition: string | null;
  playerNationality: string | null;
}

interface GameRunData {
  id: string;
  formation: string;
  difficulty: string;
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
  createdAt: string;
  slots: GameSlotData[];
}

type DifficultyFilter = 'all' | 'easy' | 'normal' | 'hard';
type SortMode = 'date' | 'points' | 'position';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIFFICULTY_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: 'bg-[#00C896]/15', text: 'text-[#00C896]' },
  normal: { bg: 'bg-[#f97316]/15', text: 'text-[#f97316]' },
  hard: { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]' },
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Легко',
  normal: 'Нормально',
  hard: 'Сложно',
};

const DIFFICULTY_ICONS: Record<string, React.ReactNode> = {
  easy: <Shield className="w-3 h-3" />,
  normal: <Swords className="w-3 h-3" />,
  hard: <Target className="w-3 h-3" />,
};

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

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getPositionLabel(pos: string | null): string {
  if (!pos) return '';
  const map: Record<string, string> = {
    GK: 'ВР',
    CB: 'ЦЗ',
    LB: 'ЛЗ',
    RB: 'ПЗ',
    LWB: 'ЛФЗ',
    RWB: 'ПФЗ',
    CDM: 'ОПЗ',
    CM: 'ЦП',
    CAM: 'АП',
    LM: 'ЛП',
    RM: 'ПП',
    LW: 'ЛВ',
    RW: 'ПВ',
    CF: 'ЦН',
    ST: 'НАП',
  };
  return map[pos] || pos;
}

function getPositionColor(pos: string | null): string {
  if (!pos) return 'bg-[#9CA3AF]/20 text-[#9CA3AF]';
  const gk = ['GK'];
  const def = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
  const mid = ['CDM', 'CM', 'CAM', 'LM', 'RM'];
  const att = ['LW', 'RW', 'CF', 'ST'];
  if (gk.includes(pos)) return 'bg-yellow-500/15 text-yellow-400';
  if (def.includes(pos)) return 'bg-[#00C896]/15 text-[#00C896]';
  if (mid.includes(pos)) return 'bg-[#3b82f6]/15 text-[#3b82f6]';
  if (att.includes(pos)) return 'bg-[#ef4444]/15 text-[#ef4444]';
  return 'bg-[#9CA3AF]/20 text-[#9CA3AF]';
}

function getPositionBorderColor(pos: string | null): string {
  if (!pos) return 'border-[#9CA3AF]/30';
  const gk = ['GK'];
  const def = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
  const mid = ['CDM', 'CM', 'CAM', 'LM', 'RM'];
  const att = ['LW', 'RW', 'CF', 'ST'];
  if (gk.includes(pos)) return 'border-yellow-500/30';
  if (def.includes(pos)) return 'border-[#00C896]/30';
  if (mid.includes(pos)) return 'border-[#3b82f6]/30';
  if (att.includes(pos)) return 'border-[#ef4444]/30';
  return 'border-[#9CA3AF]/30';
}

function getSeasonResultDescription(run: GameRunData): string {
  if (!run.position) return '';
  if (run.wins === 30 && run.draws === 0 && run.losses === 0) {
    return 'Идеальный сезон! 30 побед из 30!';
  }
  if (run.position === 1) {
    return 'Чемпион! Золотые медали!';
  }
  if (run.position <= 4) {
    return 'Зона Лиги Чемпионов!';
  }
  if (run.position <= 6) {
    return 'Зона еврокубков';
  }
  if (run.position >= 14) {
    return 'Зона вылета...';
  }
  return 'Середина таблицы';
}

function getAvgRating(slots: GameSlotData[]): number {
  const rated = slots.filter((s) => s.playerRating != null);
  if (rated.length === 0) return 0;
  return Math.round(rated.reduce((sum, s) => sum + (s.playerRating ?? 0), 0) / rated.length);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const { resetGame, setScreen } = useGameStore();
  const [runs, setRuns] = useState<GameRunData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        completed: 'true',
        sort: sortMode,
        limit: '50',
      });
      if (difficultyFilter !== 'all') {
        params.set('difficulty', difficultyFilter);
      }
      const res = await fetch(`/api/runs?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setRuns(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  }, [difficultyFilter, sortMode]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ---------------------------------------------------------------------------
  // Render: Loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#FFFFFF]">📜 История</h2>
          <p className="text-sm text-[#9CA3AF] mt-1">Прошедшие сезоны</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#141414] border border-[#1E1E1E] p-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E1E1E]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-[#1E1E1E]" />
                  <div className="h-2 w-40 rounded bg-[#1E1E1E]" />
                </div>
                <div className="h-8 w-12 rounded bg-[#1E1E1E]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#FFFFFF]">📜 История</h2>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#141414] p-10 text-center border border-[#1E1E1E]"
        >
          <div className="text-6xl mb-4">😔</div>
          <div className="text-lg font-bold text-[#FFFFFF] mb-2">Ошибка загрузки</div>
          <div className="text-sm text-[#9CA3AF] mb-6">{error}</div>
          <Button
            onClick={fetchRuns}
            className="h-12 px-8 text-base font-bold bg-[#00C896] hover:bg-[#00A67A] text-white rounded-xl shadow-lg shadow-[#00C896]/20"
          >
            Попробовать снова
          </Button>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Main
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#FFFFFF]">📜 История</h2>
        <p className="text-sm text-[#9CA3AF] mt-1">
          {runs.length > 0 ? `${runs.length} ${runs.length === 1 ? 'сезон' : runs.length < 5 ? 'сезона' : 'сезонов'}` : 'Прошедшие сезоны'}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Difficulty tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
          {([
            { key: 'all', label: 'Все' },
            { key: 'easy', label: 'Легко' },
            { key: 'normal', label: 'Нормально' },
            { key: 'hard', label: 'Сложно' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDifficultyFilter(tab.key)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                ${difficultyFilter === tab.key
                  ? 'bg-[#00C896] text-white shadow-md shadow-[#00C896]/20'
                  : 'bg-[#1E1E1E] text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-white'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
          {([
            { key: 'date' as const, label: 'По дате' },
            { key: 'points' as const, label: 'По очкам' },
            { key: 'position' as const, label: 'По позиции' },
          ]).map((s) => (
            <button
              key={s.key}
              onClick={() => setSortMode(s.key)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                ${sortMode === s.key
                  ? 'bg-[#00C896] text-white shadow-md shadow-[#00C896]/20'
                  : 'bg-[#1E1E1E] text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-white'
                }
              `}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {runs.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#141414] p-10 text-center border border-[#1E1E1E]"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-6xl mb-4"
          >
            📋
          </motion.div>
          <div className="text-lg font-bold text-[#FFFFFF] mb-2">Пока нет сезонов</div>
          <div className="text-sm text-[#9CA3AF] mb-6">
            Сыграйте первый сезон, и он появится здесь!
          </div>
          <Button
            onClick={() => {
              resetGame();
              setScreen('setup');
            }}
            className="h-12 px-8 text-base font-bold bg-[#00C896] hover:bg-[#00A67A] text-white rounded-xl shadow-lg shadow-[#00C896]/20"
          >
            ⚽ Сыграть сезон
          </Button>
        </motion.div>
      )}

      {/* Runs list */}
      {runs.length > 0 && (
        <div className="space-y-3">
          {runs.map((run, idx) => {
            const isExpanded = expandedId === run.id;
            const diffBadge = DIFFICULTY_BADGE_COLORS[run.difficulty] || DIFFICULTY_BADGE_COLORS.normal;
            const diffLabel = DIFFICULTY_LABELS[run.difficulty] || run.difficulty;
            const diffIcon = DIFFICULTY_ICONS[run.difficulty] || <Swords className="w-3 h-3" />;
            const avgRating = getAvgRating(run.slots);
            const posEmoji =
              run.position === 1 ? '🥇' :
              run.position === 2 ? '🥈' :
              run.position === 3 ? '🥉' :
              run.position != null && run.position <= 4 ? '🏟️' : '';
            const resultDesc = getSeasonResultDescription(run);

            return (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.35 }}
                className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isExpanded
                    ? 'bg-[#141414] border-[#00C896]/30 shadow-lg shadow-[#00C896]/5'
                    : 'bg-[#141414] border-[#1E1E1E] hover:border-[#2A2A2A]'
                }`}
              >
                {/* Card header — always visible */}
                <button
                  onClick={() => toggleExpand(run.id)}
                  className="w-full text-left p-4 focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Formation badge */}
                    <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#3b82f6] leading-tight text-center">
                        {run.formation}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Formation */}
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#3b82f6]/15 text-[#3b82f6]">
                          {run.formation}
                        </span>
                        {/* Difficulty */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${diffBadge.bg} ${diffBadge.text}`}>
                          {diffIcon}
                          {diffLabel}
                        </span>
                        {/* Manager */}
                        {run.managerName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 truncate max-w-[120px]">
                            🧑‍💼 {run.managerName}
                          </span>
                        )}
                      </div>
                      {/* W/D/L */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#00C896]/15 text-[#00C896]">
                          В{run.wins ?? 0}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#f97316]/15 text-[#f97316]">
                          Н{run.draws ?? 0}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#ef4444]/15 text-[#ef4444]">
                          П{run.losses ?? 0}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]/60">
                          {run.goalsFor ?? 0}:{run.goalsAgainst ?? 0}
                        </span>
                      </div>
                      {/* Date */}
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="w-2.5 h-2.5 text-[#9CA3AF]/40" />
                        <span className="text-[10px] text-[#9CA3AF]/60">
                          {getRelativeTime(run.createdAt)}
                        </span>
                        {avgRating > 0 && (
                          <span className="text-[10px] text-[#9CA3AF]/60 ml-1">
                            · Рейтинг: {avgRating}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Points & Position */}
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-[#00C896]">
                        {run.points ?? 0}
                      </div>
                      <div className="text-xs text-[#9CA3AF]">
                        {posEmoji} {run.position ?? '—'} место
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <div className="shrink-0 ml-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4">
                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[#00C896]/20 to-transparent" />

                        {/* Season result description */}
                        {resultDesc && (
                          <div className="text-center py-2">
                            <span className="text-sm font-semibold text-[#00C896]">
                              {resultDesc}
                            </span>
                          </div>
                        )}

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-[#0A0A0A]/50 p-3 text-center">
                            <div className="text-lg font-bold text-[#00C896]">{run.goalsFor ?? 0}</div>
                            <div className="text-[10px] text-[#9CA3AF]">Забито</div>
                          </div>
                          <div className="rounded-xl bg-[#0A0A0A]/50 p-3 text-center">
                            <div className="text-lg font-bold text-[#ef4444]">{run.goalsAgainst ?? 0}</div>
                            <div className="text-[10px] text-[#9CA3AF]">Пропущено</div>
                          </div>
                          <div className="rounded-xl bg-[#0A0A0A]/50 p-3 text-center">
                            <div className="text-lg font-bold text-[#f97316]">
                              {(() => {
                                const diff = (run.goalsFor ?? 0) - (run.goalsAgainst ?? 0);
                                return diff > 0 ? `+${diff}` : diff;
                              })()}
                            </div>
                            <div className="text-[10px] text-[#9CA3AF]">Разница</div>
                          </div>
                        </div>

                        {/* Full date */}
                        <div className="text-center text-[10px] text-[#9CA3AF]/50">
                          {formatDate(run.createdAt)}
                          {run.teamName && <span> · {run.teamName}</span>}
                        </div>

                        {/* Squad */}
                        <div>
                          <div className="text-xs font-bold text-[#9CA3AF] mb-2 uppercase tracking-wider">
                            Состав
                          </div>
                          <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                            {run.slots
                              .filter((s) => s.playerName)
                              .map((slot) => (
                                <motion.div
                                  key={slot.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className={`flex items-center gap-2 rounded-lg bg-[#0A0A0A]/50 border-l-2 ${getPositionBorderColor(slot.playerPosition)} px-3 py-2`}
                                >
                                  {/* Position badge */}
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getPositionColor(slot.playerPosition)}`}>
                                    {getPositionLabel(slot.playerPosition)}
                                  </span>
                                  {/* Name */}
                                  <span className="text-xs text-[#E5E5E5] flex-1 truncate">
                                    {slot.playerName}
                                  </span>
                                  {/* Rating */}
                                  {slot.playerRating != null && (
                                    <span className={`text-xs font-bold ${
                                      slot.playerRating >= 80
                                        ? 'text-[#00C896]'
                                        : slot.playerRating >= 70
                                          ? 'text-[#f97316]'
                                          : 'text-[#9CA3AF]'
                                    }`}>
                                      {slot.playerRating}
                                    </span>
                                  )}
                                </motion.div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Play button */}
      <Button
        onClick={() => {
          resetGame();
          setScreen('setup');
        }}
        className="w-full h-14 text-lg font-bold bg-[#00C896] hover:bg-[#00A67A] text-white rounded-xl shadow-lg shadow-[#00C896]/20"
      >
        ⚽ Сыграть сезон
      </Button>
    </div>
  );
}
