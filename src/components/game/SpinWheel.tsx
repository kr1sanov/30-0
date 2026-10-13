'use client';
import { useUiTranslation } from '@/hooks/use-ui-translation';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { RotateCcw, Loader2 } from 'lucide-react';
import { useTelegram } from '@/hooks/use-telegram';
import { Metrics } from '@/lib/metrics';
import type { SpinResult } from '@/lib/types';

/* ─── Colors ─── */
const ACCENT = 'var(--club-primary)';
const BG_CARD = '#141414';

/* ─── RPL data for slot reels ─── */
export const RPL_CLUBS = [
  'Krylya Sovetov Samara',
  'Lokomotiv Moscow',
  'Anzhi Makhachkala',
  'Spartak Moscow',
  'Torpedo Moskva',
  'Zenit St. Petersburg',
  'Kuban Krasnodar',
  'SKA Khabarovsk',
  'Spartak Nalchik',
  'Mordovia Saransk',
  'Akhmat Grozny',
  'Saturn Ramenskoye',
  'Rubin Kazan',
  'FC Moskva',
  'Alania Vladikavkaz',
  'FC Rostov',
  'Tom Tomsk',
  'Amkar Perm',
  'FC Khimki',
  'Arsenal Tula',
  'FC Ufa',
  'Ural Ekaterinburg',
  'Sibir Novosibirsk',
  'Volga',
  'FC Krasnodar',
  'FC Orenburg',
  'FC Tosno',
  'Yenisey Krasnoyarsk',
  'Tambov',
  'Sochi',
  'Nizhny Novgorod',
  'Dynamo Moscow',
  'CSKA Moscow',
  'Shinnik Yaroslavl',
  'Luch-Energiya Vladivostok',
  'Terek Grozny',
  'Torpedo Moscow',
  'FC Moscow',
  'Khimki',
  'Rostov',
  'Zenit Saint Petersburg',
  'Krylia Sovetov Samara',
];

