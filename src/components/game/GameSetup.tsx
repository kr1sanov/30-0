'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { FORMATIONS, POSITION_CATEGORY } from '@/lib/positions';
import {
  DIFFICULTY_CONFIG,
  ERA_CONFIG,
  DRAFT_MODE_CONFIG,
  RATING_MODE_CONFIG,
  ERA_MIN_YEAR,
  ERA_MAX_YEAR,
} from '@/lib/types';
import type { Difficulty, EraFilter, GameModeType } from '@/lib/types';
import type { Position, PositionCategory } from '@/lib/positions';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/use-telegram';
import { Metrics } from '@/lib/metrics';
import { useAuthStore } from '@/store/authStore';

/* ─── Colors ─── */
const ACCENT = '#00C896';
const BG_PAGE = '#0A0A0A';
const BG_CARD = '#141414';

/* ─── Club type for fetching ─── */
interface ClubData {
  id: string;
  nameRu: string;
  nameEn?: string;
  city?: string;
  logoUrl?: string;
}

/* ─── Game Mode Config ─── */
const GAME_MODE_CONFIG: Record<
  GameModeType,
  { label: string; description: string; icon: string }
> = {
  classic: {
    label: 'Классика',
    description: 'Крутите колесо — случайный клуб и сезон РПЛ',
    icon: '⚔️',
  },
  single_club: {
    label: 'Один клуб',
    description: 'Выберите клуб — все спины только его сезоны',
    icon: '🏟️',
  },
  daily: {
    label: 'Челлендж',
    description: 'Ежедневный челлендж с ограничениями',
    icon: '⚽',
  },
  nations_cup: {
    label: 'Кубок наций',
    description: 'Выберите нацию — все спины только с игроками этой нации',
    icon: '🏆',
  },
};

/* ─── Pitch dot layout for formation preview ─── */
const PITCH_LAYOUTS: Record<string, { row: number; col: number }[]> = {
  '4-3-3': [
    { row: 85, col: 50 }, { row: 65, col: 18 }, { row: 65, col: 38 }, { row: 65, col: 62 }, { row: 65, col: 82 },
    { row: 42, col: 25 }, { row: 42, col: 50 }, { row: 42, col: 75 },
    { row: 18, col: 18 }, { row: 18, col: 50 }, { row: 18, col: 82 },
  ],
  '4-4-2': [
    { row: 85, col: 50 }, { row: 65, col: 18 }, { row: 65, col: 38 }, { row: 65, col: 62 }, { row: 65, col: 82 },
    { row: 38, col: 18 }, { row: 38, col: 38 }, { row: 38, col: 62 }, { row: 38, col: 82 },
    { row: 16, col: 35 }, { row: 16, col: 65 },
  ],
  '4-2-3-1': [
    { row: 85, col: 50 }, { row: 65, col: 18 }, { row: 65, col: 38 }, { row: 65, col: 62 }, { row: 65, col: 82 },
    { row: 48, col: 35 }, { row: 48, col: 65 },
    { row: 30, col: 18 }, { row: 30, col: 50 }, { row: 30, col: 82 },
    { row: 14, col: 50 },
  ],
  '3-5-2': [
    { row: 85, col: 50 }, { row: 65, col: 25 }, { row: 65, col: 50 }, { row: 65, col: 75 },
    { row: 42, col: 10 }, { row: 42, col: 30 }, { row: 42, col: 50 }, { row: 42, col: 70 }, { row: 42, col: 90 },
    { row: 18, col: 35 }, { row: 18, col: 65 },
  ],
  '3-4-3': [
    { row: 85, col: 50 }, { row: 65, col: 25 }, { row: 65, col: 50 }, { row: 65, col: 75 },
    { row: 38, col: 18 }, { row: 38, col: 38 }, { row: 38, col: 62 }, { row: 38, col: 82 },
    { row: 16, col: 18 }, { row: 16, col: 50 }, { row: 16, col: 82 },
  ],
  '5-3-2': [
    { row: 85, col: 50 }, { row: 65, col: 10 }, { row: 65, col: 30 }, { row: 65, col: 50 }, { row: 65, col: 70 }, { row: 65, col: 90 },
    { row: 38, col: 25 }, { row: 38, col: 50 }, { row: 38, col: 75 },
    { row: 16, col: 35 }, { row: 16, col: 65 },
  ],
  '5-4-1': [
    { row: 85, col: 50 }, { row: 65, col: 10 }, { row: 65, col: 30 }, { row: 65, col: 50 }, { row: 65, col: 70 }, { row: 65, col: 90 },
    { row: 38, col: 15 }, { row: 38, col: 38 }, { row: 38, col: 62 }, { row: 38, col: 85 },
    { row: 14, col: 50 },
  ],
  '4-1-4-1': [
    { row: 85, col: 50 }, { row: 65, col: 18 }, { row: 65, col: 38 }, { row: 65, col: 62 }, { row: 65, col: 82 },
    { row: 48, col: 50 },
    { row: 30, col: 15 }, { row: 30, col: 38 }, { row: 30, col: 62 }, { row: 30, col: 85 },
    { row: 14, col: 50 },
  ],
  '4-5-1': [
    { row: 85, col: 50 }, { row: 65, col: 18 }, { row: 65, col: 38 }, { row: 65, col: 62 }, { row: 65, col: 82 },
    { row: 38, col: 10 }, { row: 38, col: 30 }, { row: 38, col: 50 }, { row: 38, col: 70 }, { row: 38, col: 90 },
    { row: 14, col: 50 },
  ],
  '4-4-1-1': [
    { row: 85, col: 50 }, { row: 65, col: 18 }, { row: 65, col: 38 }, { row: 65, col: 62 }, { row: 65, col: 82 },
    { row: 42, col: 18 }, { row: 42, col: 38 }, { row: 42, col: 62 }, { row: 42, col: 82 },
    { row: 24, col: 50 }, { row: 10, col: 50 },
  ],
  '3-4-1-2': [
    { row: 85, col: 50 }, { row: 65, col: 25 }, { row: 65, col: 50 }, { row: 65, col: 75 },
    { row: 42, col: 15 }, { row: 42, col: 38 }, { row: 42, col: 62 }, { row: 42, col: 85 },
    { row: 24, col: 50 }, { row: 10, col: 35 }, { row: 10, col: 65 },
  ],
  '4-2-2-2': [
    { row: 85, col: 50 }, { row: 65, col: 18 }, { row: 65, col: 38 }, { row: 65, col: 62 }, { row: 65, col: 82 },
    { row: 45, col: 30 }, { row: 45, col: 70 },
    { row: 28, col: 30 }, { row: 28, col: 70 },
    { row: 12, col: 35 }, { row: 12, col: 65 },
  ],
};

