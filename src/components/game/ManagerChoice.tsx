'use client';

import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { MANAGERS, Manager } from '@/lib/managers';
import { RotateCw, Sparkles, Zap, Dices } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const NATIONALITY_FLAGS: Record<string, string> = {
  'Россия': '🇷🇺',
  'Италия': '🇮🇹',
  'Румыния': '🇷🇴',
  'Испания': '🇪🇸',
  'Сербия': '🇷🇸',
  'Германия': '🇩🇪',
  'Туркменистан': '🇹🇲',
  'Нидерланды': '🇳🇱',
};

function getFlag(nationality: string): string {
  return NATIONALITY_FLAGS[nationality] || '🏳️';
}

/** First letter of the manager's last name (Cyrillic-safe). */
function getInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] || name;
  return last.charAt(0).toUpperCase();
}

type Tier = 'gold' | 'silver' | 'bronze';

function getRatingTier(rating: number): Tier {
  if (rating >= 87) return 'gold';
  if (rating >= 83) return 'silver';
  return 'bronze';
}

function getTierColor(tier: Tier): string {
  switch (tier) {
    case 'gold':
      return '#fbbf24';
    case 'silver':
      return '#cbd5e1';
    case 'bronze':
      return '#f97316';
  }
}

function getTierLabel(tier: Tier): string {
  switch (tier) {
    case 'gold':
      return 'ЛЕГЕНДА';
    case 'silver':
      return 'МАСТЕР';
    case 'bronze':
      return 'ПРОФИ';
  }
}

/* ------------------------------------------------------------------ */
/*  Reel building                                                      */
/* ------------------------------------------------------------------ */

const ITEM_HEIGHT = 56; // px per reel item
const WINDOW_ITEMS = 3; // visible items (prev / current / next)

type ReelMode = 'initial' | 'rating' | 'flag';

function valueForManager(m: Manager, mode: ReelMode): string {
  if (mode === 'initial') return getInitial(m.name);
  if (mode === 'rating') return String(m.rating);
  return getFlag(m.nationality);
}

/**
 * Builds a long list of reel symbols. The target manager's value is
 * placed at `length - 2` so a "next" item remains visible below it,
 * giving the reel a natural stopping position.
 */
function buildReelItems(target: Manager, mode: ReelMode, length: number): string[] {
  const items: string[] = [];
  const targetValue = valueForManager(target, mode);
  // Fill the bulk of the reel with random manager values.
  for (let i = 0; i < length - 2; i++) {
    const m = MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
    items.push(valueForManager(m, mode));
  }
  // Place target second-to-last so the row beneath it is the "next".
  items.push(targetValue);
  // Append one trailing item so the "next" slot is filled.
  const trailing = MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
  items.push(valueForManager(trailing, mode));
  return items;
}

/* ------------------------------------------------------------------ */
/*  Single Reel                                                        */
/* ------------------------------------------------------------------ */

interface ReelProps {
  items: string[];
  /** Index of the item that should land in the middle of the window. */
  targetIndex: number;
  duration: number; // seconds
  spinKey: number; // bump to (re)start the animation
  accent: string;
  isEmoji?: boolean;
  fontSize: number;
}

