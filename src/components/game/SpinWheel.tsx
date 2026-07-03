'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/use-telegram';
import { useSound } from '@/hooks/use-sound';

/* ── All known RPL club names (for reel filler) ── */
const ALL_CLUBS = [
  'Зенит',
  'Спартак',
  'ЦСКА',
  'Локомотив',
  'Краснодар',
  'Динамо М',
  'Ростов',
  'Рубин',
  'Ахмат',
  'Урал',
  'Крылья Советов',
  'Торпедо',
  'Факел',
  'Оренбург',
  'Пари НН',
  'Химки',
  'Амкар',
  'Сатурн',
  'Томь',
  'Кубань',
  'Алания',
];

/* ── All known season labels (for reel filler) ── */
const ALL_SEASONS = [
  '1992',
  '1993',
  '1994',
  '1995',
  '1996',
  '1997',
  '1998',
  '1999',
  '2000',
  '2001',
  '2002',
  '2003',
  '2004',
  '2005',
  '2006',
  '2007',
  '2008',
  '2009',
  '2010',
  '2011/12',
  '2012/13',
  '2013/14',
  '2014/15',
  '2015/16',
  '2016/17',
  '2017/18',
  '2018/19',
  '2019/20',
  '2020/21',
  '2021/22',
  '2022/23',
  '2023/24',
  '2024/25',
];

/* ── Reel building ── */
const ITEM_HEIGHT = 48;
const WINDOW_ITEMS = 3;
const CLUB_REEL_LENGTH = 28;
const SEASON_REEL_LENGTH = 38;