function getCategoryColor(pos: string): string {
  const cat = POSITION_CATEGORY[pos as Position] ?? ('mid' as PositionCategory);
  switch (cat) {
    case 'gk': return '#f97316';
    case 'def': return '#3b82f6';
    case 'mid': return '#00C896';
    case 'att': return '#ef4444';
  }
}

/* ─── Difficulty metadata ─── */
const DIFFICULTY_META: Record<
  Difficulty,
  { icon: string; description: string; color: string }
> = {
  easy: {
    icon: '🌱',
    description: '3 переброса, рейтинги видны',
    color: '#00C896',
  },
  normal: {
    icon: '⚖️',
    description: '1 переброс, рейтинги видны',
    color: '#f59e0b',
  },
  hard: {
    icon: '🔥',
    description: '0 перебросов, рейтинги скрыты',
    color: '#ef4444',
  },
};

/* ─── Formation Preview Pitch with position labels ─── */
function FormationPitch({ formationId }: { formationId: string }) {
  const layout = PITCH_LAYOUTS[formationId] ?? PITCH_LAYOUTS['4-3-3'];
  const formation = FORMATIONS.find((f) => f.id === formationId);

  return (
    <motion.div
      key={formationId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="relative w-full rounded-xl overflow-hidden"
      style={{ paddingBottom: '65%' }}
    >
      {/* Field gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #1f6e3a 0%, #1a5c30 50%, #175228 100%)',
        }}
      />
      {/* Pitch stripes */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 7px, rgba(0,0,0,0.12) 7px, rgba(0,0,0,0.12) 14px)',
        }}
      />
      {/* Center line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
      {/* Center circle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/25" />

      {/* Player dots with position labels */}
      {layout.map((pos, i) => {
        const slotPosition = formation?.slots[i]?.position;
        const slotLabel = formation?.slots[i]?.label;
        const color = slotPosition ? getCategoryColor(slotPosition) : '#9CA3AF';
        return (
          <div
            key={i}
            className="absolute flex flex-col items-center"
            style={{
              top: `${pos.row}%`,
              left: `${pos.col}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}, 0 0 2px rgba(0,0,0,0.4)`,
                border: '1.5px solid rgba(255,255,255,0.6)',
              }}
            />
            <span
              className="text-[8px] font-bold text-white mt-0.5 drop-shadow-md"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
              {slotLabel || ''}
            </span>
          </div>
        );
      })}
    </motion.div>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#9CA3AF] mb-3"
    >
      {children}
    </h3>
  );
}

