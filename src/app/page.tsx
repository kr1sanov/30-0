'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import Header from '@/components/layout/Header';
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
  { emoji: '🏟️', title: 'Один клуб', desc: 'Собери лучшую сборную из истории одного клуба', active: false, color: '#3b82f6', badge: 'СКОРО' },
  { emoji: '⚽', title: 'Ежедневный челлендж', desc: 'Новая головоломка каждый день', active: false, color: '#00C896', badge: 'СКОРО' },
  { emoji: '🏆', title: 'Кубок наций', desc: 'Собери сборную одной нации и выиграй кубок', active: false, color: '#f59e0b', badge: 'СКОРО' },
];

interface ChallengeDef {
  emoji: string;
  title: string;
  desc: string;
  gradientClass: string;
  checkFn: (stats: { perfect: number; totalGoals: number; totalSeasons: number; bestRecord: string; achievements?: string[] }) => boolean;
  progressFn: (stats: { perfect: number; totalGoals: number; totalSeasons: number; bestRecord: string; achievements?: string[] }) => number;
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
function StatsCounter({ value, label, color = 'text-[#00C896]' }: { value: string; label: string; color?: string }) {
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
      <div className="text-xs text-[#9CA3AF] mt-1">{label}</div>
    </div>
  );
}

/* ─── Recent Results Section ─── */
function RecentResults() {
  const { profileStats, setScreen } = useGameStore();
  const recentSeasons = profileStats.history.slice(-3).reverse();

  const DIFF_BADGE: Record<string, { bg: string; text: string; label: string }> = {
    easy: { bg: 'bg-[#00C896]/15', text: 'text-[#00C896]', label: 'Легко' },
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
      <h2 className="text-2xl sm:text-3xl font-black text-center text-[#FFFFFF]">
        📈 Последние результаты
      </h2>

      {recentSeasons.length === 0 ? (
        <div className="rounded-2xl bg-[#141414] p-8 text-center border border-[#1E1E1E]">
          <div className="text-3xl mb-2">⚽</div>
          <div className="text-sm text-[#9CA3AF]">Сыграйте первый сезон!</div>
          <Button
            onClick={() => setScreen('setup')}
            variant="outline"
            className="mt-3 border-[#00C896]/30 text-[#00C896] hover:bg-[#00C896]/10 hover:text-[#00C896] rounded-xl"
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
                className="rounded-xl bg-[#141414] p-3 border border-[#1E1E1E] flex items-center gap-3"
              >
                {/* Formation badge */}
                <div className="w-12 h-12 rounded-lg bg-[#3b82f6]/15 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-[#3b82f6]">{h.formation}</span>
                </div>

                {/* W-D-L */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00C896]/15 text-[#00C896] font-bold">{h.wins}В</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f97316]/15 text-[#f97316] font-bold">{h.draws}Н</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444] font-bold">{h.losses}П</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${diff.bg} ${diff.text}`}>
                      {diff.label}
                    </span>
                    {h.managerName && (
                      <span className="text-[9px] text-[#9CA3AF]/50 truncate">👨‍💼 {h.managerName}</span>
                    )}
                    {h.teamName && (
                      <span className="text-[9px] text-[#9CA3AF]/50 truncate">⚽ {h.teamName}</span>
                    )}
                  </div>
                </div>

                {/* Points & Position */}
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-[#00C896]">{h.points}</div>
                  <div className="text-[10px] text-[#9CA3AF]">
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

/* ─── Home Page (38-0.app style) ─── */
function HomePage() {
  const { setScreen, profileStats, runId, resumeGame } = useGameStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="pb-8">
      {/* ── Hero Section ── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center text-center px-4 pt-8 sm:pt-16 pb-8"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#1E1E1E] text-xs font-medium text-[#9CA3AF]">
            <span className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse" />
            НЕОФИЦИАЛЬНАЯ ДРАФТ-ИГРА ДЛЯ ФАНАТОВ
          </span>
        </motion.div>

        {/* Huge "30-0" Title */}
        <div className="relative mb-4">
          <h1
            className="text-8xl sm:text-[10rem] font-black leading-none tracking-tighter"
            style={{ textShadow: '0 0 40px rgba(0,200,150,0.15), 0 0 80px rgba(0,200,150,0.05)' }}
          >
            <AnimatedCounter target={30} duration={500} delay={0} />
            <span className="text-[#00C896]">-</span>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.3, type: 'spring', stiffness: 300 }}
              className="inline-block"
              style={{ textShadow: '0 0 40px rgba(0,200,150,0.15)' }}
            >
              0
            </motion.span>
          </h1>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-lg sm:text-2xl font-bold text-[#FFFFFF] mb-8 max-w-md"
        >
          Собери величайшую сборную РПЛ всех времён
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="flex flex-col items-center gap-3 w-full max-w-sm"
        >
          {/* Primary CTA — full width green */}
          <Button
            onClick={() => setScreen('setup')}
            className="w-full h-14 text-lg font-bold bg-[#00C896] hover:bg-[#00A67A] text-[#0A0A0A] rounded-2xl transition-colors active:scale-[0.97] shadow-lg shadow-[#00C896]/20"
          >
            Играть 30-0 →
          </Button>

          {/* Secondary — dark outline */}
          <button
            onClick={() => setShowHowToPlay(true)}
            className="w-full h-12 text-base font-semibold text-[#9CA3AF] bg-[#141414] border border-[#1E1E1E] rounded-2xl transition-colors hover:bg-[#1E1E1E] hover:text-[#FFFFFF] hover:border-[#2A2A2A] active:scale-[0.97]"
          >
            Как это работает
          </button>

          {/* Resume draft button — only if there's an unfinished draft */}
          {runId && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={resumeGame}
              className="w-full h-12 text-base font-semibold text-[#00C896] bg-[#00C896]/10 border border-[#00C896]/20 rounded-2xl transition-colors hover:bg-[#00C896]/20 active:scale-[0.97]"
            >
              ▶ Продолжить драфт
            </motion.button>
          )}
        </motion.div>
      </motion.section>

      {/* ── Game Modes Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="px-4 py-6"
      >
        <h2 className="text-xl sm:text-2xl font-black text-center text-[#FFFFFF] mb-4">
          Игровые режимы
        </h2>

        <div className="space-y-3">
          {/* Active mode: Классика */}
          {GAME_MODES.filter(m => m.active).map((mode, i) => (
            <motion.button
              key={mode.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              onClick={() => setScreen('setup')}
              className="relative w-full rounded-2xl p-5 sm:p-6 text-left transition-all overflow-hidden group bg-[#141414] border border-[#1E1E1E] hover:border-[#00C896]/30 hover:bg-[#1E1E1E] active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#00C896]/10 flex items-center justify-center text-2xl sm:text-3xl">
                  {mode.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl font-bold text-[#FFFFFF] mb-1">{mode.title}</div>
                  <div className="text-sm text-[#9CA3AF] leading-relaxed">{mode.desc}</div>
                </div>
                <div className="text-[#00C896]/50 group-hover:text-[#00C896] transition-colors text-2xl">
                  →
                </div>
              </div>
            </motion.button>
          ))}

          {/* Inactive modes with "СКОРО" badge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GAME_MODES.filter(m => !m.active).map((mode, i) => (
              <motion.div
                key={mode.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="relative rounded-xl p-4 text-left overflow-hidden bg-[#141414]/50 border border-[#1E1E1E]/50 cursor-not-allowed"
              >
                <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00C896]/15 text-[#00C896] border border-[#00C896]/20">
                  СКОРО
                </span>
                <div className="text-2xl mb-2 grayscale opacity-50">
                  {mode.emoji}
                </div>
                <div className="text-sm font-semibold text-[#FFFFFF]/40 mb-1">{mode.title}</div>
                <div className="text-xs text-[#9CA3AF]/40 leading-relaxed">{mode.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── How to Play Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="px-4 py-6"
      >
        <h2 className="text-xl sm:text-2xl font-black text-center text-[#FFFFFF] mb-4">
          Как играть
        </h2>
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-start gap-4 rounded-2xl bg-[#141414] p-4 border border-[#1E1E1E]"
            >
              {/* Green numbered circle */}
              <div className="w-10 h-10 rounded-full bg-[#00C896] flex items-center justify-center shrink-0 shadow-md shadow-[#00C896]/20">
                <span className="text-base font-bold text-[#0A0A0A]">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-base font-bold text-[#FFFFFF] mb-1">{step.title}</div>
                <div className="text-sm text-[#9CA3AF] leading-relaxed">{step.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Stats Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="px-4 py-6"
      >
        <div className="rounded-2xl bg-[#141414] border border-[#1E1E1E] p-6">
          <div className="grid grid-cols-3 gap-6">
            <StatsCounter value="15" label="клубов" color="text-[#00C896]" />
            <StatsCounter value="4000+" label="игроков" color="text-[#FFFFFF]" />
            <StatsCounter value="2000-2026" label="сезонов" color="text-[#00C896]" />
          </div>
        </div>
      </motion.section>

      {/* ── Challenges Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="px-4 py-6"
      >
        <h2 className="text-xl sm:text-2xl font-black text-center text-[#FFFFFF] mb-4">
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
                className={`relative rounded-2xl p-4 text-left border transition-all hover:border-[#2A2A2A] overflow-hidden bg-[#141414] border-[#1E1E1E] ${isCompleted ? 'ring-1 ring-[#00C896]/30' : ''}`}
              >
                {/* Emoji */}
                <div className="text-2xl mb-2">{ch.emoji}</div>
                <div className="text-sm font-bold text-[#FFFFFF] mb-1">{ch.title}</div>
                <div className="text-xs text-[#9CA3AF] mb-3">{ch.desc}</div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-[#1E1E1E] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full rounded-full bg-[#00C896]"
                  />
                </div>

                {/* Completed overlay */}
                {isCompleted && (
                  <div className="absolute inset-0 bg-[#00C896]/5 pointer-events-none rounded-2xl" />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* ── FAQ Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="px-4 py-6"
      >
        <h2 className="text-xl sm:text-2xl font-black text-center text-[#FFFFFF] mb-4">
          Частые вопросы
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-2xl bg-[#141414] border border-[#1E1E1E] overflow-hidden px-5"
            >
              <AccordionTrigger className="text-sm font-bold text-[#FFFFFF] hover:text-[#00C896] hover:no-underline py-4">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[#9CA3AF] leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.section>

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
  const CATEGORY_COLORS_LOCAL: Record<string, string> = { gk: '#f97316', def: '#3b82f6', mid: '#00C896', att: '#ef4444' };

  const categoryRatings: Record<string, { total: number; count: number }> = { gk: { total: 0, count: 0 }, def: { total: 0, count: 0 }, mid: { total: 0, count: 0 }, att: { total: 0, count: 0 } };
  const POSITION_CATEGORY_LOCAL: Record<string, 'gk' | 'def' | 'mid' | 'att'> = {
    'ВР': 'gk', 'ЦЗ': 'def', 'ПЗ': 'def', 'ЛЗ': 'def', 'ПФЗ': 'def', 'ЛФЗ': 'def',
    'ОП': 'mid', 'ЦП': 'mid', 'АП': 'mid', 'ЛП': 'mid', 'ПП': 'mid',
    'ЛВ': 'att', 'ПВ': 'att', 'НП': 'att', 'ЦН': 'att',
  };
  slots.forEach((slot) => {
    const cat = POSITION_CATEGORY_LOCAL[slot.position] ?? 'mid';
    if (slot.playerRating) {
      // Strict matching — no partial penalty, always full rating
      categoryRatings[cat].total += slot.playerRating;
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
    if (rating >= 73) return '#00C896';
    if (rating >= 68) return '#f97316';
    return '#ef4444';
  }

  return (
    <div className="space-y-3 animate-fade-in pb-24 sm:pb-4">
      {/* ── Header: Formation + Rerolls + Restart ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#FFFFFF] tracking-wide bg-[#1E1E1E] px-2 py-1 rounded-lg">{config.formation}</span>
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
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors shrink-0"
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
            className="rounded-xl bg-[#00C896]/10 border border-[#00C896]/30 px-3 py-2 flex items-center gap-2"
          >
            <span className="text-[#00C896] text-xs font-bold">👉</span>
            <span className="text-xs text-[#00C896] font-medium">
              Выберите позицию для <strong>{selectedPlayer.fullName}</strong> в списке ниже
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
            className="rounded-xl bg-[#00C896]/15 border border-[#00C896]/40 px-3 py-2 flex items-center gap-2"
          >
            <span className="text-[#00C896] text-xs font-bold">✅</span>
            <span className="text-xs text-[#00C896] font-medium">
              <strong>{lastPlacedInfo.name}</strong> → {lastPlacedInfo.position}
            </span>
            <span className="text-[10px] text-[#9CA3AF] ml-auto">
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
        <div className="space-y-1">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (isMoving) {
                finishMoving();
              } else {
                useGameStore.setState({ movingPlayerSlotIndex: -1 });
              }
            }}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              isMoving
                ? 'bg-[#00C896] text-white shadow-lg shadow-[#00C896]/20'
                : 'bg-[#141414] border border-[#00C896]/30 text-[#00C896] hover:bg-[#00C896]/10'
            }`}
          >
            {isMoving ? '✓ Завершить' : '↔ Переместить игрока'}
          </motion.button>
          {!isMoving && (
            <p className="text-[9px] text-[#64748b] text-center">
              Переместите задрафтованного игрока, чтобы освободить слот
            </p>
          )}
          {isMoving && (
            <p className="text-[10px] text-[#9CA3AF] text-center">
              Нажмите на занятую позицию, затем на другую для обмена
            </p>
          )}
        </div>
      )}

      {/* ── Squad Stats Panel ── */}
      <div className="rounded-xl bg-[#141414] border border-[#1E1E1E]/60 p-3">
        <div className="flex items-center gap-3 mb-3">
          {/* Big rating number */}
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-black leading-none" style={{ color: avgRating ? getRatingColor(avgRating) : '#64748b' }}>
              {avgRating ?? '—'}
            </div>
            <div className="text-[10px] tracking-wide text-[#9CA3AF] font-bold mt-1">Рейтинг</div>
          </div>
          {/* Category bars */}
          <div className="flex-1 space-y-1.5">
            {['att', 'mid', 'def', 'gk'].map((cat) => {
              const r = categoryRatings[cat];
              const avg = r.count > 0 ? Math.round(r.total / r.count) : 0;
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-[9px] text-[#9CA3AF] w-14 shrink-0">{CATEGORY_LABELS_LOCAL[cat]}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#1a2a1a] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: r.count > 0 ? `${(avg / 99) * 100}%` : '0%' }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS_LOCAL[cat] }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-[#FFFFFF] w-5 text-right">
                    {r.count > 0 ? avg : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Spin Section ── */}
      <div ref={spinWheelRef} className="space-y-2">
        <SpinWheel />
        {/* Restart run link */}
        <div className="text-center">
          <button
            onClick={() => setShowRestartModal(true)}
            className="text-[10px] text-[#64748b] hover:text-[#9CA3AF] transition-colors"
          >
            Начать заново
          </button>
        </div>
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
              className="relative w-full max-w-sm rounded-2xl bg-[#141414] border border-[#1E1E1E] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-[#FFFFFF] mb-2">Начать новый драфт?</h3>
              <p className="text-sm text-[#9CA3AF] mb-6">
                Перезапуск происходит немедленно с теми же настройками. Ваш текущий черновик будет потерян.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRestartModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#9CA3AF] bg-[#0A0A0A] border border-[#1E1E1E] hover:bg-[#141414] transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleRestart}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#00C896] hover:bg-[#00A67A] transition-colors shadow-lg shadow-[#00C896]/20"
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
        <h2 className="text-2xl font-black text-[#FFFFFF]">Состав готов!</h2>
        <p className="text-sm text-[#9CA3AF] mt-1">Все 11 позиций заполнены</p>
      </div>

      <FormationView />

      {/* Pre-season odds — 38-0 style */}
      <div className="rounded-2xl bg-[#141414] border border-[#1E1E1E]/60 p-4 space-y-4">
        <h3 className="text-sm font-bold text-[#FFFFFF]">📊 Предсезонные шансы</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#1a2a1a] p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold mb-1">Прогноз места</div>
            <div className="text-2xl font-black text-[#fbbf24]">{projectedPosition}</div>
          </div>
          <div className="rounded-xl bg-[#1a2a1a] p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold mb-1">Ожидаемые очки</div>
            <div className="text-2xl font-black text-[#00C896]">{expectedPoints}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          {[
            { label: 'Выиграть чемпионат', pct: winLeaguePct, color: '#fbbf24' },
            { label: 'Топ-4', pct: top4Pct, color: '#00C896' },
            { label: 'Топ-6', pct: top6Pct, color: '#3b82f6' },
            { label: 'Топ-10', pct: top10Pct, color: '#9CA3AF' },
            { label: 'Вылет', pct: relegationPct, color: '#ef4444' },
          ].map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#9CA3AF]">{label}</span>
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
        className="text-2xl font-bold text-[#FFFFFF]"
      >
        Симуляция сезона...
      </motion.div>
      <div className="text-sm text-[#9CA3AF]">30 туров, 16 команд, 1 чемпион</div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-[#00C896]"
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
  easy: { bg: 'bg-[#00C896]/15', text: 'text-[#00C896]' },
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
        <h2 className="text-xl font-bold text-[#FFFFFF]">🏆 Лидерборд</h2>
        <p className="text-sm text-[#9CA3AF] mt-1">Лучшие результаты</p>
      </div>

      {leaderboard.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#141414] p-10 text-center border border-[#1E1E1E]"
        >
          <div className="text-6xl mb-4">🏆</div>
          <div className="text-lg font-bold text-[#FFFFFF] mb-2">Пока нет результатов</div>
          <div className="text-sm text-[#9CA3AF] mb-6">Сыграйте первый сезон и попадите в таблицу лидеров!</div>
          <Button
            onClick={() => { resetGame(); setScreen('setup'); }}
            className="h-12 px-8 text-base font-bold bg-[#00C896] hover:bg-[#00A67A] text-white rounded-xl shadow-lg shadow-[#00C896]/20"
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
                    : 'bg-[#141414] border-[#1E1E1E]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-10 h-10 rounded-xl bg-[#0A0A0A]/50 flex items-center justify-center shrink-0">
                    <span className="text-lg">{rankEmoji || <span className="text-sm font-bold text-[#9CA3AF]">{idx + 1}</span>}</span>
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
                    <div className="text-[10px] text-[#9CA3AF]/60 mt-1">
                      {getRelativeTime(entry.createdAt)} · Рейтинг: {entry.squadRating || '-'}
                    </div>
                  </div>

                  {/* Points & Position */}
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-black text-[#00C896]">{entry.seasonPoints}</div>
                    <div className="text-xs text-[#9CA3AF]">
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
        className="w-full h-14 text-lg font-bold bg-[#00C896] hover:bg-[#00A67A] text-white rounded-xl shadow-lg shadow-[#00C896]/20"
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
        return <HomePage />; // Leaderboard hidden
      default:
        return <HomePage />;
    }
  }, [screen]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A0A0A]">
      {/* Semi-transparent football field background */}
      <div className="football-field-bg" />
      <Header />
      <main className="flex-1 w-full max-w-lg mx-auto px-3 sm:px-4 py-2 sm:py-4 pb-4 relative z-10">
        {renderScreen()}
      </main>
      <AchievementUnlocked />
    </div>
  );
}
