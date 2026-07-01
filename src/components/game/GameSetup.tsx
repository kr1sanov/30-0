'use client';

import { useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { FORMATIONS, POSITION_CATEGORY } from '@/lib/positions';
import {
  DIFFICULTY_CONFIG,
  ERA_CONFIG,
  DRAFT_MODE_CONFIG,
  RATING_MODE_CONFIG,
} from '@/lib/types';
import type { Difficulty, EraFilter, GameConfig } from '@/lib/types';
import type { Position, PositionCategory } from '@/lib/positions';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Mini pitch dot layout for formation preview ─── */
const MINI_LAYOUTS: Record<string, { row: number; col: number }[]> = {
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
    case 'mid': return '#22c55e';
    case 'att': return '#ef4444';
  }
}

/* ─── Formation type classification ─── */
type FormationType = 'attack' | 'defensive' | 'balanced' | 'midfield';

const FORMATION_TYPE: Record<string, FormationType> = {
  '4-3-3': 'attack',
  '3-4-3': 'attack',
  '4-2-3-1': 'attack',
  '5-3-2': 'defensive',
  '5-4-1': 'defensive',
  '4-4-2': 'balanced',
  '4-2-2-2': 'balanced',
  '3-5-2': 'balanced',
  '4-4-1-1': 'balanced',
  '4-5-1': 'midfield',
  '4-1-4-1': 'midfield',
  '3-4-1-2': 'midfield',
};

const FORMATION_TYPE_BADGE: Record<
  FormationType,
  { icon: string; label: string; color: string }
> = {
  attack: { icon: '⚔️', label: 'Атака', color: '#ef4444' },
  defensive: { icon: '🛡️', label: 'Оборона', color: '#3b82f6' },
  balanced: { icon: '⚖️', label: 'Баланс', color: '#22c55e' },
  midfield: { icon: '🎯', label: 'Полузащита', color: '#a855f7' },
};

/* ─── Difficulty metadata for the enhanced cards ─── */
const DIFFICULTY_META: Record<
  Difficulty,
  { icon: string; flavor: string; color: string; glow: string }
> = {
  easy: {
    icon: '🌱',
    flavor: 'Идеально для новичков',
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.45)',
  },
  normal: {
    icon: '⚖️',
    flavor: 'Баланс риска и награды',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
  hard: {
    icon: '🔥',
    flavor: 'Только для экспертов',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.45)',
  },
};

