'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/use-telegram';
import { useSound } from '@/hooks/use-sound';

/* ── Club segment data for the wheel ── */
const SEGMENTS = [
  { name: 'Зенит',          abbr: 'ЗЕН', color: '#0066CC', text: '#FFFFFF' },
  { name: 'Спартак',        abbr: 'СПА', color: '#CC0000', text: '#FFFFFF' },
  { name: 'ЦСКА',           abbr: 'ЦСК', color: '#8B0000', text: '#FFFFFF' },
  { name: 'Локомотив',      abbr: 'ЛОК', color: '#006633', text: '#FFFFFF' },
  { name: 'Краснодар',      abbr: 'КРД', color: '#FF6600', text: '#FFFFFF' },
  { name: 'Динамо',         abbr: 'ДИН', color: '#DEDEDE', text: '#111111' },
  { name: 'Рубин',          abbr: 'РУБ', color: '#6B0020', text: '#FFFFFF' },
  { name: 'Ахмат',          abbr: 'АХМ', color: '#1A7A3A', text: '#FFFFFF' },
  { name: 'Ростов',         abbr: 'РОС', color: '#FFCC00', text: '#111111' },
  { name: 'Урал',           abbr: 'УРА', color: '#E65C00', text: '#FFFFFF' },
  { name: 'Крылья Советов', abbr: 'КС',  color: '#006699', text: '#FFFFFF' },
  { name: 'Торпедо',        abbr: 'ТОР', color: '#1A1A1A', text: '#FFFFFF' },
  { name: 'Факел',          abbr: 'ФАК', color: '#CC3333', text: '#FFFFFF' },
  { name: 'Оренбург',       abbr: 'ОРН', color: '#CC5500', text: '#FFFFFF' },
];

const SPIN_NAMES = SEGMENTS.map(s => s.name);

const CLUB_EMOJIS: Record<string, string> = {
  'Зенит': '🔵',
  'Спартак': '🔴',
  'ЦСКА': '🟥',
  'Локомотив': '🟢',
  'Краснодар': '🟠',
  'Динамо': '⚪',
  'Рубин': '🟤',
  'Ахмат': '🟢',
  'Ростов': '🟡',
  'Урал': '🟠',
  'Крылья Советов': '🟢',
  'Торпедо': '⚫',
  'Факел': '🔴',
  'Оренбург': '🟠',
  'Амкар': '🔴',
  'Сатурн': '🔵',
  'Томь': '🟡',
  'Кубань': '🟡',
  'Алания': '🟡',
};

function getClubEmoji(name: string): string {
  return CLUB_EMOJIS[name] ?? '⚽';
}

/* Particle burst items for spin result reveal */
const BURST_PARTICLES = [
  { emoji: '⚽', x: '50px', y: '-40px' },
  { emoji: '🟢', x: '-45px', y: '-35px' },
  { emoji: '⭐', x: '40px', y: '35px' },
  { emoji: '🎯', x: '-50px', y: '30px' },
  { emoji: '💰', x: '55px', y: '-20px' },
  { emoji: '🏆', x: '-30px', y: '45px' },
  { emoji: '💚', x: '30px', y: '-50px' },
  { emoji: '✨', x: '-55px', y: '-15px' },
  { emoji: '🎰', x: '20px', y: '50px' },
  { emoji: '🌟', x: '-40px', y: '-50px' },
];

/* ── SVG geometry helpers ── */
const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 125;
const SEG_ANGLE = (2 * Math.PI) / SEGMENTS.length;
const SEG_ANGLE_DEG = 360 / SEGMENTS.length;
const NUM_LIGHTS = 28;

