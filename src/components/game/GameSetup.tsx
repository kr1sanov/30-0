'use client';

import { useGameStore } from '@/store/gameStore';
import { FORMATIONS, POSITION_CATEGORY } from '@/lib/positions';
import { DIFFICULTY_CONFIG, ERA_CONFIG, DRAFT_MODE_CONFIG, RATING_MODE_CONFIG } from '@/lib/types';
import type { Difficulty, EraFilter } from '@/lib/types';
import type { Position, PositionCategory } from '@/lib/positions';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';

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
  const cat = POSITION_CATEGORY[pos as Position] ?? 'mid' as PositionCategory;
  switch (cat) {
    case 'gk': return '#f97316';
    case 'def': return '#3b82f6';
    case 'mid': return '#22c55e';
    case 'att': return '#ef4444';
  }
}

function MiniPitch({ formationId }: { formationId: string }) {
  const layout = MINI_LAYOUTS[formationId] ?? MINI_LAYOUTS['4-3-3'];
  const formation = FORMATIONS.find((f) => f.id === formationId);

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden"
      style={{ paddingBottom: '70%', background: '#1a5c30' }}
    >
      {/* Pitch stripes */}
      <div
        className="absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(180deg, #1a5c30 0px, #1a5c30 8px, #175228 8px, #175228 16px)',
        }}
      />
      {/* Center line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
      {/* Center circle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/15" />

      {/* Player dots */}
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
              boxShadow: `0 0 4px ${color}88`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function GameSetup() {
  const { config, setConfig, startRun } = useGameStore();

  const handleStart = async () => {
    await startRun();
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-[#e2e8f0]">Настройка игры</h2>
        <p className="text-sm text-[#94a3b8] mt-1">Выберите формацию и параметры драфта</p>
      </div>

      {/* Formation Selector with Mini Pitch */}
      <div>
        <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">Формация</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {FORMATIONS.map((f) => (
            <motion.button
              key={f.id}
              onClick={() => setConfig({ formation: f.id })}
              className={`rounded-2xl p-3 text-center transition-all duration-200 border-2 overflow-hidden ${
                config.formation === f.id
                  ? 'border-[#22c55e] bg-[#22c55e]/10 shadow-lg shadow-[#22c55e]/10'
                  : 'border-[#1a1a2e] bg-[#1a1a2e] hover:border-[#22c55e]/30'
              }`}
              whileTap={{ scale: 0.97 }}
            >
              <MiniPitch formationId={f.id} />
              <div className={`text-sm font-bold mt-2 ${
                config.formation === f.id ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
              }`}>
                {f.name}
              </div>
              <div className="text-[10px] text-[#94a3b8] mt-0.5 leading-tight">{f.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Difficulty Selector */}
      <div>
        <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">Сложность</h3>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG[Difficulty]][]).map(
            ([key, val]) => (
              <button
                key={key}
                onClick={() => setConfig({ difficulty: key })}
                className={`rounded-2xl p-4 text-center transition-all duration-200 border-2 ${
                  config.difficulty === key
                    ? 'border-[#22c55e] bg-[#22c55e]/10 shadow-lg shadow-[#22c55e]/10'
                    : 'border-[#1a1a2e] bg-[#1a1a2e] hover:border-[#22c55e]/30'
                }`}
              >
                <div className={`text-lg font-bold ${
                  config.difficulty === key ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
                }`}>
                  {val.label}
                </div>
                <div className="text-xs text-[#94a3b8] mt-1">Перебросы: {val.rerolls}</div>
                <div className="text-[10px] text-[#94a3b8]/70 mt-0.5">
                  {val.showRatings ? 'Рейтинги видны' : 'Рейтинги скрыты'}
                </div>
              </button>
            )
          )}
        </div>
      </div>

      {/* Show Ratings Toggle (Hard mode) */}
      <div className="flex items-center justify-between rounded-2xl bg-[#1a1a2e] p-4 border border-[#1a1a2e]">
        <div>
          <div className="text-sm font-bold text-[#e2e8f0]">Показывать рейтинги</div>
          <div className="text-xs text-[#94a3b8] mt-0.5">Скрывает рейтинги игроков для усложнения</div>
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

      {/* Draft Mode */}
      <div>
        <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">Режим драфта</h3>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(DRAFT_MODE_CONFIG) as [string, { label: string; description: string }][]).map(
            ([key, val]) => (
              <button
                key={key}
                onClick={() => setConfig({ draftMode: key as 'squad_first' | 'position_first' })}
                className={`rounded-2xl p-4 text-center transition-all duration-200 border-2 ${
                  config.draftMode === key
                    ? 'border-[#22c55e] bg-[#22c55e]/10 shadow-lg shadow-[#22c55e]/10'
                    : 'border-[#1a1a2e] bg-[#1a1a2e] hover:border-[#22c55e]/30'
                }`}
              >
                <div className={`font-bold ${
                  config.draftMode === key ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
                }`}>
                  {val.label}
                </div>
                <div className="text-xs text-[#94a3b8] mt-1 leading-relaxed">{val.description}</div>
              </button>
            )
          )}
        </div>
      </div>

      {/* Rating Mode */}
      <div>
        <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">Режим рейтинга</h3>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(RATING_MODE_CONFIG) as [string, { label: string; description: string }][]).map(
            ([key, val]) => (
              <button
                key={key}
                onClick={() => setConfig({ ratingMode: key as 'season' | 'prime' })}
                className={`rounded-2xl p-4 text-center transition-all duration-200 border-2 ${
                  config.ratingMode === key
                    ? 'border-[#22c55e] bg-[#22c55e]/10 shadow-lg shadow-[#22c55e]/10'
                    : 'border-[#1a1a2e] bg-[#1a1a2e] hover:border-[#22c55e]/30'
                }`}
              >
                <div className={`font-bold ${
                  config.ratingMode === key ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
                }`}>
                  {val.label}
                </div>
                <div className="text-xs text-[#94a3b8] mt-1 leading-relaxed">{val.description}</div>
              </button>
            )
          )}
        </div>
      </div>

      {/* Era Filter */}
      <div>
        <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">Эпоха</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(ERA_CONFIG) as [EraFilter, { label: string }][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setConfig({ eraFilter: key })}
              className={`rounded-2xl p-3 text-center transition-all duration-200 border-2 ${
                config.eraFilter === key
                  ? 'border-[#22c55e] bg-[#22c55e]/10 shadow-lg shadow-[#22c55e]/10'
                  : 'border-[#1a1a2e] bg-[#1a1a2e] hover:border-[#22c55e]/30'
              }`}
            >
              <div className={`font-bold text-sm ${
                config.eraFilter === key ? 'text-[#22c55e]' : 'text-[#e2e8f0]'
              }`}>
                {val.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          onClick={handleStart}
          className="w-full h-16 text-xl font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25 transition-all hover:shadow-[#22c55e]/40"
        >
          ⚽ Начать драфт
        </Button>
      </motion.div>
    </div>
  );
}