export const RPL_SEASONS = [
  '2006',
  '2007',
  '2008',
  '2009',
  '2010',
  '2011',
  '2012',
  '2013',
  '2014',
  '2015',
  '2016',
  '2017',
  '2018',
  '2019',
  '2020',
  '2021',
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

export function SlotReel({ items, targetItem, isSpinning, hasResult, accentColor, label, resultColor = '#ffffff' }: SlotReelProps) {
  const t = useUiTranslation();
  const reduceMotion = useReducedMotion();
  const [displayItem, setDisplayItem] = useState(items[0] ?? '—');
  const [isStopped, setIsStopped] = useState(false);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    setIsStopped(false);
    if (reduceMotion) {
      setDisplayItem(targetItem ?? '—');
      setIsStopped(hasResult);
      return;
    }
    if (!isSpinning && !hasResult) { setDisplayItem('—'); return; }
    let step = 0;
    const tick = () => {
      if (cancelled) return;
      if (hasResult && targetItem && step >= 6) {
        setDisplayItem(targetItem);
        setIsStopped(true);
        return;
      }
      const candidates = itemsRef.current;
      setDisplayItem(candidates[Math.floor(Math.random() * candidates.length)] ?? '—');
      step++;
      timer = setTimeout(tick, hasResult ? 55 + step * 25 : 65);
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isSpinning, hasResult, targetItem, reduceMotion]);
  const isAnimating = (isSpinning || hasResult) && !isStopped;
  const showGlow = isStopped;

  return (
    <div data-no-translate
      className="min-w-0 flex-1 relative rounded-xl overflow-hidden"
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
        {t(label)}
      </div>

      {/* Reel content area */}
      <div className="relative h-12 flex items-center justify-center overflow-hidden">
        <AnimatePresence initial={false} mode="sync">
          {isAnimating ? (
            <motion.div
              key={displayItem + '-anim'}
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.06, ease: 'linear' }}
              className="text-sm font-black text-center truncate px-2"
              style={{ color: '#9CA3AF' }}
            >
              {displayItem}
            </motion.div>
          ) : isStopped ? (
            <motion.div
              key={displayItem + '-stopped'}
              initial={{ scale: 1.15 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-base font-black text-center truncate px-2"
              style={{
                color: resultColor,
                textShadow: showGlow ? `0 0 14px ${accentColor}60` : 'none',
              }}
            >
              {displayItem}
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
  const t = useUiTranslation();
  return (
    <div data-no-translate
      className="flex-1 rounded-xl px-3 py-2.5 text-center relative"
      style={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f1f' }}
    >
      <div className="text-[8px] uppercase tracking-widest text-[#64748b] font-bold mb-0.5">
        {t(label)}
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
export default function SpinWheel({ multiplayer }: { multiplayer?: {
  currentSpin: SpinResult | null; isSpinning: boolean; rerollsLeft: number; openCount: number;
  disabled: boolean; onSpin: () => Promise<void>; onReroll: () => Promise<void>;
} }) {
  const t = useUiTranslation();
  const store = useGameStore();
  const currentSpin = multiplayer ? multiplayer.currentSpin : store.currentSpin;
  const isSpinning = multiplayer ? multiplayer.isSpinning : store.isSpinning;
  const spin = multiplayer?.onSpin ?? store.spin;
  const reroll = multiplayer?.onReroll ?? store.reroll;
  const rerollsLeft = multiplayer ? multiplayer.rerollsLeft : store.rerollsLeft;
  const slots = store.slots;
  const config = multiplayer ? { ...store.config, difficulty: 'normal' as const, showRatings: true } : store.config;
  const { haptic, notify, selectionChanged } = useTelegram();

  const openCount = multiplayer ? multiplayer.openCount : slots.filter((s) => !s.playerId).length;
  const hasResult = !!currentSpin;

  // Effective showRatings
  const effectiveShowRatings = config.showRatings !== undefined
    ? config.showRatings
    : config.difficulty !== 'hard';

  /* ── User actions ── */
  const handleSpin = useCallback(async () => {
    if (isSpinning || multiplayer?.disabled) return;
    haptic('medium'); // Haptic on spin start
    await spin();
    // Track spin in Metrika after result
    const result = multiplayer?.currentSpin ?? useGameStore.getState().currentSpin;
    if (result) {
      Metrics.spinWheel(result.clubName, result.seasonLabel);
    }
  }, [isSpinning, spin, haptic, multiplayer]);

  const handleReroll = useCallback(async () => {
    if (isSpinning || rerollsLeft <= 0 || multiplayer?.disabled) return;
    haptic('light'); // Haptic on reroll
    await reroll();
  }, [isSpinning, rerollsLeft, reroll, haptic, multiplayer]);

  // Spacebar support & tap-to-spin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target instanceof HTMLElement && (e.target.closest('button, input, textarea, select') || e.target.isContentEditable))) return;
      if (e.code === 'Space' && !hasResult && !isSpinning && !multiplayer?.disabled) {
        e.preventDefault();
        handleSpin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasResult, isSpinning, handleSpin, multiplayer?.disabled]);

  return (
    <section data-no-translate className="rounded-2xl border border-white/10 bg-[#141414] p-3 sm:p-4" aria-busy={isSpinning}>
      <div className="mb-3 flex min-h-6 items-center justify-between gap-2">
        <h2 className="text-sm font-black text-white">{t(hasResult ? 'СОСТАВ ВЫПАЛ' : 'КРУТИТЕ КОЛЕСО')}</h2>
        <span className="text-xs text-slate-400">{openCount}/11</span>
      </div>
      <div className="flex items-center gap-2">
        <SlotReel items={RPL_CLUBS} targetItem={currentSpin?.clubName ?? null} isSpinning={isSpinning} hasResult={hasResult} accentColor="#3b82f6" label="Клуб" />
        <span className="text-slate-600" aria-hidden>×</span>
        <SlotReel items={RPL_SEASONS} targetItem={currentSpin?.seasonLabel ?? null} isSpinning={isSpinning} hasResult={hasResult} accentColor="#fbbf24" label="Сезон" resultColor="#fbbf24" />
      </div>
      <div className="mt-3 min-h-[70px]">
        {isSpinning ? (
          <div role="status" className="flex h-11 items-center justify-center gap-2 text-sm text-slate-300"><Loader2 className="h-4 w-4 animate-spin" />{t('Крутим...')}</div>
        ) : hasResult ? (
          <>
            <p className="mb-2 text-center text-xs text-slate-400">{t('Выбери игрока и позицию, куда его поставить')}</p>
            {rerollsLeft > 0 && <button type="button" onClick={handleReroll} disabled={multiplayer?.disabled} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-300 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />{t('Переброс')} · {rerollsLeft}</button>}
          </>
        ) : (
          <>
            <Button onClick={handleSpin} disabled={isSpinning || multiplayer?.disabled || openCount === 0} className="h-11 w-full rounded-xl text-sm font-black" style={{ backgroundColor: ACCENT, color: 'var(--club-on-primary)' }}>{t('🎰 Крутить')}</Button>
            <p className="mt-2 text-center text-[11px] text-slate-500">{t('Нажми «Крутить» или пробел')}</p>
          </>
        )}
      </div>
    </section>
  );
}
