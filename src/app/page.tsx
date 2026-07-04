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
import SeasonAwards from '@/components/game/SeasonAwards';
import PreMatchAnalysis from '@/components/game/PreMatchAnalysis';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import ProfileScreen from '@/components/game/ProfileScreen';
import AchievementUnlocked from '@/components/game/AchievementUnlocked';
import { toast } from 'sonner';
import { canFillSlot } from '@/lib/positions';
import type { Position } from '@/lib/positions';
import { useTelegramAuth } from '@/hooks/use-telegram-auth';
import { useTelegram } from '@/hooks/use-telegram';
import { useAuthStore } from '@/store/authStore';

/* ─── Step data ─── */
const STEPS = [
  { title: 'Крути колесо', desc: 'Колесо фортуны выбирает реальный клуб и сезон РПЛ' },
  { title: 'Выбери игрока', desc: 'Бери игрока из состава этого клуба в свою команду' },
  { title: 'Собери XI', desc: 'Повторяй, пока все 11 позиций не будут заполнены' },
  { title: 'Сыграй сезон', desc: 'Симулируй 30 матчей — сможешь ли добиться 30-0?' },
];

/* ─── Game Modes data ─── */
const GAME_MODES = [
  { emoji: '⚔️', title: 'Классика', desc: 'Собери величайшую сборную РПЛ всех времён', active: true, color: '#3b82f6' },
  { emoji: '🏟️', title: 'Один клуб', desc: 'Собери лучшую сборную из истории одного клуба', active: true, color: '#3b82f6' },
  { emoji: '⚽', title: 'Ежедневный челлендж', desc: 'Новая головоломка каждый день', active: false, color: '#22c55e', badge: 'СКОРО' },
  { emoji: '🏆', title: 'Кубок наций', desc: 'Собери сборную одной нации и выиграй кубок', active: false, color: '#f59e0b', badge: 'СКОРО' },
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
function StatsCounter({ value, label, color = 'text-[#22c55e]' }: { value: string; label: string; color?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

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
      <div className="text-xs text-[#94a3b8] mt-1">{label}</div>
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
        <div className="rounded-2xl bg-[#0d2d0d] p-8 text-center border border-[#1a3a1a]">
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
                className="rounded-xl bg-[#0d2d0d] p-3 border border-[#1a3a1a] flex items-center gap-3"
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
                    {h.teamName && (
                      <span className="text-[9px] text-[#94a3b8]/50 truncate">⚽ {h.teamName}</span>
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

/* ─── Home Page ─── */
function HomePage() {
  const { setScreen, profileStats, runId, resumeGame } = useGameStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="space-y-4 pb-8">
      {/* ── Hero Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col items-center justify-center text-center space-y-2 pt-1"
      >
        {/* Hero container — simple, clean */}
        <div className="relative rounded-3xl p-3 sm:p-5 overflow-hidden">
          {/* Green radial glow behind title */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.12) 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10">
            {/* Animated Score Counter */}
            <div className="relative inline-block">
              <h1 className="text-7xl sm:text-9xl font-black leading-none" style={{ textShadow: '0 0 30px rgba(34,197,94,0.3), 0 0 60px rgba(34,197,94,0.1)' }}>
                <AnimatedCounter target={30} duration={350} delay={0} />
                <span className="text-[#22c55e]">-</span>
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05, duration: 0.25, type: 'spring', stiffness: 300 }}
                  className="inline-block animate-zero-pulse"
                  style={{ textShadow: '0 0 30px rgba(34,197,94,0.3), 0 0 60px rgba(34,197,94,0.1)' }}
                >
                  0
                </motion.span>
              </h1>
              {/* Framer Motion bouncing football — very subtle */}
              <motion.div
                className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 text-2xl sm:text-3xl opacity-[0.12]"
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  times: [0, 0.4, 0.7, 1],
                }}
              >
                ⚽
              </motion.div>
            </div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              className="text-xl sm:text-3xl font-black text-white mt-2"
            >
              Составьте символическую сборную лучших российских команд всех времен
            </motion.p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Button
            onClick={() => setScreen('setup')}
            className="h-12 sm:h-14 px-8 sm:px-12 text-base sm:text-lg font-bold bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#22c55e] hover:to-[#16a34a] text-white rounded-xl transition-colors active:scale-[0.97] btn-inner-shimmer"
          >
            Играть →
          </Button>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="h-10 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-semibold text-white/80 border-2 border-white/20 rounded-xl transition-colors hover:border-[#22c55e]/50 hover:text-[#22c55e] active:scale-[0.97]"
          >
            Как это работает?
          </button>
        </div>

        {/* Resume draft button */}
        {runId && (
          <button
            onClick={resumeGame}
            className="btn-inner-shimmer bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-xl px-6 py-2.5 text-sm font-medium transition-all active:scale-[0.97]"
          >
            ▶ Продолжить драфт
          </button>
        )}
      </motion.div>

      {/* ── Game Modes Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0]">
          Игровые режимы
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {GAME_MODES.map((mode, i) => (
            <motion.button
              key={mode.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              onClick={() => {
                if (mode.active) {
                  setScreen('setup');
                } else {
                  toast('Скоро!');
                }
              }}
              className={`relative rounded-xl p-4 text-left border transition-all overflow-hidden group ${
                mode.active
                  ? 'bg-[#0d2d0d] border-[#1a3a1a] hover:border-[#22c55e]/30 shadow-[0_0_15px_rgba(34,197,94,0.08)]'
                  : 'bg-[#0d2d0d]/60 border-[#1a3a1a]/50 opacity-70'
              }`}
            >
              {/* Badge for coming soon */}
              {!mode.active && mode.badge && (
                <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f59e0b] text-[#0a1a0a]">
                  {mode.badge}
                </span>
              )}

              <div className="text-2xl mb-2" style={{ filter: mode.active ? 'none' : 'grayscale(0.3)' }}>
                {mode.emoji}
              </div>
              <div className="text-sm font-semibold text-[#e2e8f0] mb-1">{mode.title}</div>
              <div className="text-xs text-[#9ca3af] leading-relaxed">{mode.desc}</div>

              {/* Right arrow for active card */}
              {mode.active && (
                <div className="absolute bottom-3 right-3 text-[#22c55e]/50 group-hover:text-[#22c55e] transition-colors">
                  →
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── How to Play Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="space-y-3"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0]">
          Как играть
        </h2>
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="flex items-center gap-3 rounded-xl bg-[#0d2d0d] p-3 border border-[#1a3a1a]"
            >
              {/* Green numbered circle */}
              <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#e2e8f0]">{step.title}</div>
                <div className="text-xs text-[#9ca3af] leading-relaxed">{step.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Section divider */}
      <div className="section-divider" />

      {/* ── Stats Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass-stats-card rounded-2xl p-4"
      >
        <div className="grid grid-cols-3 gap-4">
          <StatsCounter value="16" label="клубов" color="text-[#22c55e]" />
          <StatsCounter value="5000+" label="игроков" color="text-[#e2e8f0]" />
          <StatsCounter value="1992-2026" label="сезонов" color="text-[#22c55e]" />
        </div>
      </motion.div>

      {/* Section divider */}
      <div className="section-divider" />

      {/* ── Popular Challenges ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0] mb-2">
          Челленджи
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CHALLENGES.map((ch) => {
            const isCompleted = ch.checkFn(profileStats);
            const progress = ch.progressFn(profileStats);

            return (
              <motion.button
                key={ch.title}
                onClick={() => setScreen('setup')}
                whileTap={{ scale: 0.97 }}
                className={`relative rounded-xl p-4 text-left border-l-4 border-r border-t border-b border-[#1a3a1a] card-glow transition-all hover:scale-[1.02] overflow-hidden ${ch.gradientClass} ${isCompleted ? 'challenge-completed' : ''}`}
                style={{ borderLeftColor: ch.emoji === '🔥' ? '#ef4444' : ch.emoji === '🛡️' ? '#3b82f6' : ch.emoji === '⚡' ? '#fbbf24' : '#22c55e' }}
              >
                {/* Emoji with bounce on hover */}
                <motion.div
                  className="text-xl mb-2 inline-block"
                  whileHover={{ scale: 1.3, rotate: 10 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {ch.emoji}
                </motion.div>
                <div className="text-sm font-bold text-[#e2e8f0] mb-1">{ch.title}</div>
                <div className="text-xs text-[#9ca3af]">{ch.desc}</div>

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

      {/* ── Recent Results (hidden) ── */}
      {/* <div className="section-divider" />
      <RecentResults /> */}

      {/* ── FAQ Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="space-y-3"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0] mb-2">
          Частые вопросы
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl bg-[#0d2d0d] border border-[#1a3a1a] overflow-hidden px-5 card-glow"
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
  const { config, rerollsLeft, currentSpin, selectedPlayer, resetGame, startRun, lastConfig, slots, movingPlayerSlotIndex, finishMoving, lastAssignedSlotIndex, undoLastPick, lastDraftState, justAssignedSlotIndex } = useGameStore();
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [lastPlacedInfo, setLastPlacedInfo] = useState<{ name: string; position: string } | null>(null);
  const spinWheelRef = useRef<HTMLDivElement>(null);
  const prevLastAssignedSlot = useRef(lastAssignedSlotIndex);

  const maxRerolls = config.difficulty === 'easy' ? 3 : config.difficulty === 'normal' ? 1 : 0;
  const openCount = slots.filter((s) => !s.playerId).length;
  const isMoving = movingPlayerSlotIndex !== null;

  // Compute average rating
  const filledSlots = slots.filter((s) => s.playerId && s.playerRating);
  const avgRating = filledSlots.length > 0
    ? Math.round(filledSlots.reduce((a, s) => a + (s.playerRating ?? 0), 0) / filledSlots.length)
    : null;

  // Compute category ratings (like 38-0)
  const CATEGORY_LABELS_LOCAL: Record<string, string> = { gk: 'ВР', def: 'Защита', mid: 'Полузащита', att: 'Атака' };
  const CATEGORY_COLORS_LOCAL: Record<string, string> = { gk: '#f97316', def: '#3b82f6', mid: '#22c55e', att: '#ef4444' };

  const categoryRatings: Record<string, { total: number; count: number }> = { gk: { total: 0, count: 0 }, def: { total: 0, count: 0 }, mid: { total: 0, count: 0 }, att: { total: 0, count: 0 } };
  const POSITION_CATEGORY_LOCAL: Record<string, 'gk' | 'def' | 'mid' | 'att'> = {
    'ВР': 'gk', 'ЦЗ': 'def', 'ПЗ': 'def', 'ЛЗ': 'def', 'ПФЗ': 'def', 'ЛФЗ': 'def',
    'ОП': 'mid', 'ЦП': 'mid', 'АП': 'mid', 'ЛП': 'mid', 'ПП': 'mid',
    'ЛВ': 'att', 'ПВ': 'att', 'НП': 'att', 'ЦН': 'att',
  };
  slots.forEach((slot) => {
    const cat = POSITION_CATEGORY_LOCAL[slot.position] ?? 'mid';
    if (slot.playerRating) {
      const r = slot.isCompatible !== false ? slot.playerRating : Math.round(slot.playerRating * 0.8);
      categoryRatings[cat].total += r;
      categoryRatings[cat].count++;
    }
  });

  // Auto-scroll: when player is assigned, scroll to spin button for next spin
  // This is the ONLY auto-scroll — removed scroll-to-players and scroll-to-pitch
  // to prevent competing scroll effects that caused jittering.
  useEffect(() => {
    if (lastAssignedSlotIndex !== null && lastAssignedSlotIndex !== prevLastAssignedSlot.current) {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          spinWheelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }, 800);
      prevLastAssignedSlot.current = lastAssignedSlotIndex;
      return () => clearTimeout(timer);
    }
    prevLastAssignedSlot.current = lastAssignedSlotIndex;
  }, [lastAssignedSlotIndex]);

  // Show "player placed" success banner briefly
  useEffect(() => {
    if (justAssignedSlotIndex !== null && justAssignedSlotIndex >= 0) {
      const slot = slots[justAssignedSlotIndex];
      if (slot?.playerName) {
        // Use microtask to avoid synchronous setState in effect
        const info = { name: slot.playerName, position: slot.positionLabel };
        queueMicrotask(() => {
          setLastPlacedInfo(info);
        });
        const timer = setTimeout(() => setLastPlacedInfo(null), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [justAssignedSlotIndex, slots]);

  const handleRestart = async () => {
    setShowRestartModal(false);
    resetGame();
    if (lastConfig) {
      useGameStore.setState({ config: lastConfig });
    }
    setTimeout(() => {
      startRun();
    }, 100);
  };

  function getRatingColor(rating: number): string {
    if (rating >= 78) return '#fbbf24';
    if (rating >= 73) return '#22c55e';
    if (rating >= 68) return '#f97316';
    return '#ef4444';
  }

  return (
    <div className="space-y-3 animate-fade-in pb-24 sm:pb-4">
      {/* ── Header: Formation + Rerolls + Restart ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#e2e8f0] tracking-wide bg-[#1a3a1a] px-2 py-1 rounded-lg">{config.formation}</span>
          <span className="text-[10px] text-[#64748b]">{openCount} поз. осталось</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#fbbf24] font-bold flex items-center gap-1">
            🔄 {rerollsLeft}/{maxRerolls}
          </span>
          {lastDraftState && (
            <button
              onClick={undoLastPick}
              className="text-[10px] px-2 py-1 rounded-lg bg-[#f97316]/10 text-[#f97316] font-bold hover:bg-[#f97316]/20 transition-colors"
              title="Отменить последний выбор"
            >
              ↩ Отмена
            </button>
          )}
          <button
            onClick={() => setShowRestartModal(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors shrink-0"
            title="Начать заново"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Selected Player Instruction Banner ── */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 px-3 py-2 flex items-center gap-2"
          >
            <span className="text-[#22c55e] text-xs font-bold">👉</span>
            <span className="text-xs text-[#22c55e] font-medium">
              Выберите позицию для <strong>{selectedPlayer.fullName}</strong> ниже или на поле
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Player Placed Success Banner ── */}
      <AnimatePresence>
        {lastPlacedInfo && !selectedPlayer && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/40 px-3 py-2 flex items-center gap-2"
          >
            <span className="text-[#22c55e] text-xs font-bold">✅</span>
            <span className="text-xs text-[#22c55e] font-medium">
              <strong>{lastPlacedInfo.name}</strong> → {lastPlacedInfo.position}
            </span>
            <span className="text-[10px] text-[#94a3b8] ml-auto">
              {openCount} поз. осталось
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pitch / Formation View ── */}
      <div data-pitch-section>
        <FormationView />
      </div>

      {/* ── Move a Player Button ── */}
      {filledSlots.length >= 2 && !selectedPlayer && (
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (isMoving) {
                finishMoving();
              }
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              isMoving
                ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20'
                : 'bg-[#0d2d0d] border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10'
            }`}
          >
            {isMoving ? '✓ Завершить' : '↔ Переместить игрока'}
          </motion.button>
        </div>
      )}
      {isMoving && (
        <p className="text-[10px] text-[#94a3b8] text-center">
          Нажмите на занятую позицию, затем на другую для обмена
        </p>
      )}

      {/* ── Squad Stats Panel (38-0 style, compact) ── */}
      <div className="rounded-xl bg-[#0d1a0d] border border-[#1a3a1a]/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase tracking-widest text-[#64748b] font-bold">Рейтинг</span>
          <span className="text-xl font-black" style={{ color: avgRating ? getRatingColor(avgRating) : '#64748b' }}>
            {avgRating ?? '—'}
          </span>
        </div>
        <div className="space-y-1.5">
          {['att', 'mid', 'def', 'gk'].map((cat) => {
            const r = categoryRatings[cat];
            const avg = r.count > 0 ? Math.round(r.total / r.count) : 0;
            return (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-[10px] text-[#94a3b8] w-16 shrink-0">{CATEGORY_LABELS_LOCAL[cat]}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#1a2a1a] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: r.count > 0 ? `${(avg / 99) * 100}%` : '0%' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS_LOCAL[cat] }}
                  />
                </div>
                <span className="text-[10px] font-bold text-[#e2e8f0] w-5 text-right">
                  {r.count > 0 ? avg : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Spin Section ── */}
      <div ref={spinWheelRef}>
        <SpinWheel />
      </div>

      {/* ── Player List ── */}
      <div>
        {currentSpin && <PlayerList />}
      </div>

      {/* ── Restart Modal ── */}
      <AnimatePresence>
        {showRestartModal && (
          <motion.div
            key="restart-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRestartModal(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm rounded-2xl bg-[#0d2d0d] border border-[#1a3a1a] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-[#e2e8f0] mb-2">Начать новый драфт?</h3>
              <p className="text-sm text-[#94a3b8] mb-6">
                Перезапуск происходит немедленно с теми же настройками. Ваш текущий черновик будет потерян.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRestartModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#94a3b8] bg-[#0a1a0a] border border-[#1a3a1a] hover:bg-[#0d2d0d] transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleRestart}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#22c55e] hover:bg-[#16a34a] transition-colors shadow-lg shadow-[#22c55e]/20"
                >
                  Перезапуск
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Squad Complete Screen ─── */
function SquadCompleteScreen() {
  const { slots, config, simulate, currentManager, resetGame } = useGameStore();

  // Calculate squad stats for pre-season odds
  const POSITION_CATEGORY_LOCAL: Record<string, 'gk' | 'def' | 'mid' | 'att'> = {
    'ВР': 'gk', 'ЦЗ': 'def', 'ПЗ': 'def', 'ЛЗ': 'def', 'ПФЗ': 'def', 'ЛФЗ': 'def',
    'ОП': 'mid', 'ЦП': 'mid', 'АП': 'mid', 'ЛП': 'mid', 'ПП': 'mid',
    'ЛВ': 'att', 'ПВ': 'att', 'НП': 'att', 'ЦН': 'att',
  };

  const filledSlots = slots.filter((s) => s.playerId && s.playerRating);
  const overallRating = filledSlots.length > 0
    ? Math.round(filledSlots.reduce((a, s) => a + (s.playerRating ?? 0), 0) / filledSlots.length)
    : 0;

  // Manager bonus
  const managerBonus = currentManager?.rating ? 2 : 0;
  const effectiveRating = overallRating + managerBonus;

  // Pre-season odds calculation (simplified based on rating)
  const projectedPosition = effectiveRating >= 80 ? 1 : effectiveRating >= 76 ? 2 : effectiveRating >= 72 ? 3 : effectiveRating >= 68 ? 5 : effectiveRating >= 64 ? 8 : 12;
  const expectedPoints = Math.round(effectiveRating * 1.8 + Math.random() * 10);
  const winLeaguePct = Math.min(99, Math.max(1, Math.round((effectiveRating - 55) * 3)));
  const top4Pct = Math.min(99, Math.max(winLeaguePct + 20, 30));
  const top6Pct = Math.min(99, Math.max(top4Pct + 15, 50));
  const top10Pct = Math.min(99, Math.max(top6Pct + 10, 70));
  const relegationPct = Math.max(0, Math.round(100 - top10Pct - 20));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-5xl mb-3"
        >
          🏆
        </motion.div>
        <h2 className="text-2xl font-black text-[#e2e8f0]">Состав готов!</h2>
        <p className="text-sm text-[#94a3b8] mt-1">Все 11 позиций заполнены</p>
      </div>

      <FormationView />

      {/* Pre-season odds — 38-0 style */}
      <div className="rounded-2xl bg-[#0d1a0d] border border-[#1a3a1a]/60 p-4 space-y-4">
        <h3 className="text-sm font-bold text-[#e2e8f0]">📊 Предсезонные шансы</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#1a2a1a] p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold mb-1">Прогноз места</div>
            <div className="text-2xl font-black text-[#fbbf24]">{projectedPosition}</div>
          </div>
          <div className="rounded-xl bg-[#1a2a1a] p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold mb-1">Ожидаемые очки</div>
            <div className="text-2xl font-black text-[#22c55e]">{expectedPoints}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          {[
            { label: 'Выиграть чемпионат', pct: winLeaguePct, color: '#fbbf24' },
            { label: 'Топ-4', pct: top4Pct, color: '#22c55e' },
            { label: 'Топ-6', pct: top6Pct, color: '#3b82f6' },
            { label: 'Топ-10', pct: top10Pct, color: '#94a3b8' },
            { label: 'Вылет', pct: relegationPct, color: '#ef4444' },
          ].map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#94a3b8]">{label}</span>
                <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#1a2a1a] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-[#64748b] text-center">
          На основе общего рейтинга {overallRating} {managerBonus > 0 ? `+ ${managerBonus} бонус тренера` : ''}
        </p>
      </div>

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
          className="rounded-2xl bg-[#0d2d0d] p-10 text-center border border-[#1a3a1a]"
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
                    : 'bg-[#0d2d0d] border-[#1a3a1a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-10 h-10 rounded-xl bg-[#0a1a0a]/50 flex items-center justify-center shrink-0">
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
const SCREEN_ORDER = ['home', 'setup', 'draft', 'position-assign', 'squad-complete', 'pre-match', 'manager-choice', 'simulation', 'result', 'awards'];

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
  const { screen, setTelegramUser, telegramUser, loadProfileFromCloud } = useGameStore();
  const prevScreen = useRef(screen);
  const [direction, setDirection] = useState(0);

  // Initialize Telegram auth and hooks
  useTelegramAuth();
  const { haptic, notify } = useTelegram();
  const authUser = useAuthStore((s) => s.user);

  // Initialize Telegram WebApp on mount and set gameStore's telegramUser
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp;
      webapp.ready();
      webapp.expand();

      const tgUser = webapp.initDataUnsafe?.user;
      if (tgUser && !telegramUser) {
        setTelegramUser({
          id: tgUser.id,
          first_name: tgUser.first_name || '',
          last_name: tgUser.last_name,
          username: tgUser.username,
          photo_url: tgUser.photo_url,
          language_code: tgUser.language_code,
        });
        // Load profile from cloud after setting Telegram user
        setTimeout(() => {
          loadProfileFromCloud();
        }, 500);
      }
    }
  }, [setTelegramUser, telegramUser, loadProfileFromCloud]);

  // Sync auth store user to game store for cloud sync (handles edge case where
  // initDataUnsafe is not available but auth API succeeded)
  useEffect(() => {
    if (authUser && authUser.id !== 'guest' && authUser.telegramId && !telegramUser) {
      setTelegramUser({
        id: Number(authUser.telegramId),
        first_name: authUser.firstName || '',
        last_name: authUser.lastName || undefined,
        username: authUser.username || undefined,
        photo_url: authUser.photoUrl || undefined,
      });
    }
  }, [authUser, telegramUser, setTelegramUser]);

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
        return <DraftScreen />;
      case 'squad-complete':
        return <SquadCompleteScreen />;
      case 'pre-match':
        return <PreMatchAnalysis />;
      case 'simulation':
        return <SimulationScreen />;
      case 'result':
        return <SimulationResult />;
      case 'awards':
        return <SeasonAwards />;
      case 'profile':
        return <ProfileScreen />;
      case 'leaderboard':
        return <LeaderboardScreen />;
      default:
        return <HomePage />;
    }
  }, [screen]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0a1a0a]">
      {/* Semi-transparent football field background */}
      <div className="football-field-bg" />
      <Header />
      <main className="flex-1 w-full max-w-lg mx-auto px-3 sm:px-4 py-2 sm:py-4 pb-20 sm:pb-6 relative z-10 overflow-y-auto">
        {renderScreen()}
      </main>
      <Footer />
      <AchievementUnlocked />
    </div>
  );
}
