'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GameSetup from '@/components/game/GameSetup';
import FormationView from '@/components/game/FormationView';
import SpinWheel from '@/components/game/SpinWheel';
import PlayerList from '@/components/game/PlayerList';
import SquadStats from '@/components/game/SquadStats';
import SimulationResult from '@/components/game/SimulationResult';
import ManagerChoice from '@/components/game/ManagerChoice';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import ProfileScreen from '@/components/game/ProfileScreen';
import DraftProgressTracker from '@/components/game/DraftProgressTracker';

/* ─── Icon helpers (inline SVGs) ─── */
function RotateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" /><path d="M21 3v9h-9" />
    </svg>
  );
}
function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

/* ─── Step data ─── */
const STEPS = [
  { icon: RotateIcon, title: 'Крути колесо', desc: 'Колесо фортуны выбирает реальный клуб и сезон РПЛ' },
  { icon: UserPlusIcon, title: 'Выбери игрока', desc: 'Бери игрока из состава этого клуба в свою команду' },
  { icon: UsersIcon, title: 'Собери XI', desc: 'Повторяй, пока все 11 позиций не будут заполнены' },
  { icon: TrophyIcon, title: 'Сыграй сезон', desc: 'Симулируй 30 матчей — сможешь ли добиться 30-0?' },
];

interface ChallengeDef {
  emoji: string;
  title: string;
  desc: string;
  gradientClass: string;
  checkFn: (stats: { perfect: number; totalGoals: number; totalSeasons: number; bestRecord: string }) => boolean;
  progressFn: (stats: { perfect: number; totalGoals: number; totalSeasons: number; bestRecord: string }) => number;
}

const CHALLENGES: ChallengeDef[] = [
  {
    emoji: '🔥',
    title: '30-0',
    desc: 'Выиграйте все 30 матчей сезона',
    gradientClass: 'challenge-gradient-fire',
    checkFn: (s) => s.perfect > 0,
    progressFn: (s) => {
      if (s.perfect > 0) return 100;
      if (s.totalSeasons === 0) return 0;
      const best = s.bestRecord || '0-0-0';
      const wins = parseInt(best.split('-')[0] || '0', 10);
      return Math.round((wins / 30) * 100);
    },
  },
  {
    emoji: '🛡️',
    title: 'Железная защита',
    desc: 'Пропустите менее 15 голов за сезон',
    gradientClass: 'challenge-gradient-shield',
    checkFn: (s) => s.achievements?.includes('iron_defense') ?? false,
    progressFn: (s) => {
      if (s.achievements?.includes('iron_defense')) return 100;
      if (s.totalSeasons === 0) return 0;
      return Math.min(60, s.totalSeasons * 20);
    },
  },
  {
    emoji: '⚡',
    title: 'Голая атака',
    desc: 'Забейте 60+ голов за сезон',
    gradientClass: 'challenge-gradient-bolt',
    checkFn: (s) => s.achievements?.includes('goal_machine') ?? false,
    progressFn: (s) => {
      if (s.achievements?.includes('goal_machine')) return 100;
      if (s.totalSeasons === 0) return 0;
      return Math.min(70, Math.round((s.totalGoals / Math.max(1, s.totalSeasons)) / 60 * 100));
    },
  },
  {
    emoji: '🎯',
    title: 'Минималист',
    desc: 'Соберите состав без перебросов',
    gradientClass: 'challenge-gradient-target',
    checkFn: (s) => s.achievements?.includes('minimalist') ?? false,
    progressFn: (s) => {
      if (s.achievements?.includes('minimalist')) return 100;
      if (s.totalSeasons === 0) return 0;
      return Math.min(50, s.totalSeasons * 15);
    },
  },
];