/** Build random reel items (for initial spinning before target is known) */
function buildRandomReelItems(pool: string[], length: number): string[] {
  const items: string[] = [];
  for (let i = 0; i < length; i++) {
    items.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return items;
}

/** Build reel items with a target value at position length-2 */
function buildTargetReelItems(
  pool: string[],
  target: string,
  length: number,
): string[] {
  const items: string[] = [];
  for (let i = 0; i < length - 2; i++) {
    items.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  items.push(target);
  items.push(pool[Math.floor(Math.random() * pool.length)]);
  return items;
}

/* ── Single Reel ── */
interface ReelProps {
  items: string[];
  targetIndex: number;
  duration: number;
  spinKey: number;
  label: string;
  accentColor?: string;
}

function Reel({
  items,
  targetIndex,
  duration,
  spinKey,
  label,
  accentColor = '#22c55e',
}: ReelProps) {
  const targetY = -(targetIndex - 1) * ITEM_HEIGHT;
  const [stopped, setStopped] = useState(false);

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div
        className="relative overflow-hidden rounded-xl w-full"
        style={{
          height: ITEM_HEIGHT * WINDOW_ITEMS,
          background:
            'linear-gradient(180deg, #050509 0%, #0f1f0f 50%, #050509 100%)',
          border: `1px solid ${stopped ? accentColor + '55' : accentColor + '20'}`,
          boxShadow: stopped
            ? `inset 0 0 16px ${accentColor}20, 0 0 10px ${accentColor}25`
            : 'inset 0 0 10px rgba(0,0,0,0.6)',
          transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
        }}
      >
        {/* Top fade */}
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: ITEM_HEIGHT,
            background:
              'linear-gradient(to bottom, #050509 0%, rgba(5,5,9,0.5) 60%, transparent 100%)',
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: ITEM_HEIGHT,
            background:
              'linear-gradient(to top, #050509 0%, rgba(5,5,9,0.5) 60%, transparent 100%)',
          }}
        />

        {/* Center band highlight */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-20"
          style={{
            top: ITEM_HEIGHT,
            height: ITEM_HEIGHT,
            borderTop: `1px solid ${accentColor}44`,
            borderBottom: `1px solid ${accentColor}44`,
            background: `linear-gradient(180deg, ${accentColor}06, ${accentColor}10, ${accentColor}06)`,
          }}
        />

        {/* Scrolling column */}
        <motion.div
          key={spinKey}
          initial={{ y: 0 }}
          animate={{ y: targetY }}
          transition={{
            duration,
            ease: [0.15, 0.8, 0.2, 1], // fast start, long deceleration
          }}
          style={{ willChange: 'transform' }}
          onAnimationComplete={() => setStopped(true)}
        >
          {items.map((item, i) => (
            <div
              key={`${spinKey}-${i}`}
              style={{ height: ITEM_HEIGHT }}
              className="flex items-center justify-center px-2"
            >
              <span
                className="font-black text-[#e2e8f0] text-sm truncate text-center w-full"
                style={{ lineHeight: 1 }}
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
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 pointer-events-none z-30"
              style={{
                background: `radial-gradient(ellipse at center, ${accentColor}30 0%, transparent 70%)`,
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Label below reel */}
      <span className="mt-1.5 text-[10px] uppercase tracking-wider text-[#64748b] font-bold">
        {label}
      </span>
    </div>
  );
}

/* ── Fast Cycling Reel (used before target is known) ── */
interface FastCyclingReelProps {
  pool: string[];
  spinKey: number;
  label: string;
  accentColor?: string;
}

function FastCyclingReel({
  pool,
  spinKey,
  label,
  accentColor = '#22c55e',
}: FastCyclingReelProps) {
  // Build a long list of items and scroll through them quickly
  const items = useMemo(
    () => buildRandomReelItems(pool, 60),
    [pool, spinKey],
  );
  const targetY = -(60 - 2) * ITEM_HEIGHT;

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div
        className="relative overflow-hidden rounded-xl w-full"
        style={{
          height: ITEM_HEIGHT * WINDOW_ITEMS,
          background:
            'linear-gradient(180deg, #050509 0%, #0f1f0f 50%, #050509 100%)',
          border: `1px solid ${accentColor}20`,
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top fade */}
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: ITEM_HEIGHT,
            background:
              'linear-gradient(to bottom, #050509 0%, rgba(5,5,9,0.5) 60%, transparent 100%)',
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: ITEM_HEIGHT,
            background:
              'linear-gradient(to top, #050509 0%, rgba(5,5,9,0.5) 60%, transparent 100%)',
          }}
        />

        {/* Center band highlight */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-20"
          style={{
            top: ITEM_HEIGHT,
            height: ITEM_HEIGHT,
            borderTop: `1px solid ${accentColor}44`,
            borderBottom: `1px solid ${accentColor}44`,
            background: `linear-gradient(180deg, ${accentColor}06, ${accentColor}10, ${accentColor}06)`,
          }}
        />

        {/* Fast scrolling column */}
        <motion.div
          key={`fast-${spinKey}`}
          initial={{ y: 0 }}
          animate={{ y: targetY }}
          transition={{
            duration: 0.5,
            ease: 'linear',
            repeat: Infinity,
            repeatType: 'loop',
          }}
          style={{ willChange: 'transform' }}
        >
          {items.map((item, i) => (
            <div
              key={`${spinKey}-${i}`}
              style={{ height: ITEM_HEIGHT }}
              className="flex items-center justify-center px-2"
            >
              <span
                className="font-black text-[#e2e8f0] text-sm truncate text-center w-full"
                style={{ lineHeight: 1 }}
              >
                {item}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Label below reel */}
      <span className="mt-1.5 text-[10px] uppercase tracking-wider text-[#64748b] font-bold">
        {label}
      </span>
    </div>
  );
}

/* ── Component ── */
type SpinPhase = 'idle' | 'loading' | 'animating' | 'result';

export default function SpinWheel() {
  const { currentSpin, isSpinning, spin, reroll, rerollsLeft, slots } =
    useGameStore();
  const { haptic } = useTelegram();
  const { play } = useSound();

  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [spinKey, setSpinKey] = useState(0);

  const openCount = slots.filter((s) => !s.playerId).length;

  // Build target reel data when we have a target
  const clubReelItems = useMemo(() => {
    if (!currentSpin || phase !== 'animating') return null;
    return buildTargetReelItems(ALL_CLUBS, currentSpin.clubName, CLUB_REEL_LENGTH);
  }, [currentSpin, phase, spinKey]);

  const seasonReelItems = useMemo(() => {
    if (!currentSpin || phase !== 'animating') return null;
    return buildTargetReelItems(ALL_SEASONS, currentSpin.seasonLabel, SEASON_REEL_LENGTH);
  }, [currentSpin, phase, spinKey]);

  const clubTargetIndex = CLUB_REEL_LENGTH - 2;
  const seasonTargetIndex = SEASON_REEL_LENGTH - 2;

  /* ── Transition from loading → animating when API returns ── */
  useEffect(() => {
    if (phase === 'loading' && currentSpin && !isSpinning) {
      // API returned, switch to animating phase
      const t = setTimeout(() => {
        setSpinKey((k) => k + 1);
        setPhase('animating');
      }, 0);
      return () => clearTimeout(t);
    }
  }, [phase, currentSpin, isSpinning]);

  /* ── Transition from animating → result after reels stop ── */
  useEffect(() => {
    if (phase === 'animating') {
      // Wait for the slowest reel (1.1s) + buffer
      const timer = setTimeout(() => {
        setPhase('result');
      }, 1300);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  /* ── User actions ── */
  const handleSpin = useCallback(async () => {
    if (phase !== 'idle' && phase !== 'result') return;
    haptic('medium');
    play('spin');
    setPhase('loading');
    setSpinKey((k) => k + 1);

    // Start the API call — animation starts immediately in 'loading' phase
    await spin();
    // After spin() completes, currentSpin is set and isSpinning is false
    // The useEffect above will transition to 'animating' phase
  }, [phase, haptic, play, spin]);

  const handleReroll = useCallback(() => {
    if (phase !== 'result') return;
    haptic('light');
    play('reroll');
    setPhase('loading');
    setSpinKey((k) => k + 1);

    reroll().then(() => {
      // The useEffect will handle transition to 'animating'
    });
  }, [phase, haptic, play, reroll]);

  // Determine which phase to show
  const showIdle = phase === 'idle';
  const showLoading = phase === 'loading';
  const showAnimating = phase === 'animating' && clubReelItems && seasonReelItems;
  const showResult = phase === 'result' && currentSpin;
  const isBusy = phase === 'loading' || phase === 'animating';

  return (
    <div className="space-y-3">
      {/* Spin / Result area */}
      <div
        className={`relative rounded-2xl bg-[#0d2d0d] p-4 flex flex-col items-center overflow-hidden transition-all duration-300 border ${
          isBusy
            ? 'border-[#22c55e]/40 shadow-[0_0_20px_rgba(34,197,94,0.12)]'
            : showResult
              ? 'border-[#22c55e]/20'
              : 'border-[#1a3a1a]/50'
        }`}
      >
        <AnimatePresence mode="wait">
          {/* Idle state — no spin yet */}
          {showIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <p className="text-sm text-[#94a3b8] mb-1">
                Осталось заполнить:{' '}
                <span className="text-[#22c55e] font-bold">{openCount}</span>{' '}
                позиций
              </p>
              <p className="text-xs text-[#94a3b8]/60">
                Нажмите кнопку ниже, чтобы крутить
              </p>
            </motion.div>
          )}

          {/* Loading state — fast cycling reels while API is in flight */}
          {showLoading && (
            <motion.div
              key={`loading-${spinKey}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full py-2"
            >
              {/* Header */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <svg
                    className="w-4 h-4 text-[#22c55e]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-9-9c1.7 0 3.3.5 4.6 1.3" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </motion.div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#22c55e]">
                  Крутим...
                </span>
              </div>

              {/* Two fast cycling reels side by side */}
              <div className="flex items-start gap-3 px-2">
                <FastCyclingReel
                  key={`fast-club-${spinKey}`}
                  pool={ALL_CLUBS}
                  spinKey={spinKey}
                  label="Клуб"
                  accentColor="#22c55e"
                />

                {/* × separator */}
                <div className="flex items-center mt-6 text-[#94a3b8]/40 font-bold text-lg">
                  ×
                </div>

                <FastCyclingReel
                  key={`fast-season-${spinKey}`}
                  pool={ALL_SEASONS}
                  spinKey={spinKey}
                  label="Сезон"
                  accentColor="#fbbf24"
                />
              </div>
            </motion.div>
          )}

          {/* Animating state — decelerating reels landing on target */}
          {showAnimating && (
            <motion.div
              key={`animating-${spinKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="w-full py-2"
            >
              {/* Header */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <svg
                    className="w-4 h-4 text-[#22c55e]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-9-9c1.7 0 3.3.5 4.6 1.3" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </motion.div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#22c55e]">
                  Крутим...
                </span>
              </div>

              {/* Two target reels side by side */}
              <div className="flex items-start gap-3 px-2">
                <Reel
                  key={`target-club-${spinKey}`}
                  items={clubReelItems!}
                  targetIndex={clubTargetIndex}
                  duration={0.7}
                  spinKey={spinKey}
                  label="Клуб"
                  accentColor="#22c55e"
                />

                {/* × separator */}
                <div className="flex items-center mt-6 text-[#94a3b8]/40 font-bold text-lg">
                  ×
                </div>

                <Reel
                  key={`target-season-${spinKey}`}
                  items={seasonReelItems!}
                  targetIndex={seasonTargetIndex}
                  duration={1.1}
                  spinKey={spinKey}
                  label="Сезон"
                  accentColor="#fbbf24"
                />
              </div>
            </motion.div>
          )}

          {/* Result reveal */}
          {showResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="text-center py-3 w-full"
            >
              {/* Result cards: CLUB × SEASON */}
              <div className="flex items-center justify-center gap-3 mb-3">
                {/* Club card */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="rounded-xl bg-[#1a1a2e] px-5 py-3 min-w-[120px] text-center border border-[#22c55e]/20"
                >
                  <div className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider mb-1">
                    Клуб
                  </div>
                  <div className="text-base font-black text-white">
                    {currentSpin!.clubName}
                  </div>
                </motion.div>

                {/* × separator */}
                <span className="text-lg text-[#94a3b8]/40 font-bold">×</span>

                {/* Season card */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                    delay: 0.1,
                  }}
                  className="rounded-xl bg-[#1a1a2e] px-5 py-3 min-w-[100px] text-center border border-[#fbbf24]/20"
                >
                  <div className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider mb-1">
                    Сезон
                  </div>
                  <div className="text-base font-black text-[#fbbf24]">
                    {currentSpin!.seasonLabel}
                  </div>
                </motion.div>
              </div>

              <p className="text-xs text-[#94a3b8]">
                Выберите игрока из состава
              </p>

              {/* Reroll button */}
              {rerollsLeft > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReroll}
                  disabled={isBusy}
                  className="mt-2 px-4 py-1.5 text-xs font-bold border border-[#22c55e]/40 text-[#22c55e] rounded-xl hover:bg-[#22c55e]/10 transition-all"
                >
                  Переброс ({rerollsLeft})
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Spin Button ── */}
      {!showResult && (
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleSpin}
            disabled={isBusy}
            className="w-full h-12 text-base font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25 disabled:opacity-50 transition-all"
          >
            {isBusy ? 'Крутим...' : 'Крутить'}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