function Reel({
  items,
  targetIndex,
  duration,
  spinKey,
  accent,
  isEmoji = false,
  fontSize,
}: ReelProps) {
  // item at `targetIndex` should land in the middle of the 3-item window.
  // When y = 0, item 0 is at the top, item 1 in the middle, item 2 at the bottom.
  // So to put item i in the middle: y = -(i - 1) * ITEM_HEIGHT
  const targetY = -(targetIndex - 1) * ITEM_HEIGHT;
  // The parent forces a full remount per spin via `key={spinKey}`, so we
  // can safely start each spin with `stopped = false`.
  const [stopped, setStopped] = useState(false);

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        height: ITEM_HEIGHT * WINDOW_ITEMS,
        background:
          'linear-gradient(180deg, #050509 0%, #15152b 50%, #050509 100%)',
        border: `1px solid ${accent}30`,
        boxShadow: stopped
          ? `inset 0 0 20px ${accent}25, 0 0 12px ${accent}30`
          : 'inset 0 0 12px rgba(0,0,0,0.7)',
        transition: 'box-shadow 0.35s ease',
      }}
    >
      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: ITEM_HEIGHT,
          background:
            'linear-gradient(to bottom, #050509 0%, rgba(5,5,9,0.6) 60%, transparent 100%)',
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: ITEM_HEIGHT,
          background:
            'linear-gradient(to top, #050509 0%, rgba(5,5,9,0.6) 60%, transparent 100%)',
        }}
      />

      {/* Center band highlight */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-20"
        style={{
          top: ITEM_HEIGHT,
          height: ITEM_HEIGHT,
          borderTop: `1px solid ${accent}55`,
          borderBottom: `1px solid ${accent}55`,
          background: `linear-gradient(180deg, ${accent}08, ${accent}12, ${accent}08)`,
        }}
      />

      {/* Scrolling column */}
      <motion.div
        key={spinKey}
        initial={{ y: 0 }}
        animate={{ y: targetY }}
        transition={{
          duration,
          ease: [0.12, 0.78, 0.22, 1], // fast start, long deceleration
        }}
        style={{ willChange: 'transform' }}
        onAnimationComplete={() => setStopped(true)}
      >
        {items.map((item, i) => (
          <div
            key={`${spinKey}-${i}`}
            style={{ height: ITEM_HEIGHT }}
            className="flex items-center justify-center"
          >
            <span
              style={{ fontSize, lineHeight: 1 }}
              className={
                isEmoji ? '' : 'font-black text-[#e2e8f0] tracking-tight'
              }
            >
              {item}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Stop flash */}
      <AnimatePresence>
        {stopped && (
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background: `radial-gradient(ellipse at center, ${accent}35 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Manager pool preview (before first spin)                          */
/* ------------------------------------------------------------------ */

function ManagerPoolPreview() {
  const previewManagers = useMemo(() => MANAGERS.slice(0, 5), []);
  const remaining = MANAGERS.length - previewManagers.length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
        {MANAGERS.length} тренеров доступны
      </div>
      <div className="flex items-center -space-x-2">
        {previewManagers.map((m) => {
          const tier = getRatingTier(m.rating);
          const color = getTierColor(tier);
          return (
            <motion.div
              key={m.id}
              initial={{ scale: 0, x: -10 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 border-[#0d2d0d]"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                color: tier === 'silver' ? '#0a1a0a' : '#0a1a0a',
                boxShadow: `0 0 8px ${color}50`,
              }}
              title={`${m.name} · ${m.rating}`}
            >
              {getInitial(m.name)}
            </motion.div>
          );
        })}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#0d2d0d] bg-[#0a200a] text-[#94a3b8]">
          +{remaining}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slot machine (3 reels spinning)                                   */
/* ------------------------------------------------------------------ */

interface SlotMachineProps {
  target: Manager;
  spinKey: number;
}

function SlotMachine({ target, spinKey }: SlotMachineProps) {
  // Each reel has a different length so they appear to spin at
  // different speeds and stop in sequence: left → middle → right.
  const len1 = 22;
  const len2 = 30;
  const len3 = 40;

  const reel1 = useMemo(
    () => buildReelItems(target, 'initial', len1),
    [target, spinKey],
  );
  const reel2 = useMemo(
    () => buildReelItems(target, 'rating', len2),
    [target, spinKey],
  );
  const reel3 = useMemo(
    () => buildReelItems(target, 'flag', len3),
    [target, spinKey],
  );

  // Durations: reel 1 stops at 0.8s, reel 2 at 1.3s, reel 3 at 1.8s.
  const tier = getRatingTier(target.rating);
  const accent = getTierColor(tier);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-2xl p-4"
      style={{
        background:
          'linear-gradient(180deg, #0a0a14 0%, #0a200a 50%, #0a0a14 100%)',
        border: '1px solid rgba(34, 197, 94, 0.35)',
        boxShadow:
          '0 0 30px rgba(34, 197, 94, 0.15), inset 0 0 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        >
          <Dices className="w-4 h-4 text-[#22c55e]" />
        </motion.div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#22c55e]">
          Ищем тренера…
        </span>
      </div>

      {/* Reels row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center">
          <Reel
            key={`r1-${spinKey}`}
            items={reel1}
            targetIndex={len1 - 2}
            duration={0.8}
            spinKey={spinKey}
            accent={accent}
            fontSize={28}
          />
          <span className="mt-1.5 text-[10px] uppercase tracking-wider text-[#64748b]">
            Имя
          </span>
        </div>
        <div className="flex flex-col items-center">
          <Reel
            key={`r2-${spinKey}`}
            items={reel2}
            targetIndex={len2 - 2}
            duration={1.3}
            spinKey={spinKey}
            accent={accent}
            fontSize={28}
          />
          <span className="mt-1.5 text-[10px] uppercase tracking-wider text-[#64748b]">
            Рейтинг
          </span>
        </div>
        <div className="flex flex-col items-center">
          <Reel
            key={`r3-${spinKey}`}
            items={reel3}
            targetIndex={len3 - 2}
            duration={1.8}
            spinKey={spinKey}
            accent={accent}
            isEmoji
            fontSize={30}
          />
          <span className="mt-1.5 text-[10px] uppercase tracking-wider text-[#64748b]">
            Страна
          </span>
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-3 text-center text-[10px] text-[#64748b]">
        Бонус <span className="text-[#22c55e] font-bold">+2</span> к рейтингу
        команды
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Enhanced Manager Card (post-spin)                                 */
/* ------------------------------------------------------------------ */

function ManagerCard({ manager }: { manager: Manager }) {
  const tier = getRatingTier(manager.rating);
  const color = getTierColor(tier);
  const isJackpot = manager.rating >= 87;

  const firstName = manager.name.split(' ')[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      transition={{ type: 'spring', damping: 16, stiffness: 220 }}
      className="relative rounded-2xl p-5 text-center overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top, ${color}15 0%, transparent 65%), #0a200a`,
        border: `1.5px solid ${color}55`,
        boxShadow: isJackpot
          ? `0 0 40px ${color}55, 0 0 90px ${color}25, inset 0 0 30px ${color}10`
          : manager.rating >= 83
            ? `0 0 25px ${color}40, inset 0 0 20px ${color}08`
            : `0 4px 12px rgba(0,0,0,0.35), inset 0 0 12px ${color}06`,
      }}
    >
      {/* JACKPOT burst for gold-tier managers */}
      <AnimatePresence>
        {isJackpot && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeOut',
                repeatDelay: 0.4,
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${color}55 0%, transparent 65%)`,
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 280 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                color: '#0a1a0a',
              }}
            >
              <Sparkles className="w-3 h-3" />
              <span className="text-[10px] font-black tracking-widest">
                JACKPOT
              </span>
              <Sparkles className="w-3 h-3" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Avatar with rotating gradient ring */}
      <div className="relative inline-block mb-3 mt-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-1.5 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, ${color}, transparent 30%, ${color} 60%, transparent 90%, ${color})`,
            filter: 'blur(1px)',
          }}
        />
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${color}30, #0a1a0a 75%)`,
            border: `2px solid ${color}40`,
          }}
        >
          👨‍💼
        </div>
      </div>

      {/* Name */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xl font-black text-[#e2e8f0] mb-1.5 leading-tight"
      >
        {manager.name}
      </motion.div>

      {/* Nationality + era */}
      <div className="flex items-center justify-center gap-2 mb-3 text-sm flex-wrap">
        <span className="text-xl leading-none">{getFlag(manager.nationality)}</span>
        <span className="text-[#cbd5e1] font-semibold">{manager.nationality}</span>
        <span className="text-[#475569]">·</span>
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{
            background: `${color}18`,
            color,
            border: `1px solid ${color}35`,
          }}
        >
          {manager.era}
        </span>
      </div>

      {/* Rating + tier + bonus */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="flex flex-col items-end">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 280 }}
            className="text-5xl font-black leading-none"
            style={{
              color,
              textShadow: `0 0 20px ${color}70, 0 0 40px ${color}30`,
            }}
          >
            {manager.rating}
          </motion.div>
          <span
            className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
            style={{ color }}
          >
            {getTierLabel(tier)}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[10px] uppercase tracking-wider text-[#64748b]">
            Рейтинг
          </span>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 320, damping: 14 }}
            className="mt-1 px-3 py-1.5 rounded-lg flex items-center gap-1 font-black text-sm"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(34,197,94,0.4)',
            }}
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            +2
          </motion.div>
        </div>
      </div>

      {/* Special ability buff pill */}
      <AnimatePresence>
        {manager.specialAbility && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 280 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
            style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#22c55e]" />
            <span className="text-xs font-bold text-[#22c55e]">
              {manager.specialAbility}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle "play with" preview line */}
      <div className="mt-3 text-[11px] text-[#64748b]">
        Играть с <span className="text-[#94a3b8] font-semibold">{firstName}</span>{' '}
        — бонус к рейтингу команды
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ManagerChoice() {
  const { spinManager, currentManager, isSpinningManager, setScreen } =
    useGameStore();

  const [showSpinAnimation, setShowSpinAnimation] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  // The manager the current reel animation is targeting. Set synchronously
  // when the user clicks spin, so the reels know where to land.
  const [reelTarget, setReelTarget] = useState<Manager | null>(null);

  const handleSpinManager = async () => {
    if (isSpinningManager) return;
    // Pick the manager locally so we can drive the reel animation toward it.
    const target =
      MANAGERS[Math.floor(Math.random() * MANAGERS.length)] || MANAGERS[0];
    setReelTarget(target);
    setShowSpinAnimation(true);
    setSpinKey((k) => k + 1);
    // spinManager sets currentManager = target immediately and keeps
    // isSpinningManager = true for ~1.5s.
    await spinManager(target);
    // Allow the slowest reel (1.8s) to fully stop before revealing the card.
    setTimeout(() => setShowSpinAnimation(false), 450);
  };

  const handleWithManager = () => {
    setScreen('pre-match');
  };

  const handleWithoutManager = () => {
    setScreen('pre-match');
  };

  // Which target should the reels use? Prefer the explicit reelTarget
  // (so reroll animations line up), fall back to currentManager.
  const activeTarget = reelTarget || currentManager;

  return (
    <div className="rounded-2xl bg-[#0d2d0d] p-5 space-y-4 border border-[#0d2d0d]">
      <div className="text-center">
        <h3 className="text-lg font-black text-[#e2e8f0]">
          Играть с тренером?
        </h3>
        <p className="text-xs text-[#94a3b8] mt-1">
          Тренер даёт{' '}
          <span className="text-[#22c55e] font-bold">+2 к рейтингу</span>{' '}
          команды в симуляции
        </p>
      </div>

      {/* Stage: pool preview / slot machine / manager card */}
      <AnimatePresence mode="wait">
        {showSpinAnimation && activeTarget ? (
          <SlotMachine
            key={`slot-${spinKey}`}
            target={activeTarget}
            spinKey={spinKey}
          />
        ) : currentManager ? (
          <ManagerCard key="card" manager={currentManager} />
        ) : (
          <motion.div
            key="pool"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ManagerPoolPreview />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="space-y-2.5">
        {/* Primary action depends on state */}
        {!currentManager && !isSpinningManager && (
          <Button
            onClick={handleSpinManager}
            className="w-full h-14 text-base font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/30 transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
          >
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
              className="inline-block mr-2"
            >
              🎰
            </motion.span>
            Крутить тренера
          </Button>
        )}

        {currentManager && !isSpinningManager && (
          <Button
            onClick={handleWithManager}
            className="w-full h-14 text-base font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 mr-1.5 fill-white" />
            Разведка перед сезоном
          </Button>
        )}

        {currentManager && !isSpinningManager && (
          <Button
            onClick={handleSpinManager}
            disabled={isSpinningManager}
            variant="outline"
            className="w-full h-11 text-sm font-bold border-[#22c55e]/40 text-[#22c55e] hover:bg-[#22c55e]/10 hover:border-[#22c55e]/60 rounded-xl transition-colors"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Крутить ещё раз
          </Button>
        )}

        {currentManager && !isSpinningManager && (
          <button
            onClick={handleWithoutManager}
            className="w-full text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors py-2"
          >
            Без тренера → Разведка
          </button>
        )}

        {/* When no manager and not spinning, show secondary "without manager" link */}
        {!currentManager && !isSpinningManager && (
          <button
            onClick={handleWithoutManager}
            className="w-full text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors py-1.5"
          >
            Без тренера → Разведка
          </button>
        )}
      </div>
    </div>
  );
}