const FAQ_ITEMS = [
  { q: 'Что такое 30-0?', a: '30-0 — это футбольный драфт-симулятор РПЛ. Вы крутите колесо, получаете случайный клуб и сезон, выбираете игрока в свой состав, а затем симулируете сезон. Цель — выиграть все 30 матчей и достичь идеального результата 30-0.' },
  { q: 'Как работают позиции?', a: 'У каждого игрока есть основная и дополнительные позиции. Игрок может играть на совместимых позициях без штрафов, на частично совместимых — с понижением рейтинга на 20%, а на несовместимых — не может быть поставлен вообще.' },
  { q: 'Что такое перебросы?', a: 'Перебросы позволяют вам крутить колесо заново, если вам не понравился выпавший клуб. На лёгкой сложности — 3 переброса, на нормальной — 1, на сложной — 0.' },
  { q: 'Как считается рейтинг состава?', a: 'Рейтинг каждого игрока зависит от выбранного режима: сезонный (рейтинг в конкретном сезоне) или прайм (лучший рейтинг за карьеру). Общий рейтинг команды — среднее всех игроков.' },
  { q: 'Сложно ли достичь 30-0?', a: 'Очень сложно! Это требует идеального подбора игроков и немного удачи. Даже с лучшим составом РПЛ есть вероятность неожиданных результатов. Это и делает игру увлекательной!' },
];

/* ─── Animated Score Counter ─── */
function AnimatedCounter({ target, duration = 1000, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  const [count, setCount] = useState(0);
  const [flashed, setFlashed] = useState(false);
  const hasPlayed = useRef(false);

  useEffect(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    const timeout = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutExpo
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setCount(Math.round(eased * target));
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setFlashed(true);
          setTimeout(() => setFlashed(false), 600);
        }
      };
      requestAnimationFrame(step);
    }, delay);

    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return (
    <span className={flashed ? 'animate-number-flash' : ''}>
      {count}
    </span>
  );
}

/* ─── Stats Counter with useInView ─── */
/* Parses "5000+" -> target=5000, suffix="+"
 * Falls back to static display for multi-number values like "1992-2026" */
