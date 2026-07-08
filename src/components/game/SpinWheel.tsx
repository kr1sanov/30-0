'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Loader2 } from 'lucide-react';

/* ─── Colors ─── */
const ACCENT = '#00C896';
const BG_CARD = '#141414';

/* ─── RPL data for slot reels ─── */
const RPL_CLUBS = [
  'Зенит', 'Спартак', 'ЦСКА', 'Локомотив', 'Краснодар', 'Рубин',
  'Динамо', 'Ахмат', 'Крылья Советов', 'Ростов', 'Урал', 'Оренбург',
  'Уфа', 'Тамбов', 'Сочи', 'Факел', 'Химки', 'Нижний Новгород',
  'Арсенал', 'Торпедо', 'Кубань', 'Волга', 'Сатурн', 'Алания',
];

const RPL_SEASONS = [
  '2024/25', '2023/24', '2022/23', '2021/22', '2020/21', '2019/20',
  '2018/19', '2017/18', '2016/17', '2015/16', '2014/15', '2013/14',
  '2012/13', '2011/12', '2010/11', '2009/10', '2008/09', '2007/08',
  '2006/07', '2005/06', '2004/05', '2003/04', '2002/03', '2001/02',
  '2000/01', '1999/00', '1998/99', '1997/98', '1996/97', '1995/96',
  '1994/95', '1993/94', '1992/93',
];

/* ─── SlotReel: shows one reel (club or season) with slot-machine animation ─── */
interface SlotReelProps {
  items: string[];
  targetItem: string | null;
  isSpinning: boolean;
  hasResult: boolean;
  accentColor: string;
  label: string;
  resultColor?: string;
}

