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
import SeasonAwards from '@/components/game/SeasonAwards';
import PreMatchAnalysis from '@/components/game/PreMatchAnalysis';
import ManagerChoice from '@/components/game/ManagerChoice';
import DailyChallengeScreen from '@/components/game/DailyChallengeScreen';
import NationsCupScreen from '@/components/game/NationsCupScreen';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import ProfileScreen from '@/components/game/ProfileScreen';
import HistoryScreen from '@/components/game/HistoryScreen';
import { toast } from 'sonner';
import { canFillSlot } from '@/lib/positions';
import type { Position } from '@/lib/positions';
import { useAutoAuth } from '@/hooks/use-telegram-auth';
import { useAuthStore } from '@/store/authStore';
import { Metrics } from '@/lib/metrics';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import TelegramLogin from '@/components/game/TelegramLogin';
import { clubThemeStyle } from '@/lib/clubThemes';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { useTelegram } from '@/hooks/use-telegram';
import Image from 'next/image';

/* ─── Step data ─── */
const STEPS = [
  { title: 'Крути колесо', desc: 'Колесо фортуны выбирает реальный клуб и сезон РПЛ' },
  { title: 'Выбери игрока', desc: 'Бери игрока из состава этого клуба в свою команду' },
  { title: 'Собери состав', desc: 'Повторяй, пока все 11 позиций не будут заполнены' },
  { title: 'Сыграй сезон', desc: 'Симулируй 30 матчей — сможешь ли добиться 30-0?' },
];