/* ─── Pill Button ─── */
function PillButton({
  label,
  isSelected,
  onClick,
  color = ACCENT,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap"
      style={{
        backgroundColor: isSelected ? `${color}20` : 'transparent',
        color: isSelected ? color : '#9CA3AF',
        border: isSelected ? `1.5px solid ${color}` : '1.5px solid #2a2a2a',
        boxShadow: isSelected ? `0 0 12px ${color}30` : 'none',
      }}
    >
      {label}
    </motion.button>
  );
}

/* ─── Club Card ─── */
function ClubCard({
  club,
  isSelected,
  onClick,
}: {
  club: ClubData;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      className="relative rounded-xl p-3 text-center transition-all duration-200 border-2 overflow-hidden"
      style={{
        backgroundColor: isSelected ? `${ACCENT}15` : BG_CARD,
        borderColor: isSelected ? ACCENT : '#2a2a2a',
        boxShadow: isSelected ? `0 0 16px ${ACCENT}30` : 'none',
      }}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: ACCENT }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
      {/* Club icon */}
      <div
        className="w-10 h-10 rounded-lg mx-auto mb-1.5 flex items-center justify-center text-lg"
        style={{
          backgroundColor: isSelected ? `${ACCENT}20` : '#1f1f1f',
        }}
      >
        ⚽
      </div>
      {/* Club name */}
      <div
        className="text-xs font-bold leading-tight"
        style={{ color: isSelected ? ACCENT : '#FFFFFF' }}
      >
        {club.nameRu}
      </div>
      {club.city && (
        <div className="text-[9px] text-[#64748b] mt-0.5 leading-tight">
          {club.city}
        </div>
      )}
    </motion.button>
  );
}