function StatsCounter({ value, label, color = 'text-[#22c55e]' }: { value: string; label: string; color?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // Match exactly one integer in the string (first occurrence). For ranges like "1992-2026", returns null.
  const match = value.match(/^[^\d]*(\d+)([^\d]*)$/);
  const prefix = match ? value.slice(0, value.indexOf(match[1])) : '';
  const targetNum = match ? parseInt(match[1], 10) : 0;
  const suffix = match ? match[2] : '';
  const canAnimate = targetNum > 0 && targetNum <= 100000;
  const [displayNum, setDisplayNum] = useState(canAnimate ? 0 : targetNum);

  useEffect(() => {
    if (!isInView || !canAnimate) return;
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayNum(Math.round(eased * targetNum));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, canAnimate, targetNum]);

  return (
    <div ref={ref} className="text-center">
      <div className={`text-2xl sm:text-3xl font-black ${color}`}>
        {canAnimate && isInView ? `${prefix}${displayNum}${suffix}` : value}
      </div>
      <div className="text-xs text-[#94a3b8]">{label}</div>
    </div>
  );
}

/* ─── Recent Results Section ─── */
function RecentResults() {
  const { profileStats, setScreen } = useGameStore();
  const recentSeasons = profileStats.history.slice(-3).reverse();

  const DIFF_BADGE: Record<string, { bg: string; text: string; label: string }> = {
    easy: { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]', label: 'Легко' },
    normal: { bg: 'bg-[#f97316]/15', text: 'text-[#f97316]', label: 'Нормально' },
    hard: { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]', label: 'Сложно' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.55 }}
      className="space-y-4"
    >
      <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0]">
        📈 Последние результаты
      </h2>

      {recentSeasons.length === 0 ? (
        <div className="rounded-2xl bg-[#1a1a2e] p-8 text-center border border-[#1a1a2e]">
          <div className="text-3xl mb-2">⚽</div>
          <div className="text-sm text-[#94a3b8]">Сыграйте первый сезон!</div>
          <Button
            onClick={() => setScreen('setup')}
            variant="outline"
            className="mt-3 border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10 hover:text-[#22c55e] rounded-xl"
          >
            Начать игру
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {recentSeasons.map((h, i) => {
            const diff = DIFF_BADGE[h.difficulty] || DIFF_BADGE.normal;
            const posEmoji = h.position === 1 ? '🥇' : h.position === 2 ? '🥈' : h.position === 3 ? '🥉' : '';
            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-[#1a1a2e] p-3 border border-[#1a1a2e] flex items-center gap-3"
              >
                {/* Formation badge */}
                <div className="w-12 h-12 rounded-lg bg-[#3b82f6]/15 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-[#3b82f6]">{h.formation}</span>
                </div>

                {/* W-D-L */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] font-bold">{h.wins}В</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f97316]/15 text-[#f97316] font-bold">{h.draws}Н</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444] font-bold">{h.losses}П</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${diff.bg} ${diff.text}`}>
                      {diff.label}
                    </span>
                    {h.managerName && (
                      <span className="text-[9px] text-[#94a3b8]/50 truncate">👨‍💼 {h.managerName}</span>
                    )}
                  </div>
                </div>

                {/* Points & Position */}
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-[#22c55e]">{h.points}</div>
                  <div className="text-[10px] text-[#94a3b8]">
                    {posEmoji} {h.position} место
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Floating particles data ─── */
const PARTICLES = [
  { emoji: '⚽', size: 'text-lg', top: '8%', left: '6%', anim: 'animate-float-organic-1', delay: '0s' },
  { emoji: '🏆', size: 'text-xl', top: '15%', right: '10%', anim: 'animate-float-organic-2', delay: '0.5s' },
  { emoji: '⭐', size: 'text-sm', top: '35%', left: '3%', anim: 'animate-float-organic-3', delay: '1s' },
  { emoji: '💚', size: 'text-base', bottom: '30%', right: '5%', anim: 'animate-float-organic-1', delay: '1.5s' },
  { emoji: '⚽', size: 'text-sm', top: '60%', left: '12%', anim: 'animate-float-organic-2', delay: '2s' },
  { emoji: '🏆', size: 'text-base', bottom: '15%', right: '18%', anim: 'animate-float-organic-3', delay: '2.5s' },
  { emoji: '⭐', size: 'text-xs', top: '20%', left: '20%', anim: 'animate-float-organic-1', delay: '3s' },
  { emoji: '💚', size: 'text-sm', bottom: '40%', left: '8%', anim: 'animate-float-organic-2', delay: '3.5s' },
  { emoji: '⚽', size: 'text-lg', top: '45%', right: '8%', anim: 'animate-float-organic-3', delay: '4s' },
  { emoji: '⭐', size: 'text-xs', bottom: '20%', right: '25%', anim: 'animate-float-organic-1', delay: '4.5s' },
];

/* ─── Home Page ─── */
function HomePage() {
  const { setScreen, profileStats } = useGameStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="space-y-16 pb-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center justify-center text-center space-y-6 pt-8"
      >
        {/* Hero container with noise, scanlines, and animated gradient border */}
        <div className="relative rounded-3xl p-8 sm:p-12 border-2 animate-border-gradient-shift overflow-hidden noise-overlay scanlines">
          {/* Green radial glow behind title */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.15) 0%, transparent 60%)',
            }}
          />

          {/* Enhanced floating particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {PARTICLES.map((p, i) => (
              <span
                key={i}
                className={`absolute ${p.size} ${p.anim}`}
                style={{
                  top: p.top,
                  left: p.left,
                  right: p.right,
                  bottom: p.bottom,
                  animationDelay: p.delay,
                }}
              >
                {p.emoji}
              </span>
            ))}
          </div>

          <div className="relative z-10">
            {/* Animated Score Counter */}
            <div className="relative inline-block">
              <h1 className="text-7xl sm:text-9xl font-black text-gradient-green leading-none">
                <AnimatedCounter target={30} duration={1000} delay={200} />
                <span className="text-[#1a1a2e]">-</span>
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3, duration: 0.5, type: 'spring', stiffness: 200 }}
                  className="inline-block"
                >
                  0
                </motion.span>
              </h1>
              {/* Framer Motion bouncing football */}
              <motion.div
                className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 text-3xl sm:text-4xl"
                animate={{
                  y: [0, -12, 0],
                  rotate: [0, 15, -15, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  times: [0, 0.4, 0.7, 1],
                }}
              >
                ⚽
              </motion.div>
            </div>

            {/* Subtitle with gradient text */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-2xl sm:text-3xl font-bold text-gradient-subtitle mt-4"
            >
              Футбольный драфт РПЛ
            </motion.p>

            {/* Pulsing underline */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="mx-auto mt-2 h-0.5 w-24 rounded-full bg-gradient-to-r from-transparent via-[#22c55e] to-transparent animate-pulse-underline"
              style={{ transformOrigin: 'center' }}
            />

            {/* Description with delayed fade-in */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.5 }}
              className="text-[#94a3b8] max-w-lg leading-relaxed text-base sm:text-lg mt-3"
            >
              Собери состав из игроков Российской Премьер-Лиги, крутя колесо фортуны.
              Заполни все 11 позиций и сыграй сезон — сможешь ли ты добиться 30-0?
            </motion.p>
          </div>
        </div>

        {/* Play button with gradient glow */}
        <Button
          onClick={() => setScreen('setup')}
          className="h-16 px-14 text-xl font-bold bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white rounded-2xl transition-all hover:scale-105 active:scale-95 animate-button-glow"
        >
          Играть 30-0
        </Button>

        <button
          onClick={() => setShowHowToPlay(true)}
          className="text-sm text-[#94a3b8] hover:text-[#22c55e] transition-colors underline underline-offset-4 decoration-[#94a3b8]/30 hover:decoration-[#22c55e]/50"
        >
          Как играть?
        </button>
      </motion.div>

      {/* How to Play Steps */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="space-y-6"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0]">
          Как играть
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-2xl bg-[#1a1a2e] p-5 text-center border border-[#1a1a2e] card-glow"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#22c55e]/15 flex items-center justify-center">
                <step.icon className="w-6 h-6 text-[#22c55e]" />
              </div>
              <div className="text-xs text-[#22c55e] font-bold mb-1">Шаг {i + 1}</div>
              <div className="text-sm font-bold text-[#e2e8f0] mb-1">{step.title}</div>
              <div className="text-xs text-[#94a3b8] leading-relaxed">{step.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats Section with animated counters */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap"
      >
        <StatsCounter value="~15" label="клубов" color="text-[#22c55e]" />
        <div className="w-px h-8 bg-[#1a1a2e]" />
        <StatsCounter value="5000+" label="игроков" color="text-[#e2e8f0]" />
        <div className="w-px h-8 bg-[#1a1a2e]" />
        <StatsCounter value="1992-2026" label="сезонов" color="text-[#f97316]" />
      </motion.div>

      {/* Popular Challenges */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="space-y-6"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0]">
          Челленджи
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {CHALLENGES.map((ch) => {
            const isCompleted = ch.checkFn(profileStats);
            const progress = ch.progressFn(profileStats);

            return (
              <motion.button
                key={ch.title}
                onClick={() => setScreen('setup')}
                whileTap={{ scale: 0.97 }}
                className={`relative rounded-2xl p-5 text-left border border-[#1a1a2e] card-glow transition-all hover:scale-[1.02] overflow-hidden ${ch.gradientClass} ${isCompleted ? 'challenge-completed' : ''}`}
              >
                {/* Emoji with bounce on hover */}
                <motion.div
                  className="text-2xl mb-2 inline-block"
                  whileHover={{ scale: 1.3, rotate: 10 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {ch.emoji}
                </motion.div>
                <div className="text-sm font-bold text-[#e2e8f0] mb-1">{ch.title}</div>
                <div className="text-xs text-[#94a3b8]">{ch.desc}</div>

                {/* Progress bar */}
                <div className="challenge-progress-bar">
                  <div
                    className="challenge-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Completed green tint overlay */}
                {isCompleted && (
                  <div className="absolute inset-0 bg-[#22c55e]/5 pointer-events-none" />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Results */}
      <RecentResults />

      {/* FAQ Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="space-y-4"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0]">
          Частые вопросы
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-2xl bg-[#1a1a2e] border border-[#1a1a2e] overflow-hidden px-5 card-glow"
            >
              <AccordionTrigger className="text-sm font-bold text-[#e2e8f0] hover:text-[#22c55e] hover:no-underline py-4">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[#94a3b8] leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}

/* ─── Draft Screen ─── */
function DraftScreen() {
  return (
    <div className="space-y-6 animate-fade-in">
      <DraftProgressTracker />
      <FormationView />
      <SpinWheel />
      <PlayerList />
    </div>
  );
}

/* ─── Position Assign Screen ─── */
function PositionAssignScreen() {
  const { selectedPlayer, setScreen, slots } = useGameStore();

  const openCount = slots.filter((s) => !s.playerId).length;

  // Get compatible positions for the info banner
  const mainPos = selectedPlayer?.mainPosition || '';
  const otherPos = selectedPlayer?.otherPositions || [];
  const allPosLabels = [mainPos, ...otherPos].filter(Boolean);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-xl bg-[#1a1a2e] p-4 border border-[#22c55e]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#22c55e]/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#e2e8f0]">
              Выберите позицию для <span className="text-[#22c55e] font-bold">{selectedPlayer?.fullName}</span>
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#22c55e]/15 text-[#22c55e]">
                {selectedPlayer?.rating}
              </span>
              <span className="text-xs text-[#94a3b8]">Позиции:</span>
              {allPosLabels.map((pos) => (
                <span key={pos} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#3b82f6]/15 text-[#3b82f6]">
                  {pos}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#94a3b8] mt-1">Нажмите на свободную позицию на поле ({openCount} осталось)</p>
          </div>
        </div>
        <button
          onClick={() => {
            useGameStore.setState({ selectedPlayer: null });
            setScreen('draft');
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0a0a0f]/50 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#0a0a0f] transition-colors text-sm font-medium"
        >
          🔙 Назад
        </button>
      </div>
      <FormationView />
    </div>
  );
}

/* ─── Squad Complete Screen ─── */
function SquadCompleteScreen() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-5xl mb-3"
        >
          ✅
        </motion.div>
        <h2 className="text-2xl font-black text-[#e2e8f0]">Состав готов!</h2>
        <p className="text-sm text-[#94a3b8] mt-1">Все 11 позиций заполнены</p>
      </div>

      <FormationView />
      <SquadStats />
      <ManagerChoice />
    </div>
  );
}

/* ─── Simulation Screen with shimmer ─── */
function SimulationScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      {/* Shimmer skeleton effect */}
      <div className="w-full max-w-sm space-y-3 mb-4">
        <div className="h-6 rounded-lg shimmer-loading" />
        <div className="h-4 rounded-lg shimmer-loading w-3/4" />
        <div className="h-4 rounded-lg shimmer-loading w-1/2" />
      </div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="text-6xl"
      >
        ⚽
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-[#e2e8f0]"
      >
        Симуляция сезона...
      </motion.div>
      <div className="text-sm text-[#94a3b8]">30 туров, 16 команд, 1 чемпион</div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Profile Screen ─── (moved to component) */

/* ─── Leaderboard Screen ─── */
function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60) return 'только что';
    if (diffMin < 60) return `${diffMin} мин назад`;
    if (diffHour < 24) return `${diffHour} ч назад`;
    if (diffDay < 7) return `${diffDay} дн назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

const DIFFICULTY_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]' },
  normal: { bg: 'bg-[#f97316]/15', text: 'text-[#f97316]' },
  hard: { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]' },
};

const DIFFICULTY_LABELS_MAP: Record<string, string> = {
  easy: 'Легко',
  normal: 'Нормально',
  hard: 'Сложно',
};

function LeaderboardScreen() {
  const { leaderboard, resetGame, setScreen } = useGameStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#e2e8f0]">🏆 Лидерборд</h2>
        <p className="text-sm text-[#94a3b8] mt-1">Лучшие результаты</p>
      </div>

      {leaderboard.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#1a1a2e] p-10 text-center border border-[#1a1a2e]"
        >
          <div className="text-6xl mb-4">🏆</div>
          <div className="text-lg font-bold text-[#e2e8f0] mb-2">Пока нет результатов</div>
          <div className="text-sm text-[#94a3b8] mb-6">Сыграйте первый сезон и попадите в таблицу лидеров!</div>
          <Button
            onClick={() => { resetGame(); setScreen('setup'); }}
            className="h-12 px-8 text-base font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20"
          >
            ⚽ Сыграть сезон
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, idx) => {
            const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
            const diffBadge = DIFFICULTY_BADGE_COLORS[entry.difficulty] || DIFFICULTY_BADGE_COLORS.normal;
            const diffLabel = DIFFICULTY_LABELS_MAP[entry.difficulty] || entry.difficulty;
            const posEmoji = entry.seasonPosition === 1 ? '🥇' : entry.seasonPosition === 2 ? '🥈' : entry.seasonPosition === 3 ? '🥉' : entry.seasonPosition <= 4 ? '🏟️' : '';

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.35 }}
                className={`rounded-2xl p-4 border transition-all hover:scale-[1.01] ${
                  idx === 0
                    ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/20'
                    : idx === 1
                    ? 'bg-gradient-to-r from-gray-400/10 to-gray-400/5 border-gray-400/20'
                    : idx === 2
                    ? 'bg-gradient-to-r from-amber-700/10 to-amber-700/5 border-amber-700/20'
                    : 'bg-[#1a1a2e] border-[#1a1a2e]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-10 h-10 rounded-xl bg-[#0a0a0f]/50 flex items-center justify-center shrink-0">
                    <span className="text-lg">{rankEmoji || <span className="text-sm font-bold text-[#94a3b8]">{idx + 1}</span>}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Formation badge */}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#3b82f6]/15 text-[#3b82f6]">
                        {entry.formation}
                      </span>
                      {/* Difficulty badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffBadge.bg} ${diffBadge.text}`}>
                        {diffLabel}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#94a3b8]/60 mt-1">
                      {getRelativeTime(entry.createdAt)} · Рейтинг: {entry.squadRating || '-'}
                    </div>
                  </div>

                  {/* Points & Position */}
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-black text-[#22c55e]">{entry.seasonPoints}</div>
                    <div className="text-xs text-[#94a3b8]">
                      {posEmoji} {entry.seasonPosition} место
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Button
        onClick={() => { resetGame(); setScreen('setup'); }}
        className="w-full h-14 text-lg font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20"
      >
        ⚽ Сыграть сезон
      </Button>
    </div>
  );
}

/* ─── Screen transition variants ─── */
const SCREEN_ORDER = ['home', 'setup', 'draft', 'position-assign', 'squad-complete', 'manager-choice', 'simulation', 'result'];

function getDirection(from: string, to: string): number {
  // Forward = 1, Backward = -1, Scale = 0
  const scaleScreens = ['profile', 'leaderboard'];
  if (scaleScreens.includes(to) || scaleScreens.includes(from)) return 0;

  const fromIdx = SCREEN_ORDER.indexOf(from);
  const toIdx = SCREEN_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return 1;
  return fromIdx < toIdx ? 1 : -1;
}

const pageVariants = {
  enter: (direction: number) => {
    if (direction === 0) {
      return { opacity: 0, scale: 0.92 };
    }
    return {
      opacity: 0,
      x: direction > 0 ? 80 : -80,
    };
  },
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction: number) => {
    if (direction === 0) {
      return { opacity: 0, scale: 1.08 };
    }
    return {
      opacity: 0,
      x: direction > 0 ? -80 : 80,
    };
  },
};

/* ─── Main Home Component ─── */
export default function Home() {
  const { screen } = useGameStore();
  const prevScreen = useRef(screen);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (prevScreen.current !== screen) {
      setDirection(getDirection(prevScreen.current, screen));
      prevScreen.current = screen;
    }
  }, [screen]);

  const renderScreen = useCallback(() => {
    switch (screen) {
      case 'home':
        return <HomePage />;
      case 'setup':
        return <GameSetup />;
      case 'draft':
        return <DraftScreen />;
      case 'position-assign':
        return <PositionAssignScreen />;
      case 'squad-complete':
        return <SquadCompleteScreen />;
      case 'simulation':
        return <SimulationScreen />;
      case 'result':
        return <SimulationResult />;
      case 'profile':
        return <ProfileScreen />;
      case 'leaderboard':
        return <LeaderboardScreen />;
      default:
        return <HomePage />;
    }
  }, [screen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 pb-20 sm:pb-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={screen}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