function polarXY(angle: number, r: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

/** Build SVG pie-slice path for segment i */
function segPath(i: number) {
  const a0 = i * SEG_ANGLE - Math.PI / 2;
  const a1 = (i + 1) * SEG_ANGLE - Math.PI / 2;
  const p0 = polarXY(a0, RADIUS);
  const p1 = polarXY(a1, RADIUS);
  return `M${CX} ${CY}L${p0.x.toFixed(2)} ${p0.y.toFixed(2)}A${RADIUS} ${RADIUS} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}Z`;
}

/** Text position & rotation for segment i */
function segText(i: number) {
  const mid = (i + 0.5) * SEG_ANGLE - Math.PI / 2;
  const p = polarXY(mid, RADIUS * 0.65);
  const rot = mid * 180 / Math.PI + 90;
  return { x: p.x, y: p.y, rot: rot.toFixed(1) };
}

/** Position of a decorative light dot */
function lightPos(i: number) {
  const a = (i / NUM_LIGHTS) * 2 * Math.PI - Math.PI / 2;
  return polarXY(a, RADIUS + 6);
}

/* ── Component ── */
export default function SpinWheel() {
  const { currentSpin, isSpinning, spin, reroll, rerollsLeft, config, slots } = useGameStore();
  const { haptic } = useTelegram();
  const { play } = useSound();

  /* Wheel animation state */
  const [rotation, setRotation] = useState(0);
  const [isWheelAnimating, setIsWheelAnimating] = useState(false);
  const [needsAnimation, setNeedsAnimation] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [winningIdx, setWinningIdx] = useState<number | null>(null);
  const [lightsPhase, setLightsPhase] = useState(0);
  const tickTimeouts = useRef<number[]>([]);
  const initializedRef = useRef(false);

  const openCount = slots.filter((s) => !s.playerId).length;

  /* ── Tick sound scheduler: decreasing frequency mimics deceleration ── */
  const playTickSounds = useCallback(() => {
    tickTimeouts.current.forEach(clearTimeout);
    tickTimeouts.current = [];
    const count = 24;
    const dur = 2350;
    for (let i = 0; i < count; i++) {
      const t = dur * (1 - Math.pow(1 - i / count, 2.8));
      const id = window.setTimeout(() => {
        try { play('click'); } catch { /* noop */ }
      }, t);
      tickTimeouts.current.push(id);
    }
  }, [play]);

  /* Cleanup timeouts on unmount */
  useEffect(() => () => { tickTimeouts.current.forEach(clearTimeout); }, []);

  /* Alternating lights during spin */
  useEffect(() => {
    if (!isWheelAnimating) return;
    const iv = setInterval(() => setLightsPhase(p => 1 - p), 160);
    return () => clearInterval(iv);
  }, [isWheelAnimating]);

  /* ── Initialise wheel position if currentSpin already exists on mount ── */
  useEffect(() => {
    if (initializedRef.current) return;
    if (currentSpin && !isSpinning) {
      const capturedSpin = currentSpin;
      const timer = window.setTimeout(() => {
        initializedRef.current = true;
        const idx = SEGMENTS.findIndex(s => s.name === capturedSpin.clubName);
        if (idx >= 0) {
          const segCenter = idx * SEG_ANGLE_DEG + SEG_ANGLE_DEG / 2;
          const targetEffective = ((360 - segCenter) % 360 + 360) % 360;
          setRotation(targetEffective);
          setWinningIdx(idx);
          setShowResult(true);
        }
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [currentSpin, isSpinning]);

  /* ── User actions ── */
  const handleSpin = () => {
    haptic('medium');
    play('spin');
    setNeedsAnimation(true);
    spin();
  };

  const handleReroll = () => {
    haptic('light');
    play('reroll');
    setShowResult(false);
    setShowParticles(false);
    setNeedsAnimation(true);
    reroll();
  };

  /* ── Trigger wheel animation when API result arrives ── */
  useEffect(() => {
    if (!needsAnimation || !currentSpin || isSpinning) return;
    const capturedSpin = currentSpin;
    const timer = window.setTimeout(() => {
      setNeedsAnimation(false);
      initializedRef.current = true;

      const idx = SEGMENTS.findIndex(s => s.name === capturedSpin.clubName);
      if (idx < 0) {
        /* Club not on wheel — just reveal immediately */
        setShowResult(true);
        setShowParticles(true);
        return;
      }

      setWinningIdx(idx);
      setShowResult(false);
      setShowParticles(false);

      /* Calculate target rotation so the pointer lands on segment idx */
      const segCenter = idx * SEG_ANGLE_DEG + SEG_ANGLE_DEG / 2;
      const targetEffective = ((360 - segCenter) % 360 + 360) % 360;

      setRotation(prev => {
        const cur = ((prev % 360) + 360) % 360;
        let diff = targetEffective - cur;
        if (diff <= 0) diff += 360;
        const full = (4 + Math.floor(Math.random() * 2)) * 360; // 4-5 full rotations
        return prev + full + diff;
      });

      setIsWheelAnimating(true);
      playTickSounds();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [needsAnimation, currentSpin, isSpinning, playTickSounds]);

  /* ── Transition end: wheel has stopped ── */
  const onTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform') return;
    setIsWheelAnimating(false);
    play('spin_result');
    haptic('heavy');
    setTimeout(() => {
      setShowResult(true);
      setShowParticles(true);
    }, 250);
  }, [play, haptic]);

  const hasResult = !!(currentSpin && !isSpinning && !isWheelAnimating);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-black text-[#e2e8f0]">КРУТИТЬ СОСТАВ</h3>
        <p className="text-xs text-[#94a3b8] mt-1">
          Осталось заполнить: <span className="text-[#22c55e] font-bold">{openCount}</span> позиций
        </p>
      </div>

      {/* ── Wheel Card ── */}
      <div
        className={`relative rounded-2xl bg-[#0d0d1a] p-4 sm:p-6 flex flex-col items-center overflow-hidden transition-shadow duration-500 ${
          isWheelAnimating
            ? 'border border-[#22c55e]/40 shadow-[0_0_50px_rgba(34,197,94,0.2)]'
            : 'border border-[#22c55e]/15 shadow-[0_0_30px_rgba(34,197,94,0.06)]'
        }`}
      >
        {/* Radial glow behind wheel */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isWheelAnimating
              ? 'radial-gradient(circle at 50% 38%, rgba(34,197,94,0.12) 0%, transparent 55%)'
              : 'radial-gradient(circle at 50% 38%, rgba(34,197,94,0.06) 0%, transparent 55%)',
            transition: 'background 0.5s ease',
          }}
        />

        {/* ── Pointer triangle at top ── */}
        <div className="relative z-20 -mb-3">
          <svg width="32" height="26" viewBox="0 0 32 26" className="drop-shadow-[0_2px_10px_rgba(34,197,94,0.8)]">
            <polygon points="16,26 0,0 32,0" fill="#22c55e" />
            <polygon points="16,22 4,2 28,2" fill="#16a34a" />
          </svg>
        </div>

        {/* ── Wheel ── */}
        <div className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]">
          {/* Rotating wrapper — transition drives the spin animation */}
          <div
            className="w-full h-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isWheelAnimating
                ? 'transform 2.5s cubic-bezier(0.12, 0.8, 0.14, 1)'
                : 'none',
              willChange: isWheelAnimating ? 'transform' : 'auto',
            }}
            onTransitionEnd={onTransitionEnd}
          >
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full">
              <defs>
                <filter id="segGlow">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e1e3a" />
                  <stop offset="100%" stopColor="#0d0d1a" />
                </radialGradient>
              </defs>

              {/* Outer decorative ring — alternating gold/dark segments */}
              {Array.from({ length: SEGMENTS.length }, (_, i) => {
                const a0 = i * SEG_ANGLE - Math.PI / 2;
                const a1 = (i + 1) * SEG_ANGLE - Math.PI / 2;
                const p0 = polarXY(a0, RADIUS + 16);
                const p1 = polarXY(a1, RADIUS + 16);
                const p2 = polarXY(a1, RADIUS + 8);
                const p3 = polarXY(a0, RADIUS + 8);
                return (
                  <path
                    key={`ring-${i}`}
                    d={`M${p0.x.toFixed(2)} ${p0.y.toFixed(2)}A${RADIUS + 16} ${RADIUS + 16} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}L${p2.x.toFixed(2)} ${p2.y.toFixed(2)}A${RADIUS + 8} ${RADIUS + 8} 0 0 0 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}Z`}
                    fill={i % 2 === 0 ? '#FFD700' : '#0d2d0d'}
                    opacity={i % 2 === 0 ? 0.6 : 0.8}
                  />
                );
              })}

              {/* Outer decorative ring */}
              <circle
                cx={CX} cy={CY} r={RADIUS + 12}
                fill="none"
                stroke="rgba(34,197,94,0.1)"
                strokeWidth="5"
              />

              {/* Segment slices */}
              {SEGMENTS.map((seg, i) => {
                const isWinner = showResult && winningIdx === i;
                return (
                  <g key={`seg-${i}`}>
                    <path
                      d={segPath(i)}
                      fill={seg.color}
                      stroke="#0a1a0a"
                      strokeWidth="1.5"
                      style={isWinner ? { filter: 'url(#segGlow)' } : undefined}
                    />
                    {/* Winner green overlay */}
                    {isWinner && (
                      <path
                        d={segPath(i)}
                        fill="rgba(34,197,94,0.18)"
                        stroke="#22c55e"
                        strokeWidth="2.5"
                        style={{ boxShadow: '0 0 40px rgba(34,197,94,0.5)' }}
                      >
                        <animate
                          attributeName="stroke-opacity"
                          values="0.5;1;0.5"
                          dur="1.2s"
                          repeatCount="indefinite"
                        />
                      </path>
                    )}
                  </g>
                );
              })}

              {/* Segment abbreviation labels */}
              {SEGMENTS.map((seg, i) => {
                const { x, y, rot } = segText(i);
                return (
                  <text
                    key={`lbl-${i}`}
                    x={x.toFixed(2)}
                    y={y.toFixed(2)}
                    transform={`rotate(${rot},${x.toFixed(2)},${y.toFixed(2)})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={seg.text}
                    fontSize="11"
                    fontWeight="900"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    style={{ letterSpacing: '0.5px' }}
                  >
                    {seg.abbr}
                  </text>
                );
              })}

              {/* Decorative lights around the edge */}
              {Array.from({ length: NUM_LIGHTS }, (_, i) => {
                const p = lightPos(i);
                const isLit = (i + lightsPhase) % 2 === 0;
                return (
                  <circle
                    key={`light-${i}`}
                    cx={p.x.toFixed(2)}
                    cy={p.y.toFixed(2)}
                    r="3.2"
                    fill={isLit ? '#FFD700' : '#2a2a3a'}
                    opacity={isLit ? 0.95 : 0.3}
                  >
                    {isLit && isWheelAnimating && (
                      <animate
                        attributeName="opacity"
                        values="0.6;1;0.6"
                        dur="0.4s"
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>
                );
              })}

              {/* Center hub */}
              <circle cx={CX} cy={CY} r="30" fill="url(#centerGrad)" stroke="#22c55e" strokeWidth="2.5" />
              <circle cx={CX} cy={CY} r="23" fill="#0d0d1a" stroke="rgba(34,197,94,0.2)" strokeWidth="1" />
              <text
                x={CX}
                y={CY + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="20"
              >
                ⚽
              </text>
            </svg>
          </div>

          {/* Winning glow ring (doesn't rotate, overlays the wheel) */}
          <AnimatePresence>
            {showResult && winningIdx !== null && (
              <motion.div
                key="glow-ring"
                className="absolute inset-0 pointer-events-none rounded-full"
                initial={{ opacity: 0, boxShadow: '0 0 0px rgba(34,197,94,0)' }}
                animate={{
                  opacity: 1,
                  boxShadow: '0 0 30px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.15)',
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Particle burst ── */}
        {showParticles && hasResult && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {BURST_PARTICLES.map((p, i) => (
              <span
                key={i}
                className="absolute text-lg animate-particle-burst"
                style={{
                  '--burst-x': p.x,
                  '--burst-y': p.y,
                } as React.CSSProperties}
              >
                {p.emoji}
              </span>
            ))}
          </div>
        )}

        {/* ── Result area (below wheel) ── */}
        <div className="min-h-[100px] flex items-center justify-center mt-2 w-full">
          <AnimatePresence mode="wait">
            {isWheelAnimating && (
              <motion.div
                key="wheel-spinning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="text-sm text-[#22c55e] font-bold animate-pulse">Крутим колесо...</div>
              </motion.div>
            )}

            {hasResult && !isWheelAnimating && (
              <motion.div
                key="result-reveal"
                initial={{ opacity: 0, scale: 0.4, y: 15 }}
                animate={{
                  opacity: showResult ? 1 : 0,
                  scale: showResult ? 1 : 0.4,
                  y: showResult ? 0 : 15,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="text-center"
              >
                <motion.div
                  className="text-3xl mb-1"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={showResult ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                >
                  {getClubEmoji(currentSpin.clubName)}
                </motion.div>
                <div
                  className={`text-xl sm:text-2xl font-black text-[#e2e8f0] ${showResult ? 'animate-club-glow' : ''}`}
                >
                  {currentSpin.clubName}
                </div>
                <motion.div
                  className="text-base text-[#22c55e] font-bold mt-1"
                  initial={{ opacity: 0, y: 8 }}
                  animate={showResult ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  {currentSpin.seasonLabel}
                </motion.div>
                <motion.div
                  className="text-xs text-[#94a3b8] mt-1"
                  initial={{ opacity: 0 }}
                  animate={showResult ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  {currentSpin.players.length} игроков в составе
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading hint while API pending (before wheel starts) */}
          {isSpinning && !isWheelAnimating && !hasResult && (
            <div className="text-xs text-[#94a3b8] animate-pulse">Подготовка колеса...</div>
          )}

          {/* Idle state (no spin yet) */}
          {!currentSpin && !isSpinning && !isWheelAnimating && (
            <div className="text-sm text-[#94a3b8]">Нажмите кнопку, чтобы крутить колесо</div>
          )}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      {isWheelAnimating ? (
        <div className="text-center text-sm text-[#22c55e] font-bold animate-pulse py-1">
          🎰 Колесо крутится...
        </div>
      ) : hasResult ? (
        rerollsLeft > 0 ? (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleReroll}
              variant="outline"
              className="reroll-hover w-full h-12 text-sm font-bold border-[#22c55e]/40 text-[#22c55e] hover:bg-[#22c55e]/10 rounded-2xl transition-all"
            >
              <span className={isSpinning ? 'animate-spin-reroll' : 'reroll-icon inline-block'}>🔄</span> Переброс ({rerollsLeft} осталось)
            </Button>
          </motion.div>
        ) : null
      ) : (
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full h-14 text-lg font-black bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25 disabled:opacity-50 transition-all btn-3d-push"
          >
            {isSpinning ? '🎰 Крутится...' : '🎰 Крутить колесо'}
          </Button>
        </motion.div>
      )}

      {/* Rerolls Counter */}
      <div className="text-center text-xs text-[#94a3b8]">
        Перебросы: <span className="font-bold text-[#22c55e]">{rerollsLeft}</span>/{config.difficulty === 'easy' ? 3 : config.difficulty === 'normal' ? 1 : 0}
      </div>
    </div>
  );
}