export default function GameSetup() {
  const { config, setConfig, startRun, dailyChallenge, lastDraftError } = useGameStore();
  const { haptic, selectionChanged } = useTelegram();
  const { user } = useAuthStore();

  // Club list for single_club mode
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [clubSearch, setClubSearch] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Current game mode
  const currentGameMode: GameModeType = config.gameMode ?? 'classic';

  // Fetch clubs when single_club mode is selected
  useEffect(() => {
    if (currentGameMode === 'single_club' && clubs.length === 0) {
      setClubsLoading(true);
      fetch('/api/clubs')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setClubs(data);
          }
        })
        .catch(console.error)
        .finally(() => setClubsLoading(false));
    }
  }, [currentGameMode, clubs.length]);

  // Filter clubs by search
  const filteredClubs = clubs.filter((c) =>
    c.nameRu.toLowerCase().includes(clubSearch.toLowerCase()) ||
    (c.city && c.city.toLowerCase().includes(clubSearch.toLowerCase()))
  );

  // Selected club name
  const selectedClub = clubs.find((c) => c.id === config.clubFilter);

  // Local profile — always available

  const handleStart = async () => {
    // In single_club mode, require a club selection
    if (currentGameMode === 'single_club' && !config.clubFilter) {
      setStartError('Выберите клуб для режима "Один клуб".');
      return;
    }
    // In nations_cup mode, require a nationality selection
    if (currentGameMode === 'nations_cup' && !config.nationalityFilter) {
      setStartError('Выберите национальность для режима "Кубок наций".');
      return;
    }

    haptic('medium');
    setStartError(null);
    setIsStarting(true);
    Metrics.gameStart({
      formation: config.formation,
      difficulty: config.difficulty,
      draftMode: config.draftMode,
      ratingMode: config.ratingMode,
      eraFilter: config.eraFilter,
    });
    try {
      console.log('[handleStart] Starting run with config:', { formation: config.formation, difficulty: config.difficulty, userId: user?.id });
      await startRun();
      // If we're still on setup after startRun, it means it failed
      const currentState = useGameStore.getState();
      if (currentState.screen === 'setup') {
        const error = currentState.lastDraftError || 'Не удалось начать игру. Попробуйте ещё раз.';
        console.error('[handleStart] Run failed, still on setup screen:', error);
        setStartError(error);
      } else {
        console.log('[handleStart] Run started successfully, screen:', currentState.screen);
      }
    } catch (err) {
      console.error('[handleStart] Exception during startRun:', err);
      setStartError(err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleFormationSelect = (formationId: string) => {
    selectionChanged();
    setConfig({ formation: formationId });
  };

  const handleGameModeSelect = (mode: GameModeType) => {
    selectionChanged();
    if (mode === 'classic') {
      setConfig({ gameMode: 'classic', clubFilter: undefined, nationalityFilter: undefined });
    } else if (mode === 'single_club') {
      setConfig({ gameMode: 'single_club', nationalityFilter: undefined });
    } else if (mode === 'nations_cup') {
      setConfig({ gameMode: 'nations_cup', clubFilter: undefined });
    } else {
      setConfig({ gameMode: mode });
    }
  };

  const selectedFormation = FORMATIONS.find((f) => f.id === config.formation);

  // Derive effective showRatings: if explicitly set use that, otherwise follow difficulty
  const effectiveShowRatings =
    config.showRatings !== undefined
      ? config.showRatings
      : DIFFICULTY_CONFIG[config.difficulty].showRatings;

  // Can start? In single_club mode, need a club selected. In nations_cup mode, need a nationality selected.
  const canStart = currentGameMode === 'single_club' ? !!config.clubFilter : currentGameMode === 'nations_cup' ? !!config.nationalityFilter : true;

  return (
    <div className="space-y-6 animate-fade-in-up" style={{ background: BG_PAGE }}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-white inline-block">
          {dailyChallenge ? 'Ежедневный челлендж' : 'Настройка игры'}
        </h2>
        <p className="text-sm text-[#9CA3AF] mt-1">
          {dailyChallenge ? dailyChallenge.title : 'Выберите параметры драфта'}
        </p>
      </div>

      {/* ─── Daily Challenge Banner ── */}
      {dailyChallenge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 border border-[#00C896]/30 bg-[#00C896]/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">⚽</span>
            <span className="text-sm font-bold text-[#00C896]">{dailyChallenge.title}</span>
          </div>
          <p className="text-xs text-[#9CA3AF] mb-3">{dailyChallenge.description}</p>

          {/* Constraints summary */}
          <div className="flex flex-wrap gap-1.5">
            {dailyChallenge.formationLock && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3b82f6]/15 text-[#3b82f6]">
                📐 {dailyChallenge.formationLock}
              </span>
            )}
            {dailyChallenge.eraRestriction && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f97316]/15 text-[#f97316]">
                📅 {dailyChallenge.eraRestriction.start}-{dailyChallenge.eraRestriction.end}
              </span>
            )}
            {dailyChallenge.rerollsAllowed === 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444]">
                🚫 Без перебросов
              </span>
            )}
            {dailyChallenge.nationalityRequirements.map((req, i) => (
              <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00C896]/15 text-[#00C896]">
                {req.flag} {req.count} из {req.nationality}
              </span>
            ))}
            {dailyChallenge.bonusMultiplier > 1 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fbbf24]/15 text-[#fbbf24]">
                ×{dailyChallenge.bonusMultiplier} бонус
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── GAME MODE ─── */}
      {!dailyChallenge && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
        >
          <SectionHeader>Режим игры</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(GAME_MODE_CONFIG) as [GameModeType, { label: string; description: string; icon: string }][]).map(
              ([key, val]) => {
                const isSelected = currentGameMode === key;
                const isComingSoon = key !== 'classic';
                return (
                  <motion.div
                    key={key}
                    whileTap={!isComingSoon ? { scale: 0.97 } : undefined}
                    className="rounded-xl p-3 text-center transition-all duration-200 border-2 relative overflow-hidden"
                    style={{
                      backgroundColor: isSelected && !isComingSoon ? `${ACCENT}15` : 'transparent',
                      borderColor: isSelected && !isComingSoon ? ACCENT : '#2a2a2a',
                      boxShadow: isSelected && !isComingSoon ? `0 0 12px ${ACCENT}25` : 'none',
                      opacity: isComingSoon ? 0.5 : 1,
                      cursor: isComingSoon ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => !isComingSoon && handleGameModeSelect(key)}
                  >
                    {isComingSoon && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#00C896]/15 text-[#00C896] border border-[#00C896]/20 z-10">
                        СКОРО
                      </span>
                    )}
                    <div className={`text-xl mb-1 ${isComingSoon ? 'grayscale' : ''}`}>{val.icon}</div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: isSelected && !isComingSoon ? ACCENT : '#FFFFFF' }}
                    >
                      {val.label}
                    </div>
                    <div className={`text-[10px] mt-1 leading-tight ${isComingSoon ? 'text-[#9CA3AF]/40' : 'text-[#9CA3AF]'}`}>
                      {val.description}
                    </div>
                  </motion.div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* ─── CLUB SELECTION (only for single_club mode) ─── */}
      <AnimatePresence>
        {currentGameMode === 'single_club' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
            >
              <SectionHeader>Выберите клуб</SectionHeader>

              {/* Selected club indicator */}
              {selectedClub && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 rounded-xl p-3 flex items-center gap-3"
                  style={{
                    backgroundColor: `${ACCENT}10`,
                    border: `1px solid ${ACCENT}30`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${ACCENT}20` }}
                  >
                    🏟️
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: ACCENT }}>
                      {selectedClub.nameRu}
                    </div>
                    <div className="text-xs text-[#9CA3AF]">
                      Все спины будут только с сезонами этого клуба
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Search input */}
              <div className="mb-3 relative">
                <input
                  type="text"
                  placeholder="Поиск клуба..."
                  value={clubSearch}
                  onChange={(e) => setClubSearch(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#64748b] outline-none transition-all"
                  style={{
                    backgroundColor: '#1f1f1f',
                    border: '1px solid #2a2a2a',
                  }}
                />
                {clubSearch && (
                  <button
                    onClick={() => setClubSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Club grid */}
              {clubsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-[#00C896] rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-[#9CA3AF]">Загрузка клубов...</span>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filteredClubs.map((club) => (
                      <ClubCard
                        key={club.id}
                        club={club}
                        isSelected={config.clubFilter === club.id}
                        onClick={() => {
                          selectionChanged();
                          if (config.clubFilter === club.id) {
                            setConfig({ clubFilter: undefined });
                          } else {
                            setConfig({ clubFilter: club.id });
                          }
                        }}
                      />
                    ))}
                  </div>
                  {filteredClubs.length === 0 && (
                    <div className="text-center py-6 text-sm text-[#64748b]">
                      Клубы не найдены
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── NATIONALITY INDICATOR (for nations_cup mode) ─── */}
      <AnimatePresence>
        {currentGameMode === 'nations_cup' && config.nationalityFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
            >
              <SectionHeader>Выбранная нация</SectionHeader>
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  backgroundColor: `${ACCENT}10`,
                  border: `1px solid ${ACCENT}30`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${ACCENT}20` }}
                >
                  🏆
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: ACCENT }}>
                    {config.nationalityFilter}
                  </div>
                  <div className="text-xs text-[#9CA3AF]">
                    Все спины будут содержать только игроков этой нации
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FORMATION ─── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
      >
        <SectionHeader>Схема</SectionHeader>

        {/* If formation is locked by daily challenge, show lock indicator */}
        {dailyChallenge?.formationLock ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 px-3 py-2">
            <span className="text-sm">🔒</span>
            <span className="text-xs font-bold text-[#3b82f6]">Схема заблокирована: {dailyChallenge.formationLock}</span>
          </div>
        ) : (
          <>
            {/* Horizontal scrollable pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {FORMATIONS.map((f) => (
                <PillButton
                  key={f.id}
                  label={f.id}
                  isSelected={config.formation === f.id}
                  onClick={() => handleFormationSelect(f.id)}
                />
              ))}
            </div>

            {/* Formation description when selected */}
            {selectedFormation && (
              <motion.div
                key={config.formation}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3"
              >
                <p className="text-xs text-[#9CA3AF] text-center">
                  {selectedFormation.description}
                </p>
              </motion.div>
            )}
          </>
        )}

        {/* Formation preview */}
        <AnimatePresence mode="wait">
          {selectedFormation && (
            <div className="mt-3">
              <FormationPitch formationId={config.formation} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── DIFFICULTY ─── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
      >
        <SectionHeader>Сложность</SectionHeader>
        <div className="grid grid-cols-3 gap-2">
          {(
            Object.entries(DIFFICULTY_CONFIG) as [
              Difficulty,
              (typeof DIFFICULTY_CONFIG)[Difficulty],
            ][]
          ).map(([key, val]) => {
            const isSelected = config.difficulty === key;
            const meta = DIFFICULTY_META[key];
            return (
              <motion.button
                key={key}
                onClick={() => {
                  setConfig({
                    difficulty: key,
                    showRatings: undefined,
                  });
                }}
                whileTap={{ scale: 0.97 }}
                className="rounded-xl p-3 text-center transition-all duration-200 border-2 relative overflow-hidden"
                style={{
                  backgroundColor: isSelected ? `${meta.color}15` : 'transparent',
                  borderColor: isSelected ? meta.color : '#2a2a2a',
                  boxShadow: isSelected
                    ? `0 0 12px ${meta.color}25`
                    : 'none',
                }}
              >
                <div className="text-xl mb-1">{meta.icon}</div>
                <div
                  className="text-sm font-bold"
                  style={{ color: isSelected ? meta.color : '#FFFFFF' }}
                >
                  {val.label}
                </div>
                <div className="text-[10px] text-[#9CA3AF] mt-1 leading-tight">
                  {meta.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ─── SHOW RATINGS ─── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <SectionHeader>Показывать рейтинги</SectionHeader>
            <p className="text-xs text-[#64748b] -mt-1">
              {effectiveShowRatings ? 'Рейтинги видны' : 'Слепой режим — рейтинги скрыты'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold"
              style={{ color: effectiveShowRatings ? ACCENT : '#64748b' }}
            >
              {effectiveShowRatings ? 'Вкл' : 'Выкл'}
            </span>
            <Switch
              checked={effectiveShowRatings}
              onCheckedChange={(checked) => {
                setConfig({ showRatings: checked });
              }}
              className="data-[state=checked]:bg-[#00C896]"
            />
          </div>
        </div>
      </div>

      {/* ─── DRAFT MODE ─── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
      >
        <SectionHeader>Режим драфта</SectionHeader>
        <div className="grid grid-cols-2 gap-2">
          {(
            Object.entries(DRAFT_MODE_CONFIG) as [
              string,
              { label: string; description: string },
            ][]
          ).map(([key, val]) => (
            <button
              key={key}
              onClick={() =>
                setConfig({ draftMode: key as 'squad_first' | 'position_first' })
              }
              className="rounded-xl p-3 text-center transition-all duration-200 border-2"
              style={{
                backgroundColor:
                  config.draftMode === key ? `${ACCENT}15` : 'transparent',
                borderColor: config.draftMode === key ? ACCENT : '#2a2a2a',
                boxShadow: config.draftMode === key ? `0 0 12px ${ACCENT}25` : 'none',
              }}
            >
              <div
                className="font-bold text-sm"
                style={{ color: config.draftMode === key ? ACCENT : '#FFFFFF' }}
              >
                {val.label}
              </div>
              <div className="text-[10px] text-[#9CA3AF] mt-1 leading-relaxed">
                {val.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── PLAYER RATINGS ─── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
      >
        <SectionHeader>Рейтинг игроков</SectionHeader>
        <div className="grid grid-cols-2 gap-2">
          {(
            Object.entries(RATING_MODE_CONFIG) as [
              string,
              { label: string; description: string },
            ][]
          ).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setConfig({ ratingMode: key as 'season' | 'prime' })}
              className="rounded-xl p-3 text-center transition-all duration-200 border-2"
              style={{
                backgroundColor:
                  config.ratingMode === key ? `${ACCENT}15` : 'transparent',
                borderColor: config.ratingMode === key ? ACCENT : '#2a2a2a',
                boxShadow: config.ratingMode === key ? `0 0 12px ${ACCENT}25` : 'none',
              }}
            >
              <div
                className="font-bold text-sm"
                style={{ color: config.ratingMode === key ? ACCENT : '#FFFFFF' }}
              >
                {val.label}
              </div>
              <div className="text-[10px] text-[#9CA3AF] mt-1 leading-relaxed">
                {val.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── ERA ─── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
      >
        <SectionHeader>Эпоха</SectionHeader>
        {dailyChallenge?.eraRestriction ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#f97316]/10 border border-[#f97316]/20 px-3 py-2">
            <span className="text-sm">🔒</span>
            <span className="text-xs font-bold text-[#f97316]">
              Эпоха заблокирована: {dailyChallenge.eraRestriction.start}-{dailyChallenge.eraRestriction.end}
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(Object.entries(ERA_CONFIG) as [EraFilter, { label: string }][]).map(
                ([key, val]) => (
                  <PillButton
                    key={key}
                    label={val.label}
                    isSelected={config.eraFilter === key}
                    onClick={() => setConfig({
                      eraFilter: key,
                      eraStartYear: ERA_CONFIG[key].minYear,
                      eraEndYear: ERA_CONFIG[key].maxYear,
                    })}
                  />
                ),
              )}
            </div>

            {/* Custom era range slider — shown when "Свой" is selected */}
            {config.eraFilter === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3"
              >
                {/* Year range display */}
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-black text-[#00C896]">
                    {config.eraStartYear}
                  </div>
                  <div className="flex-1 mx-3 flex items-center justify-center">
                    <div className="h-px flex-1 bg-gradient-to-r from-[#00C896]/40 to-[#00C896]/40" />
                    <span className="mx-2 text-sm text-[#9CA3AF]">—</span>
                    <div className="h-px flex-1 bg-gradient-to-l from-[#00C896]/40 to-[#00C896]/40" />
                  </div>
                  <div className="text-2xl font-black text-[#00C896]">
                    {config.eraEndYear}
                  </div>
                </div>

                {/* Dual range slider */}
                <div className="relative h-8">
                  {/* Track background */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full bg-[#1f1f1f]" />
                  {/* Active range highlight */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-[#00C896]/30"
                    style={{
                      left: `${((config.eraStartYear - ERA_MIN_YEAR) / (ERA_MAX_YEAR - ERA_MIN_YEAR)) * 100}%`,
                      right: `${((ERA_MAX_YEAR - config.eraEndYear) / (ERA_MAX_YEAR - ERA_MIN_YEAR)) * 100}%`,
                    }}
                  />

                  {/* Start year slider */}
                  <input
                    type="range"
                    min={ERA_MIN_YEAR}
                    max={ERA_MAX_YEAR - 1}
                    step={1}
                    value={config.eraStartYear}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), config.eraEndYear - 1);
                      setConfig({ eraStartYear: val });
                    }}
                    className="era-range-slider absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00C896] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,200,150,0.4)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0A0A0A]"
                  />

                  {/* End year slider */}
                  <input
                    type="range"
                    min={ERA_MIN_YEAR + 1}
                    max={ERA_MAX_YEAR}
                    step={1}
                    value={config.eraEndYear}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), config.eraStartYear + 1);
                      setConfig({ eraEndYear: val });
                    }}
                    className="era-range-slider absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00C896] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,200,150,0.4)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0A0A0A]"
                  />
                </div>

                {/* Year markers */}
                <div className="flex justify-between text-[10px] text-[#9CA3AF]/50">
                  {Array.from({ length: ERA_MAX_YEAR - ERA_MIN_YEAR + 1 }, (_, i) => ERA_MIN_YEAR + i).filter(y => y % 5 === 0 || y === ERA_MAX_YEAR).map(y => (
                    <span key={y}>{y}</span>
                  ))}
                </div>

                {/* Period info */}
                <div className="text-center text-xs text-[#9CA3AF]">
                  Период: {config.eraEndYear - config.eraStartYear + 1} {config.eraEndYear - config.eraStartYear + 1 === 1 ? 'год' : config.eraEndYear - config.eraStartYear + 1 < 5 ? 'года' : 'лет'}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ─── Error Display ─── */}
      <AnimatePresence>
        {(startError || lastDraftError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 p-3 text-sm text-[#ef4444] flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{startError || lastDraftError}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Auth Gate or Start Button ─── */}
      <Button
          onClick={handleStart}
          disabled={!canStart || isStarting}
          className="w-full h-12 text-base font-black text-white rounded-xl transition-all"
          style={{
            backgroundColor: canStart && !isStarting ? ACCENT : '#2a2a2a',
            boxShadow: canStart && !isStarting ? `0 4px 20px ${ACCENT}40` : 'none',
            opacity: canStart && !isStarting ? 1 : 0.6,
            cursor: canStart && !isStarting ? 'pointer' : 'not-allowed',
          }}
        >
          {isStarting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Загрузка...
            </span>
          ) : currentGameMode === 'single_club' && !config.clubFilter
          ? 'Выберите клуб'
          : currentGameMode === 'nations_cup' && !config.nationalityFilter
          ? 'Выберите нацию'
          : dailyChallenge
          ? 'Начать челлендж →'
          : 'Начать драфт'}
        </Button>
    </div>
  );
}