/* ─── Enhanced mini pitch with gradient + formation name overlay ─── */
function MiniPitch({ formationId }: { formationId: string }) {
  const layout = MINI_LAYOUTS[formationId] ?? MINI_LAYOUTS['4-3-3'];
  const formation = FORMATIONS.find((f) => f.id === formationId);

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden"
      style={{ paddingBottom: '70%' }}
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
      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.25) 100%)',
        }}
      />
      {/* Center line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
      {/* Center circle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/25" />
      {/* Penalty box hint */}
      <div className="absolute inset-x-[30%] top-0 h-3 border-x border-b border-white/15" />

      {/* Player dots with category colors */}
      {layout.map((pos, i) => {
        const slotPosition = formation?.slots[i]?.position;
        const color = slotPosition ? getCategoryColor(slotPosition) : '#94a3b8';
        return (
          <div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{
              top: `${pos.row}%`,
              left: `${pos.col}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: color,
              boxShadow: `0 0 5px ${color}, 0 0 2px rgba(0,0,0,0.4)`,
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          />
        );
      })}

      {/* Formation name overlaid at bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
        <div className="text-center text-[10px] font-black text-white tracking-wide drop-shadow">
          {formationId}
        </div>
      </div>
    </div>
  );
}

/* ─── Position legend dot ─── */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
      />
      <span className="text-[9px] text-[#94a3b8]">{label}</span>
    </div>
  );
}

export default function GameSetup() {
  const { config, setConfig, startRun } = useGameStore();

  const [justSelectedFormation, setJustSelectedFormation] = useState<string | null>(null);
  const [quickPickPreview, setQuickPickPreview] = useState<GameConfig | null>(null);
  const [isQuickPicking, setIsQuickPicking] = useState(false);

  const handleStart = async () => {
    await startRun();
  };

  const handleFormationSelect = (formationId: string) => {
    setConfig({ formation: formationId });
    setJustSelectedFormation(formationId);
    window.setTimeout(() => {
      setJustSelectedFormation((cur) => (cur === formationId ? null : cur));
    }, 1400);
  };

  /* ─── Quick Pick: random formation + weighted difficulty + random era ─── */
  const handleQuickPick = useCallback(async () => {
    if (isQuickPicking) return;
    setIsQuickPicking(true);

    const randomFormation =
      FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)].id;

    // Weighted difficulty: 50% normal, 30% easy, 20% hard
    const rand = Math.random();
    let difficulty: Difficulty;
    if (rand < 0.5) difficulty = 'normal';
    else if (rand < 0.8) difficulty = 'easy';
    else difficulty = 'hard';

    const eraKeys = Object.keys(ERA_CONFIG) as EraFilter[];
    const randomEra = eraKeys[Math.floor(Math.random() * eraKeys.length)];

    const newConfig: GameConfig = {
      ...config,
      formation: randomFormation,
      difficulty,
      eraFilter: randomEra,
    };

    setConfig({
      formation: randomFormation,
      difficulty,
      eraFilter: randomEra,
    });

    // Show preview animation
    setQuickPickPreview(newConfig);

    // Brief confirmation delay so user can see the random picks
    await new Promise((resolve) => setTimeout(resolve, 1600));
    setQuickPickPreview(null);

    await startRun();
    setIsQuickPicking(false);
  }, [config, isQuickPicking, setConfig, startRun]);

  const selectedFormation = FORMATIONS.find((f) => f.id === config.formation);
  const selectedDifficultyMeta = DIFFICULTY_META[config.difficulty];

  return (
    <div className="space-y-8 animate-fade-in-up relative">
      {/* ─── Quick Start (Быстрый старт) ─── */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            onClick={handleQuickPick}
            disabled={isQuickPicking}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            className="w-full h-14 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 relative overflow-hidden shadow-lg disabled:opacity-80 disabled:cursor-wait"
            style={{
              background:
                'linear-gradient(135deg, #facc15 0%, #f59e0b 50%, #f97316 100%)',
              boxShadow:
                '0 4px 20px rgba(245, 158, 11, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
            }}
          >
            {/* Animated shimmer sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            {/* Pulsing attention ring */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(250, 204, 21, 0.55)',
                  '0 0 0 8px rgba(250, 204, 21, 0)',
                ],
              }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              className="relative z-10 text-2xl"
              animate={{ rotate: [0, -12, 12, -12, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.4 }}
            >
              ⚡
            </motion.span>
            <span className="relative z-10 drop-shadow">
              {isQuickPicking ? 'Запуск...' : 'Быстрый старт'}
            </span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Случайные настройки для быстрой игры
        </TooltipContent>
      </Tooltip>

      {/* ─── Quick Pick confirmation overlay ─── */}
      <AnimatePresence>
        {quickPickPreview && (
          <motion.div
            key="quickpick-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 280 }}
              className="w-full max-w-sm rounded-3xl p-6 text-center border-2 border-yellow-400/40"
              style={{
                background:
                  'linear-gradient(160deg, #0d2d0d 0%, #0b240b 100%)',
                boxShadow: '0 0 40px rgba(250, 204, 21, 0.3)',
              }}
            >
              <motion.div
                className="text-4xl mb-2"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                ⚡
              </motion.div>
              <div className="text-lg font-black text-yellow-300 mb-4">
                Случайный выбор!
              </div>

              <div className="space-y-2 text-left">
                <PreviewRow
                  icon="⚽"
                  label="Формация"
                  value={quickPickPreview.formation}
                />
                <PreviewRow
                  icon={DIFFICULTY_META[quickPickPreview.difficulty].icon}
                  label="Сложность"
                  value={DIFFICULTY_CONFIG[quickPickPreview.difficulty].label}
                  accent={DIFFICULTY_META[quickPickPreview.difficulty].color}
                />
                <PreviewRow
                  icon="📅"
                  label="Эпоха"
                  value={ERA_CONFIG[quickPickPreview.eraFilter].label}
                />
              </div>

              <motion.div
                className="mt-4 text-xs text-[#94a3b8]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Запуск драфта...
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-[#e2e8f0] section-accent-line inline-block">
          Настройка игры
        </h2>
        <p className="text-sm text-[#94a3b8] mt-1">
          Выберите формацию и параметры драфта
        </p>
      </div>

      {/* ─── Team Name ─── */}
      <div>
        <label className="text-sm font-bold text-[#e2e8f0] mb-2 block">
          Название команды
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">⚽</span>
          <input
            type="text"
            maxLength={24}
            value={config.teamName || ''}
            onChange={(e) => setConfig({ teamName: e.target.value || undefined })}
            placeholder="Моя команда"
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#0d2d0d] border border-[#22c55e]/20 text-sm text-[#e2e8f0] placeholder:text-[#94a3b8]/50 focus:border-[#22c55e]/40 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* ─── Formation Selector ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[#e2e8f0] section-accent-line">Формация</h3>
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3">
            <LegendDot color="#f97316" label="ВР" />
            <LegendDot color="#3b82f6" label="ЗЩ" />
            <LegendDot color="#22c55e" label="ПЗ" />
            <LegendDot color="#ef4444" label="НП" />
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {FORMATIONS.map((f) => {
            const isSelected = config.formation === f.id;
            const fType = FORMATION_TYPE[f.id] ?? 'balanced';
            const badge = FORMATION_TYPE_BADGE[fType];
            const showSelectedLabel = justSelectedFormation === f.id;
            return (
              <motion.button
                key={f.id}
                onClick={() => handleFormationSelect(f.id)}
                className={`rounded-2xl p-3 text-center transition-all duration-200 border-2 overflow-hidden relative ${
                  isSelected
                    ? 'border-[#22c55e]'
                    : 'border-[#0d2d0d] hover:border-[#22c55e]/30'
                }`}
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, #0d2d0d 0%, rgba(34, 197, 94, 0.12) 100%)'
                    : 'linear-gradient(135deg, #0d2d0d 0%, #0b240b 100%)',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(34,197,94,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Pulsing glow on selected */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none rounded-2xl"
                    animate={{
                      boxShadow: [
                        'inset 0 0 14px rgba(34,197,94,0.15), 0 0 12px rgba(34,197,94,0.25)',
                        'inset 0 0 22px rgba(34,197,94,0.3), 0 0 22px rgba(34,197,94,0.5)',
                        'inset 0 0 14px rgba(34,197,94,0.15), 0 0 12px rgba(34,197,94,0.25)',
                      ],
                    }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Green checkmark in top-right when selected */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -90, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 14, stiffness: 320 }}
                      className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-[#22c55e] flex items-center justify-center shadow-md shadow-[#22c55e]/40"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-3 h-3 text-white"
                        stroke="currentColor"
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Formation type badge in top-left */}
                <div
                  className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5"
                  style={{
                    backgroundColor: `${badge.color}22`,
                    color: badge.color,
                    border: `1px solid ${badge.color}55`,
                  }}
                >
                  <span className="text-[10px] leading-none">{badge.icon}</span>
                </div>

                <MiniPitch formationId={f.id} />
                <div
                  className={`text-sm font-bold mt-2 ${
                    isSelected ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
                  }`}
                >
                  {f.name}
                </div>
                <div className="text-[10px] text-[#94a3b8] mt-0.5 leading-tight">
                  {f.description}
                </div>

                {/* "Выбрано" label briefly appears */}
                <AnimatePresence>
                  {showSelectedLabel && (
                    <motion.div
                      key="selected-label"
                      initial={{ opacity: 0, y: 6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-x-0 bottom-0 z-20 bg-[#22c55e] text-white text-[10px] font-black py-1 rounded-b-2xl shadow-lg"
                    >
                      ✓ Выбрано
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Mobile legend */}
        <div className="sm:hidden flex items-center justify-center gap-3 mt-3">
          <LegendDot color="#f97316" label="ВР" />
          <LegendDot color="#3b82f6" label="ЗЩ" />
          <LegendDot color="#22c55e" label="ПЗ" />
          <LegendDot color="#ef4444" label="НП" />
        </div>
      </div>

      {/* ─── Difficulty Selector ─── */}
      <div>
        <h3 className="text-lg font-bold text-[#e2e8f0] mb-4 section-accent-line">Сложность</h3>
        <div className="grid grid-cols-3 gap-3">
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
                onClick={() => setConfig({ difficulty: key })}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: isSelected ? 1.0 : 1.02 }}
                className="rounded-2xl p-4 text-center transition-all duration-200 border-2 relative overflow-hidden"
                style={{
                  background: isSelected
                    ? `linear-gradient(160deg, ${meta.color}22 0%, ${meta.color}08 100%)`
                    : key === 'easy'
                    ? 'rgba(34, 197, 94, 0.05)'
                    : key === 'normal'
                    ? 'rgba(59, 130, 246, 0.05)'
                    : 'rgba(239, 68, 68, 0.05)',
                  borderColor: isSelected ? meta.color : '#0d2d0d',
                  boxShadow: isSelected
                    ? `0 4px 18px ${meta.glow}, inset 0 0 14px ${meta.color}22, inset 0 1px 0 rgba(255,255,255,0.05)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {/* Big icon */}
                <motion.div
                  className="text-2xl mb-1"
                  animate={
                    isSelected
                      ? { scale: [1, 1.15, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 1.6, repeat: isSelected ? Infinity : 0 }}
                >
                  {meta.icon}
                </motion.div>
                <div
                  className="text-sm font-black"
                  style={{ color: isSelected ? meta.color : '#e2e8f0' }}
                >
                  {val.label}
                </div>
                <div className="text-[10px] text-[#94a3b8] mt-1 leading-tight">
                  {meta.flavor}
                </div>
                <div
                  className="text-[10px] mt-1.5 font-semibold"
                  style={{ color: isSelected ? meta.color : '#94a3b8' }}
                >
                  ♻️ {val.rerolls} переброс(ов)
                </div>
                <div className="text-[9px] text-[#94a3b8]/70 mt-0.5">
                  {val.showRatings ? '👁 Рейтинги видны' : '🚫 Рейтинги скрыты'}
                </div>

                {/* Selected indicator strip */}
                {isSelected && (
                  <motion.div
                    layoutId="difficulty-strip"
                    className="absolute inset-x-0 bottom-0 h-1"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Show Ratings Toggle (Hard mode) */}
      <div className="flex items-center justify-between rounded-2xl bg-[#0d2d0d] p-4 border border-[#0d2d0d]">
        <div>
          <div className="text-sm font-bold text-[#e2e8f0]">
            Показывать рейтинги
          </div>
          <div className="text-xs text-[#94a3b8] mt-0.5">
            Скрывает рейтинги игроков для усложнения
          </div>
        </div>
        <Switch
          checked={config.difficulty !== 'hard'}
          onCheckedChange={(checked) => {
            if (!checked) {
              setConfig({ difficulty: 'hard' });
            } else if (config.difficulty === 'hard') {
              setConfig({ difficulty: 'normal' });
            }
          }}
          className="data-[state=checked]:bg-[#22c55e]"
        />
      </div>

      {/* ─── Draft Mode ─── */}
      <div>
        <h3 className="text-lg font-bold text-[#e2e8f0] mb-4 section-accent-line">Режим драфта</h3>
        <div className="grid grid-cols-2 gap-3">
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
              className={`rounded-2xl p-4 text-center transition-all duration-200 border-2 ${
                config.draftMode === key
                  ? 'border-[#22c55e] bg-[#22c55e]/10 shadow-lg shadow-[#22c55e]/10'
                  : 'border-[#0d2d0d] bg-[#0d2d0d] hover:border-[#22c55e]/30'
              }`}
            >
              <div
                className={`font-bold ${
                  config.draftMode === key ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
                }`}
              >
                {val.label}
              </div>
              <div className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                {val.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Rating Mode ─── */}
      <div>
        <h3 className="text-lg font-bold text-[#e2e8f0] mb-4 section-accent-line">
          Режим рейтинга
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(
            Object.entries(RATING_MODE_CONFIG) as [
              string,
              { label: string; description: string },
            ][]
          ).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setConfig({ ratingMode: key as 'season' | 'prime' })}
              className={`rounded-2xl p-4 text-center transition-all duration-200 border-2 ${
                config.ratingMode === key
                  ? 'border-[#22c55e] bg-[#22c55e]/10 shadow-lg shadow-[#22c55e]/10'
                  : 'border-[#0d2d0d] bg-[#0d2d0d] hover:border-[#22c55e]/30'
              }`}
            >
              <div
                className={`font-bold ${
                  config.ratingMode === key ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
                }`}
              >
                {val.label}
              </div>
              <div className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                {val.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Era Filter ─── */}
      <div>
        <h3 className="text-lg font-bold text-[#e2e8f0] mb-4 section-accent-line">Эпоха</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(ERA_CONFIG) as [EraFilter, { label: string }][]).map(
            ([key, val]) => (
              <button
                key={key}
                onClick={() => setConfig({ eraFilter: key })}
                className={`rounded-2xl p-3 text-center transition-all duration-200 border-2 ${
                  config.eraFilter === key
                    ? 'border-[#22c55e] bg-[#22c55e]/10 shadow-lg shadow-[#22c55e]/10'
                    : 'border-[#0d2d0d] bg-[#0d2d0d] hover:border-[#22c55e]/30'
                }`}
              >
                <div
                  className={`font-bold text-sm ${
                    config.eraFilter === key ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
                  }`}
                >
                  {val.label}
                </div>
              </button>
            ),
          )}
        </div>
      </div>

      {/* ─── Settings Summary Bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-[#22c55e]/30 bg-gradient-to-r from-[#0d2d0d] via-[#0d2d0d]/80 to-[#0d2d0d] p-3 overflow-x-auto"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-max">
          <SummaryItem
            icon="⚽"
            label="Команда"
            value={config.teamName || 'Моя команда'}
          />
          <Divider />
          <SummaryItem
            icon="📐"
            label="Формация"
            value={config.formation}
          />
          <Divider />
          <SummaryItem
            icon={selectedDifficultyMeta.icon}
            label="Сложность"
            value={DIFFICULTY_CONFIG[config.difficulty].label}
            color={selectedDifficultyMeta.color}
          />
          <Divider />
          <SummaryItem
            icon="🎯"
            label="Драфт"
            value={DRAFT_MODE_CONFIG[config.draftMode].label}
          />
          <Divider />
          <SummaryItem
            icon="⭐"
            label="Рейтинг"
            value={RATING_MODE_CONFIG[config.ratingMode].label}
          />
          <Divider />
          <SummaryItem
            icon="📅"
            label="Эпоха"
            value={ERA_CONFIG[config.eraFilter].label}
          />
        </div>
      </motion.div>

      {/* ─── Start Button ─── */}
      <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.015 }} className="relative">
        {/* Pulsing ring animation */}
        <div className="absolute inset-0 rounded-2xl border-2 border-[#22c55e]/40 animate-pulse-ring pointer-events-none" />
        <Button
          onClick={handleStart}
          className="w-full h-16 text-xl font-black text-white rounded-2xl transition-all relative overflow-hidden animate-button-glow btn-shimmer"
          style={{
            background:
              'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
            boxShadow:
              '0 6px 24px rgba(34, 197, 94, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          {/* Shimmer sweep */}
          <motion.span
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.25) 50%, transparent 65%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          />
          <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow">
            <motion.span
              className="text-2xl"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}
            >
              ⚽
            </motion.span>
            Начать драфт
          </span>
        </Button>
      </motion.div>
    </div>
  );
}

/* ─── Helper sub-components ─── */

function PreviewRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
      className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-[#94a3b8]">{label}</span>
      </div>
      <span
        className="text-sm font-bold"
        style={{ color: accent ?? '#e2e8f0' }}
      >
        {value}
      </span>
    </motion.div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="pill-badge bg-gradient-to-r from-[#0d2d0d] to-[#0b240b] border border-[#22c55e]/10">
        {color ? (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
          />
        ) : (
          <span className="text-sm">{icon}</span>
        )}
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] uppercase tracking-wide text-[#94a3b8]">
            {label}
          </span>
          <span
            className="text-xs font-bold whitespace-nowrap"
            style={{ color: color ?? '#e2e8f0' }}
          >
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-[#22c55e]/20 flex-shrink-0" />;
}
