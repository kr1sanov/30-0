'use client';

import { useGameStore } from '@/store/gameStore';
import { FORMATIONS, POSITION_CATEGORY } from '@/lib/positions';
import {
  DIFFICULTY_CONFIG,
  ERA_CONFIG,
  DRAFT_MODE_CONFIG,
  RATING_MODE_CONFIG,
} from '@/lib/types';
import type { Difficulty, EraFilter } from '@/lib/types';
import type { Position, PositionCategory } from '@/lib/positions';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/use-telegram';

/* ─── Colors ─── */
const ACCENT = '#00C896';
const BG_PAGE = '#0A0A0A';
const BG_CARD = '#141414';

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

export default function GameSetup() {
  const { config, setConfig, startRun } = useGameStore();
  const { haptic, selectionChanged } = useTelegram();

  const handleStart = async () => {
    haptic('medium'); // Haptic when starting the game
    await startRun();
  };

  const handleFormationSelect = (formationId: string) => {
    selectionChanged(); // Light haptic for selection change
    setConfig({ formation: formationId });
  };

  const selectedFormation = FORMATIONS.find((f) => f.id === config.formation);

  // Derive effective showRatings: if explicitly set use that, otherwise follow difficulty
  const effectiveShowRatings =
    config.showRatings !== undefined
      ? config.showRatings
      : DIFFICULTY_CONFIG[config.difficulty].showRatings;

  return (
    <div className="space-y-6 animate-fade-in-up" style={{ background: BG_PAGE }}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-white inline-block">
          Настройка игры
        </h2>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Выберите параметры драфта
        </p>
      </div>

      {/* ─── FORMATION ─── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
      >
        <SectionHeader>Схема</SectionHeader>

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
                    // Reset showRatings override when changing difficulty
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
      </div>

      {/* ─── Start Button ─── */}
      <Button
        onClick={handleStart}
        className="w-full h-12 text-base font-black text-white rounded-xl transition-all"
        style={{
          backgroundColor: ACCENT,
          boxShadow: `0 4px 20px ${ACCENT}40`,
        }}
      >
        Начать драфт
      </Button>
    </div>
  );
}
