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
import type { Difficulty, EraFilter } from '@/lib/types';
import type { Position, PositionCategory } from '@/lib/positions';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';

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
    case 'mid': return '#22c55e';
    case 'att': return '#ef4444';
  }
}

/* ─── Difficulty metadata ─── */
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
      style={{ paddingBottom: '75%' }}
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

      {/* Player dots with position labels */}
      {layout.map((pos, i) => {
        const slotPosition = formation?.slots[i]?.position;
        const slotLabel = formation?.slots[i]?.label;
        const color = slotPosition ? getCategoryColor(slotPosition) : '#94a3b8';
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

      {/* Formation name + description at bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
        <div className="text-center">
          <span className="text-xs font-black text-white tracking-wide">{formationId}</span>
          {formation?.description && (
            <span className="text-[10px] text-white/70 ml-2">{formation.description}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function GameSetup() {
  const { config, setConfig, startRun } = useGameStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleStart = async () => {
    await startRun();
  };

  const handleFormationSelect = (formationId: string) => {
    setConfig({ formation: formationId });
  };

  const selectedFormation = FORMATIONS.find((f) => f.id === config.formation);
  const selectedDifficultyMeta = DIFFICULTY_META[config.difficulty];

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-[#e2e8f0] inline-block">
          Настройка игры
        </h2>
        <p className="text-sm text-[#94a3b8] mt-1">
          Выберите схему и сложность
        </p>
      </div>

      {/* ─── Formation (Схема игры) Selector ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[#e2e8f0] section-accent-line">Схема игры</h3>
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3">
            <LegendDot color="#f97316" label="ВР" />
            <LegendDot color="#3b82f6" label="ЗЩ" />
            <LegendDot color="#22c55e" label="ПЗ" />
            <LegendDot color="#ef4444" label="НП" />
          </div>
        </div>

        {/* Formation buttons grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {FORMATIONS.map((f) => {
            const isSelected = config.formation === f.id;
            return (
              <motion.button
                key={f.id}
                onClick={() => handleFormationSelect(f.id)}
                className={`rounded-xl py-2.5 px-2 text-center transition-all duration-200 border-2 font-bold text-sm ${
                  isSelected
                    ? 'border-[#22c55e] bg-[#22c55e]/15 text-[#22c55e]'
                    : 'border-[#1a3a1a] bg-[#0d2d0d] text-[#e2e8f0] hover:border-[#22c55e]/30 hover:text-[#22c55e]/80'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {f.id}
              </motion.button>
            );
          })}
        </div>

        {/* Mobile legend */}
        <div className="sm:hidden flex items-center justify-center gap-3 mt-2">
          <LegendDot color="#f97316" label="ВР" />
          <LegendDot color="#3b82f6" label="ЗЩ" />
          <LegendDot color="#22c55e" label="ПЗ" />
          <LegendDot color="#ef4444" label="НП" />
        </div>

        {/* Formation preview — shown below the buttons */}
        <AnimatePresence mode="wait">
          {selectedFormation && (
            <div className="mt-4">
              <FormationPitch formationId={config.formation} />
            </div>
          )}
        </AnimatePresence>
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

      {/* ─── Advanced Settings (collapsible) ─── */}
      <div className="rounded-2xl border border-[#1a3a1a]/60 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#0d1a0d] hover:bg-[#0d2d0d]/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#94a3b8]">⚙️ Расширенные настройки</span>
          </div>
          <motion.span
            animate={{ rotate: showAdvanced ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[#64748b] text-sm"
          >
            ▼
          </motion.span>
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-5 bg-[#0a150a]">
                {/* Show Ratings Toggle */}
                <div className="flex items-center justify-between">
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
                  <h4 className="text-sm font-bold text-[#94a3b8] mb-2">Режим драфта</h4>
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
                        className={`rounded-xl p-3 text-center transition-all duration-200 border-2 ${
                          config.draftMode === key
                            ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                            : 'border-[#0d2d0d] bg-[#0d2d0d] hover:border-[#22c55e]/30'
                        }`}
                      >
                        <div
                          className={`font-bold text-sm ${
                            config.draftMode === key ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
                          }`}
                        >
                          {val.label}
                        </div>
                        <div className="text-[10px] text-[#94a3b8] mt-1 leading-relaxed">
                          {val.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── Rating Mode ─── */}
                <div>
                  <h4 className="text-sm font-bold text-[#94a3b8] mb-2">Режим рейтинга</h4>
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
                        className={`rounded-xl p-3 text-center transition-all duration-200 border-2 ${
                          config.ratingMode === key
                            ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                            : 'border-[#0d2d0d] bg-[#0d2d0d] hover:border-[#22c55e]/30'
                        }`}
                      >
                        <div
                          className={`font-bold text-sm ${
                            config.ratingMode === key ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
                          }`}
                        >
                          {val.label}
                        </div>
                        <div className="text-[10px] text-[#94a3b8] mt-1 leading-relaxed">
                          {val.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── Era Filter ─── */}
                <div>
                  <h4 className="text-sm font-bold text-[#94a3b8] mb-2">Эпоха</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.entries(ERA_CONFIG) as [EraFilter, { label: string }][]).map(
                      ([key, val]) => (
                        <button
                          key={key}
                          onClick={() => setConfig({ eraFilter: key })}
                          className={`rounded-xl p-2.5 text-center transition-all duration-200 border-2 ${
                            config.eraFilter === key
                              ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                              : 'border-[#0d2d0d] bg-[#0d2d0d] hover:border-[#22c55e]/30'
                          }`}
                        >
                          <div
                            className={`font-bold text-xs ${
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
            Крутить колесо
          </span>
        </Button>
      </motion.div>
    </div>
  );
}

/* ─── Helper sub-components ─── */

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