function SlotReel({ items, targetItem, isSpinning, hasResult, accentColor, label, resultColor = '#ffffff' }: SlotReelProps) {
  const [displayItems, setDisplayItems] = useState<string[]>([items[0]]);
  const [isStopped, setIsStopped] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'decelerating' | 'stopped'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fast cycling phase: rapidly show random items
  useEffect(() => {
    if (isSpinning && !hasResult && phase === 'idle') {
      setPhase('spinning');
      setIsStopped(false);
      setShowGlow(false);
    }
  }, [isSpinning, hasResult, phase]);

  // Spinning: cycle through items rapidly (60-80ms intervals)
  useEffect(() => {
    if (phase !== 'spinning') return;

    let interval = 60;
    const cycle = () => {
      if (phase !== 'spinning') return;
      const randomIdx = Math.floor(Math.random() * items.length);
      setDisplayItems([items[randomIdx]]);
      timerRef.current = setTimeout(cycle, interval);
    };
    cycle();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, items]);

  // Deceleration: slow down and land on target with smooth 600-1200ms roll
  useEffect(() => {
    if (hasResult && targetItem && phase === 'spinning') {
      setPhase('decelerating');

      // Clear spinning timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      let interval = 80;
      let steps = 0;
      const maxSteps = 12;

      const decelerate = () => {
        if (steps >= maxSteps) {
          setDisplayItems([targetItem]);
          setIsStopped(true);
          setPhase('stopped');
          setTimeout(() => setShowGlow(true), 100);
          return;
        }
        // Last 3 steps: show items near the target for drama
        if (steps >= maxSteps - 3) {
          const targetIdx = items.indexOf(targetItem);
          const offset = maxSteps - steps;
          const idx = (targetIdx + offset) % items.length;
          setDisplayItems([items[idx >= 0 ? idx : 0]]);
        } else {
          const randomIdx = Math.floor(Math.random() * items.length);
          setDisplayItems([items[randomIdx]]);
        }
        steps++;
        // Progressive slow down: 80 → 130 → 190 → 260 → 340 → ... → ~700ms total
        interval += 40 + steps * 10;
        timerRef.current = setTimeout(decelerate, interval);
      };
      decelerate();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hasResult, targetItem, items, phase]);

  // Reset when idle
  useEffect(() => {
    if (!isSpinning && !hasResult) {
      setPhase('idle');
      setIsStopped(false);
      setShowGlow(false);
    }
  }, [isSpinning, hasResult]);

  const isAnimating = phase === 'spinning' || phase === 'decelerating';

  return (
    <div
      className="flex-1 relative rounded-xl overflow-hidden"
      style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f1f' }}
    >
      {/* Gradient overlays at top and bottom for depth effect */}
      <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

      {/* Accent line in the middle (selection indicator) */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 z-10 pointer-events-none"
        style={{
          borderTop: `1px solid ${accentColor}40`,
          borderBottom: `1px solid ${accentColor}40`,
          background: `linear-gradient(180deg, transparent, ${accentColor}08, transparent)`,
        }}
      />

      {/* Label */}
      <div className="relative z-20 text-[8px] uppercase tracking-widest text-[#64748b] font-bold text-center pt-2.5 pb-1">
        {label}
      </div>

      {/* Reel content area */}
      <div className="relative h-12 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {isAnimating ? (
            <motion.div
              key={displayItems[0] + '-anim'}
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.06, ease: 'linear' }}
              className="text-sm font-black text-center truncate px-2"
              style={{ color: '#9CA3AF' }}
            >
              {displayItems[0]}
            </motion.div>
          ) : isStopped ? (
            <motion.div
              key={displayItems[0] + '-stopped'}
              initial={{ scale: 1.15 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-base font-black text-center truncate px-2"
              style={{
                color: resultColor,
                textShadow: showGlow ? `0 0 14px ${accentColor}60` : 'none',
              }}
            >
              {displayItems[0]}
            </motion.div>
          ) : (
            <div className="text-sm font-black text-[#64748b]/50">—</div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom spacer */}
      <div className="h-2" />
    </div>
  );
}

/* ─── Empty Field Display (idle state) ─── */
function EmptyField({ label, value, onClear }: { label: string; value: string | null; onClear?: () => void }) {
  return (
    <div
      className="flex-1 rounded-xl px-3 py-2.5 text-center relative"
      style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f1f' }}
    >
      <div className="text-[8px] uppercase tracking-widest text-[#64748b] font-bold mb-0.5">
        {label}
      </div>
      {value ? (
        <div className="flex items-center justify-center gap-1">
          <span className="text-sm font-black text-white">{value}</span>
          {onClear && (
            <button
              onClick={onClear}
              className="text-[#64748b] hover:text-[#FFFFFF] transition-colors text-xs ml-1"
              aria-label="Очистить"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm font-black text-[#64748b]/40">—</div>
      )}
    </div>
  );
}

/**
 * SpinWheel — 38-0 style slot-machine spin component.
 */
export default function SpinWheel() {
  const { currentSpin, isSpinning, spin, reroll, rerollsLeft, slots, config, skipSpin } =
    useGameStore();

  const openCount = slots.filter((s) => !s.playerId).length;
  const hasResult = !!currentSpin;

  // Effective showRatings
  const effectiveShowRatings = config.showRatings !== undefined
    ? config.showRatings
    : config.difficulty !== 'hard';

  /* ── User actions ── */
  const handleSpin = useCallback(async () => {
    if (isSpinning) return;
    await spin();
  }, [isSpinning, spin]);

  const handleReroll = useCallback(async () => {
    if (isSpinning || rerollsLeft <= 0) return;
    await reroll();
  }, [isSpinning, rerollsLeft, reroll]);

  // Spacebar support & tap-to-spin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !hasResult && !isSpinning) {
        e.preventDefault();
        handleSpin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasResult, isSpinning, handleSpin]);

  return (
    <div className="space-y-3">
      {/* ── Spin Section ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: BG_CARD, border: '1px solid #1f1f1f' }}
      >
        <AnimatePresence mode="wait">
          {/* ── Idle / No spin yet — with header ── */}
          {!hasResult && !isSpinning && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              {/* SPIN FOR A SQUAD header */}
              <div className="text-center mb-3">
                <div className="text-lg font-black text-white mb-0.5">
                  КРУТИТЕ КОЛЕСО
                </div>
                <div className="text-sm text-[#9CA3AF]">
                  <span className="font-bold" style={{ color: ACCENT }}>{openCount}</span>{' '}
                  позиций осталось заполнить
                </div>
              </div>

              {/* Empty Club × Season fields */}
              <div className="flex items-center gap-2 mb-4">
                <EmptyField label="Клуб" value={null} />
                <span className="text-[#64748b]/40 font-bold text-lg shrink-0">×</span>
                <EmptyField label="Сезон" value={null} />
              </div>

              {/* Spin Button */}
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="w-full h-12 text-base font-black text-white rounded-xl transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: ACCENT,
                    boxShadow: `0 4px 20px ${ACCENT}40`,
                  }}
                >
                  Крутить
                </Button>
              </motion.div>
              <p className="text-[11px] text-[#64748b] text-center mt-2">
                Крутить колесо или нажмите в любом месте
              </p>
            </motion.div>
          )}

          {/* ── Spinning: Slot machine reels ── */}
          {isSpinning && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <div className="flex items-center gap-2">
                <SlotReel
                  items={RPL_CLUBS}
                  targetItem={currentSpin?.clubName ?? null}
                  isSpinning={isSpinning}
                  hasResult={!!currentSpin}
                  accentColor="#3b82f6"
                  label="Клуб"
                  resultColor="#ffffff"
                />

                {/* × separator */}
                <span className="text-[#64748b]/40 font-bold text-lg shrink-0">×</span>

                <SlotReel
                  items={RPL_SEASONS}
                  targetItem={currentSpin?.seasonLabel ?? null}
                  isSpinning={isSpinning}
                  hasResult={!!currentSpin}
                  accentColor="#fbbf24"
                  label="Сезон"
                  resultColor="#fbbf24"
                />
              </div>
              <div className="flex items-center justify-center mt-3 gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: ACCENT }} />
                <span className="text-xs text-[#9CA3AF]">Крутим...</span>
              </div>
            </motion.div>
          )}

          {/* ── Result: Squad Spun ── */}
          {hasResult && !isSpinning && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="p-4"
            >
              <div
                className="text-[10px] uppercase tracking-[0.2em] font-bold text-center mb-2"
                style={{ color: ACCENT }}
              >
                СОСТАВ ВЫПАЛ
              </div>

              {/* Club × Season banner */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="flex-1 rounded-xl px-3 py-2.5 text-center"
                  style={{ backgroundColor: '#0a0a0a', border: '1px solid #3b82f6/20' }}
                >
                  <div className="text-[8px] uppercase tracking-widest text-[#64748b] font-bold mb-0.5">
                    Клуб
                  </div>
                  <div className="text-lg font-black text-white">
                    {currentSpin!.clubName}
                  </div>
                </div>

                <span className="text-[#64748b]/40 font-bold text-lg">×</span>

                <div
                  className="flex-1 rounded-xl px-3 py-2.5 text-center"
                  style={{ backgroundColor: '#0a0a0a', border: '1px solid #fbbf24/20' }}
                >
                  <div className="text-[8px] uppercase tracking-widest text-[#64748b] font-bold mb-0.5">
                    Сезон
                  </div>
                  <div className="text-base font-black text-[#fbbf24]">
                    {currentSpin!.seasonLabel}
                  </div>
                </div>
              </div>

              {/* Instruction */}
              <p className="text-xs text-[#9CA3AF] text-center mb-3">
                Выберите игрока и позицию, куда его поставить
              </p>

              {/* Re-roll button */}
              {rerollsLeft > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReroll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold border border-[#fbbf24]/40 text-[#fbbf24] rounded-xl hover:bg-[#fbbf24]/10 transition-all mb-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Переброс ({rerollsLeft} ост.)
                </motion.button>
              )}

              {/* "Крутить снова" removed — use the reroll button instead */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