/* ─── Game Modes data ─── */
const GAME_MODES = [
  { emoji: '⚔️', title: 'Обычный драфт', desc: 'Собери величайшую сборную РПЛ всех времён', active: true, color: '#3b82f6', gameMode: 'classic' as const },
  { emoji: '🏟️', title: 'Один клуб', desc: 'Собери состав из игроков одного клуба РПЛ', active: true, color: '#00C896', gameMode: 'single_club' as const },
  { emoji: '👥', title: 'Мультиплеер', desc: 'Играйте с друзьями. Драфт в режиме реального времени.', active: true, color: '#a78bfa', gameMode: 'multiplayer' as const },
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
  { q: 'Чем отличается режим «Один клуб»?', a: 'Вы выбираете клуб до начала драфта. Колесо предлагает игроков из его сезонов в базе; рейтинг берётся из сезона выступления за этот клуб. Режим Prime здесь недоступен.' },
  { q: 'Как работают перебросы и тренер?', a: 'Переброс меняет выпавший клуб и сезон. Доступное число зависит от сложности: 3, 1 или 0. Если включить тренера при создании игры, он выбирается случайно и даёт небольшой бонус составу.' },
  { q: 'Как определяется результат сезона?', a: 'После заполнения 11 позиций игра рассчитывает силу состава и симулирует 30 матчей против клубов из базы. На итог влияют рейтинг, совместимость позиций, сложность, тренер и случайность.' },
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
  const { setScreen, setConfig, profileStats, runId, config, lastConfig, resumeGame } = useGameStore();
  const { user } = useAuthStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [databaseStats, setDatabaseStats] = useState<{ seasons: number; clubs: number; players: number; firstYear: number | null; lastYear: number | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/stats', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Database stats request failed');
        return response.json();
      })
      .then(stats => setDatabaseStats(stats))
      .catch(error => { if (error.name !== 'AbortError') console.error(error); });
    return () => controller.abort();
  }, []);

  return (
    <div className="pb-8">
      {/* ── Hero Section ── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center text-center px-4 pt-4 sm:pt-8 pb-8"
      >
        {/* Badge */}
        <LanguageSwitcher />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#1E1E1E] text-xs font-medium text-[#9CA3AF]">
            <span className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse" />
            Неофициальная драфт-игра для фанатов РПЛ
          </span>
        </motion.div>

        <img src="/brand-30-0.svg" alt="Эмблема 30-0 — Драфт Российской Премьер-лиги" width={112} height={112} className="mb-1 h-24 w-24 object-contain sm:h-28 sm:w-28" />
        {/* Huge "30-0" Title */}
        <div className="relative mb-3">
          <h1
            className="text-7xl sm:text-[9rem] font-black leading-none tracking-tighter"
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
          className="text-lg sm:text-2xl font-bold text-[#FFFFFF] mb-6 max-w-md"
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
            onClick={() => {
              setConfig({ gameMode: 'classic', clubFilter: undefined, clubName: undefined, nationalityFilter: undefined });
              setScreen('setup');
            }}
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
          {runId && (lastConfig?.gameMode ?? config.gameMode) === 'classic' && !lastConfig?.clubFilter && (
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
          {/* Active modes */}
          {GAME_MODES.filter(m => m.active).map((mode, i) => (
            <motion.button
              key={mode.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              onClick={() => {
                if (mode.gameMode === 'multiplayer') { location.href = '/multiplayer'; return; }
                setConfig({ gameMode: mode.gameMode, clubFilter: undefined, clubName: undefined, nationalityFilter: undefined });
                setScreen('setup');
              }}
              className="relative w-full rounded-2xl p-5 sm:p-6 text-left transition-all overflow-hidden group bg-[#141414] border border-[#1E1E1E] hover:border-[#00C896]/30 hover:bg-[#1E1E1E] active:scale-[0.98]"
            >
              {mode.gameMode === 'single_club' && (
                <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00C896]/15 text-[#00C896] border border-[#00C896]/20">
                  НОВОЕ
                </span>
              )}
              {mode.gameMode === 'multiplayer' && <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">БЕТА</span>}
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl"
                  style={{ backgroundColor: `${mode.color}15` }}
                >
                  {mode.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl font-bold text-[#FFFFFF] mb-1">{mode.title}</div>
                  <div className="text-sm text-[#9CA3AF] leading-relaxed">{mode.desc}</div>
                </div>
                <div
                  className="transition-colors text-2xl"
                  style={{ color: `${mode.color}50` }}
                >
                  →
                </div>
              </div>
            </motion.button>
          ))}

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
            <StatsCounter value={databaseStats ? String(databaseStats.clubs) : '…'} label="клубов" color="text-[#00C896]" />
            <StatsCounter value={databaseStats ? String(databaseStats.players) : '…'} label="игроков" color="text-[#FFFFFF]" />
            <StatsCounter value={databaseStats ? String(databaseStats.seasons) : '…'} label="сезонов" color="text-[#00C896]" />
          </div>
          {databaseStats?.firstYear && databaseStats?.lastYear && (
            <p className="mt-3 text-center text-xs text-[#9CA3AF]">Сезоны {databaseStats.firstYear}–{databaseStats.lastYear}</p>
          )}
        </div>
      </motion.section>

      {/* ── Challenges Section (hidden on home — only in Profile) ── */}

      {/* ── Playlists ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="px-4 py-6"
      >
        <h2 className="mb-2 text-center text-xl font-black text-[#FFFFFF] sm:text-2xl">
          Музыка эпохи
        </h2>
        <p className="mb-4 text-center text-sm text-[#9CA3AF]">
          Включите плейлист и собирайте команду под треки эпохи.
        </p>
        <div className="space-y-3">
          <a
            href="https://music.yandex.ru/playlists/817a946d-8890-8a43-a4e7-daca3606725a"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Открыть плейлист в Яндекс Музыке"
            className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-[#1E1E1E] bg-[#141414] px-5 py-4 transition-colors hover:border-[#FFE600]/40 hover:bg-[#1E1E1E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE600] active:scale-[0.99]"
          >
            <span className="min-w-0">
              <Image src="/music/yandex-music-ru.svg" alt="Яндекс Музыка" width={862} height={103} className="music-logo-ru h-7 w-auto max-w-full" />
              <Image src="/music/yandex-music-en.svg" alt="Yandex Music" width={734} height={103} className="music-logo-en h-7 w-auto max-w-full" />
              <span className="mt-2 block text-xs text-[#9CA3AF]">Открыть плейлист ↗</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-xl text-[#FFE600]">↗</span>
          </a>
          <a
            href="https://open.spotify.com/playlist/3O1Oqzitol9LU72g7puBi5"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Открыть плейлист в Spotify"
            className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-[#1E1E1E] bg-[#141414] px-5 py-4 transition-colors hover:border-[#1ED760]/40 hover:bg-[#1E1E1E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1ED760] active:scale-[0.99]"
          >
            <span className="min-w-0">
              <Image src="/music/spotify.svg" alt="Spotify" width={823} height={225} className="h-8 w-auto max-w-full" />
              <span className="mt-2 block text-xs text-[#9CA3AF]">Открыть плейлист ↗</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-xl text-[#1ED760]">↗</span>
          </a>
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
  const { config, rerollsLeft, currentSpin, selectedPlayer, resetGame, startRun, lastConfig, slots, movingPlayerSlotIndex, finishMoving, lastAssignedSlotIndex, undoLastPick, lastDraftState, justAssignedSlotIndex, dailyChallenge, lastDraftError } = useGameStore();
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [lastPlacedInfo, setLastPlacedInfo] = useState<{ name: string; position: string } | null>(null);
  const spinWheelRef = useRef<HTMLDivElement>(null);
  const prevLastAssignedSlot = useRef(lastAssignedSlotIndex);

  const maxRerolls = dailyChallenge?.rerollsAllowed !== undefined
    ? dailyChallenge.rerollsAllowed
    : config.difficulty === 'easy' ? 3 : config.difficulty === 'normal' ? 1 : 0;
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
      {/* ── Draft Error Banner ── */}
      <AnimatePresence>
        {lastDraftError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 px-3 py-2 flex items-center gap-2"
          >
            <span className="text-[#ef4444] text-xs font-bold">⚠️</span>
            <span className="text-xs text-[#ef4444] font-medium">{lastDraftError}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="lg:grid lg:grid-cols-[minmax(380px,480px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="space-y-3 lg:sticky lg:top-20">
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

      {/* ── Daily Challenge Constraints Banner ── */}
      <AnimatePresence>
        {dailyChallenge && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="rounded-xl bg-[#00C896]/5 border border-[#00C896]/20 px-3 py-2"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-[#00C896]">⚽ {dailyChallenge.title}</span>
              {dailyChallenge.bonusMultiplier > 1 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#fbbf24]/15 text-[#fbbf24]">×{dailyChallenge.bonusMultiplier}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {dailyChallenge.nationalityRequirements.map((req, i) => (
                <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00C896]/10 text-[#00C896]">
                  {req.flag}{req.count} {req.nationality}
                </span>
              ))}
              {dailyChallenge.eraRestriction && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f97316]/10 text-[#f97316]">
                  📅 {dailyChallenge.eraRestriction.start}-{dailyChallenge.eraRestriction.end}
                </span>
              )}
              {dailyChallenge.formationLock && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#3b82f6]/10 text-[#3b82f6]">
                  📐 {dailyChallenge.formationLock}
                </span>
              )}
              {dailyChallenge.rerollsAllowed === 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444]">
                  🚫 Без перебросов
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pitch / Formation View ── */}
      <div data-pitch-section>
        <FormationView />
      </div>

      {/* Move player button removed - players can tap positions to rearrange directly */}

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

        </div>

        <div className="mt-3 space-y-3 lg:mt-0">

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
        </div>
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
  const { slots, config, currentManager, setScreen } = useGameStore();

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

  // Pre-season odds calculation (realistic for 30-match RPL season)
  const projectedPosition = effectiveRating >= 80 ? 1 : effectiveRating >= 76 ? 2 : effectiveRating >= 72 ? 3 : effectiveRating >= 68 ? 5 : effectiveRating >= 64 ? 8 : 12;
  // Realistic RPL points: max ~85 (30W), avg team ~40pts, top team ~60-70
  // Formula: base points from rating with diminishing returns, capped at 85
  const expectedPoints = Math.min(85, Math.round(
    effectiveRating >= 78 ? (effectiveRating - 50) * 2.2 + Math.random() * 8 :
    effectiveRating >= 70 ? (effectiveRating - 55) * 2.0 + Math.random() * 10 :
    (effectiveRating - 50) * 1.5 + Math.random() * 12
  ));
  const winLeaguePct = Math.min(99, Math.max(1, Math.round((effectiveRating - 55) * 3)));
  const top4Pct = Math.min(99, Math.max(winLeaguePct + 20, 30));
  const top6Pct = Math.min(99, Math.max(top4Pct + 15, 50));
  const top10Pct = Math.min(99, Math.max(top6Pct + 10, 70));
  const relegationPct = Math.max(0, Math.round(100 - top10Pct - 20));

  return (
    <div className="space-y-4 animate-fade-in-up lg:grid lg:grid-cols-[minmax(300px,380px)_minmax(0,760px)] lg:items-start lg:justify-center lg:gap-6 lg:space-y-0">
      <div className="text-center lg:col-span-2">
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

      <div className="lg:row-span-3 lg:sticky lg:top-20">
        <FormationView />
      </div>

      <div className="rounded-2xl bg-[#141414] border border-[#1E1E1E]/60 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-bold text-white">{currentManager ? `Тренер: ${currentManager.name}` : 'Без тренера'}</div>
          <div className="mt-1 text-xs text-[#9CA3AF]">
            {currentManager
              ? `Случайный выбор · бонус +2 к силе состава · рейтинг ${currentManager.rating}/10`
              : 'Тренер отключён в настройках игры.'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.enableManagers && (
            <Button
              variant="outline"
              onClick={() => setScreen('manager-choice')}
              className="h-11 rounded-xl border-[#00C896]/50 text-[#00C896] hover:bg-[#00C896]/10"
            >
              Крутить тренера
            </Button>
          )}
          <Button
            onClick={() => setScreen('pre-match')}
            className="h-11 shrink-0 rounded-xl px-6 font-bold text-[#06130f]"
            style={{ backgroundColor: '#00C896' }}
          >
            Перейти к сезону →
          </Button>
        </div>
      </div>

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
  const scaleScreens = ['profile', 'leaderboard', 'history'];
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
  const { screen, config } = useGameStore();
  const { showBackButton, hideBackButton } = useTelegram();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const prevScreen = useRef(screen);
  const [direction, setDirection] = useState(0);
  const [epochChecked, setEpochChecked] = useState(false);

  // Initialize the server-verified Telegram session
  useAutoAuth();
  useEffect(() => {
    if (screen === 'home') return;
    const back = () => useGameStore.getState().goHome();
    showBackButton(back);
    return () => hideBackButton(back);
  }, [screen, showBackButton, hideBackButton]);

  useEffect(() => {
    const startParam = new URLSearchParams(location.search).get('tgWebAppStartParam') ||
      (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } } }).Telegram?.WebApp?.initDataUnsafe?.start_param || '';
    const invite = startParam.match(/^room_([A-HJ-NP-Z2-9]{6})$/i);
    if (invite) location.replace(`/multiplayer?room=${invite[1].toUpperCase()}`);
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    fetch('/api/progress-epoch', { cache: 'no-store' }).then(async response => {
      if (!response.ok) return;
      const { epoch } = await response.json();
      const previous = localStorage.getItem('30-0-progress-epoch') ?? '2026-09-27';
      if (epoch !== previous) useGameStore.getState().resetProgress();
      localStorage.setItem('30-0-progress-epoch', epoch);
    }).catch(() => undefined).finally(() => setEpochChecked(true));
  }, [_hasHydrated]);

  useEffect(() => {
    if (!isAuthenticated || !epochChecked) return;
    void (async () => {
      await useGameStore.getState().loadProfileFromCloud();
      await useGameStore.getState().loadActiveRunFromCloud();
    })();
  }, [isAuthenticated, epochChecked]);

  // ── Yandex.Metrika SPA navigation tracking ──
  useEffect(() => {
    if (prevScreen.current !== screen) {
      setDirection(getDirection(prevScreen.current, screen));
      prevScreen.current = screen;
      // Track screen view in Metrika
      Metrics.screenView(screen);
    }
  }, [screen]);



  const renderScreen = useCallback(() => {
    switch (screen) {
      case 'home':
        return <HomePage />;
      case 'setup':
        return <GameSetup />;
      case 'daily-challenge':
        return <DailyChallengeScreen />;
      case 'nations-cup':
        return <NationsCupScreen />;
      case 'draft':
        return <DraftScreen />;
      case 'position-assign':
        return <DraftScreen />;
      case 'squad-complete':
        return <SquadCompleteScreen />;
      case 'pre-match':
        return <PreMatchAnalysis />;
      case 'manager-choice':
        return <ManagerChoice />;
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
      case 'history':
        return <HistoryScreen />;
      default:
        return <HomePage />;
    }
  }, [screen]);

  return (
    <div
      className="club-theme-shell min-h-[100dvh] flex flex-col bg-[#0A0A0A]"
      style={clubThemeStyle(config.gameMode === 'single_club' ? config.clubName : undefined)}
    >
      {/* Semi-transparent football field background */}
      <div className="football-field-bg" />
      <Header />
      <main
        className={`flex-1 w-full mx-auto px-3 sm:px-4 py-2 sm:py-4 pb-20 sm:pb-4 relative z-10 ${
          ['draft', 'position-assign', 'squad-complete', 'pre-match', 'manager-choice', 'simulation', 'result', 'awards'].includes(screen)
            ? 'max-w-7xl'
            : screen === 'setup'
              ? 'max-w-4xl'
            : 'max-w-4xl'
        }`}
      >
        <ErrorBoundary>
          {screen === 'home' ? renderScreen() : !_hasHydrated ? <p role="status">Проверяем вход…</p> : !isAuthenticated ? <TelegramLogin /> : renderScreen()}
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
