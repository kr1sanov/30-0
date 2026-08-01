'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { DailyChallenge as DailyChallengeType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Difficulty badge config
// ---------------------------------------------------------------------------
const DIFFICULTY_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  easy: { bg: 'bg-[#00C896]/15', text: 'text-[#00C896]', label: 'Легко', icon: '🌱' },
  normal: { bg: 'bg-[#f97316]/15', text: 'text-[#f97316]', label: 'Нормально', icon: '⚖️' },
  hard: { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]', label: 'Сложно', icon: '🔥' },
};

// ---------------------------------------------------------------------------
// Countdown Timer
// ---------------------------------------------------------------------------
function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const mskHour = (utcHour + 3) % 24;

      let hoursLeft = 24 - mskHour;
      if (hoursLeft === 24) hoursLeft = 0;

      const minutesLeft = 60 - now.getUTCMinutes();
      const secondsLeft = 60 - now.getUTCSeconds();

      let hours = hoursLeft;
      let minutes = minutesLeft === 60 ? 0 : minutesLeft;
      const seconds = secondsLeft === 60 ? 0 : secondsLeft;

      if (minutesLeft === 60) {
        hours = hours - 1 >= 0 ? hours - 1 : 23;
        minutes = 0;
      }

      setTimeLeft({ hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex items-center justify-center gap-1.5">
      <TimeBlock value={pad(timeLeft.hours)} label="ч" />
      <span className="text-[#9CA3AF] text-lg font-bold animate-pulse">:</span>
      <TimeBlock value={pad(timeLeft.minutes)} label="м" />
      <span className="text-[#9CA3AF] text-lg font-bold animate-pulse">:</span>
      <TimeBlock value={pad(timeLeft.seconds)} label="с" />
    </div>
  );
}

function TimeBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-lg bg-[#0A0A0A] border border-[#1E1E1E] flex items-center justify-center">
        <span className="text-xl font-black text-[#00C896] tabular-nums">{value}</span>
      </div>
      <span className="text-[9px] text-[#64748b] font-bold mt-1">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constraint Badge
// ---------------------------------------------------------------------------
function ConstraintBadge({ icon, label, value, color = '#00C896' }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 rounded-xl bg-[#0A0A0A] border border-[#1E1E1E] px-3 py-2"
    >
      <span className="text-base">{icon}</span>
      <div>
        <div className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">{label}</div>
        <div className="text-xs font-bold" style={{ color }}>{value}</div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main DailyChallengeScreen Component
// ---------------------------------------------------------------------------
export default function DailyChallengeScreen() {
  const { startDailyChallenge, dailyChallenge, goHome, profileStats } = useGameStore();
  const [challenge, setChallenge] = useState<DailyChallengeType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ completions: 0, attempts: 0 });
  const [isStarting, setIsStarting] = useState(false);

  // Fetch today's challenge
  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/daily');
        if (!res.ok) {
          throw new Error('Failed to fetch');
        }
        const data = await res.json();
        setChallenge(data.challenge);
        setStats(data.stats || { completions: 0, attempts: 0 });
      } catch (err) {
        console.error('Failed to fetch daily challenge:', err);
        setError('Не удалось загрузить челлендж');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenge();
  }, []);

  // Check if user already completed today's challenge
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBestAttempt = profileStats.history.findLast?.((h) =>
    h.date?.startsWith(todayStr)
  );

  const handleStart = useCallback(async () => {
    if (!challenge) return;
    setIsStarting(true);

    // Apply challenge constraints to game config
    const configOverrides: Record<string, unknown> = {};

    // Lock formation if specified
    if (challenge.formationLock) {
      configOverrides.formation = challenge.formationLock;
    }

    // Set era restriction if specified
    if (challenge.eraRestriction) {
      configOverrides.eraStartYear = challenge.eraRestriction.start;
      configOverrides.eraEndYear = challenge.eraRestriction.end;
      configOverrides.eraFilter = 'all';
    }

    // Apply to store
    const { setConfig } = useGameStore.getState();
    setConfig(configOverrides);

    // Small delay for visual feedback
    await new Promise(r => setTimeout(r, 300));

    startDailyChallenge(challenge);
    setIsStarting(false);
  }, [challenge, startDailyChallenge]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-5xl"
        >
          ⚽
        </motion.div>
        <div className="text-lg font-bold text-[#FFFFFF]">Загрузка челленджа...</div>
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

  // Error state
  if (error || !challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-5xl">😔</div>
        <div className="text-lg font-bold text-[#FFFFFF]">Что-то пошло не так</div>
        <div className="text-sm text-[#9CA3AF]">{error || 'Челлендж не найден'}</div>
        <Button
          onClick={goHome}
          variant="outline"
          className="border-[#00C896]/30 text-[#00C896] hover:bg-[#00C896]/10"
        >
          На главную
        </Button>
      </div>
    );
  }

  const diffConfig = DIFFICULTY_CONFIG[challenge.difficulty] || DIFFICULTY_CONFIG.normal;

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      {/* ── Back Button ── */}
      <button
        onClick={goHome}
        className="flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Назад
      </button>

      {/* ── Challenge Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl overflow-hidden"
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: challenge.difficulty === 'hard'
              ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(0,0,0,0.9) 50%, rgba(239,68,68,0.1) 100%)'
              : challenge.difficulty === 'easy'
              ? 'linear-gradient(135deg, rgba(0,200,150,0.15) 0%, rgba(0,0,0,0.9) 50%, rgba(0,200,150,0.1) 100%)'
              : 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(0,0,0,0.9) 50%, rgba(249,115,22,0.1) 100%)',
          }}
        />
        <div className="absolute inset-0 bg-[#0A0A0A]/80" />

        {/* Content */}
        <div className="relative p-5 sm:p-6 border border-[#1E1E1E] rounded-2xl">
          {/* Date badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#00C896]/15 text-[#00C896] border border-[#00C896]/20">
              📅 {challenge.date}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${diffConfig.bg} ${diffConfig.text}`}>
              {diffConfig.icon} {diffConfig.label}
            </span>
          </div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl sm:text-3xl font-black text-[#FFFFFF] mb-2"
          >
            {challenge.title}
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm sm:text-base text-[#9CA3AF] leading-relaxed mb-4"
          >
            {challenge.description}
          </motion.p>

          {/* Bonus description */}
          {challenge.bonusDescription && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2 rounded-xl bg-[#00C896]/10 border border-[#00C896]/20 px-3 py-2 mb-4"
            >
              <span className="text-[#00C896] text-sm">💡</span>
              <span className="text-xs text-[#00C896] font-medium">{challenge.bonusDescription}</span>
            </motion.div>
          )}

          {/* Bonus multiplier */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-bold">Бонус множитель</span>
            <span className="text-lg font-black text-[#fbbf24]">×{challenge.bonusMultiplier}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Constraints Grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#9CA3AF]">
          Ограничения
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {/* Nationality requirements */}
          {challenge.nationalityRequirements.map((req, i) => (
            <ConstraintBadge
              key={`nat-${i}`}
              icon={req.flag}
              label={req.nationality}
              value={`Минимум ${req.count} игр.`}
              color="#00C896"
            />
          ))}

          {/* Era restriction */}
          {challenge.eraRestriction && (
            <ConstraintBadge
              icon="📅"
              label="Эпоха"
              value={`${challenge.eraRestriction.start}-${challenge.eraRestriction.end}`}
              color="#f97316"
            />
          )}

          {/* Formation lock */}
          {challenge.formationLock && (
            <ConstraintBadge
              icon="📐"
              label="Схема"
              value={challenge.formationLock}
              color="#3b82f6"
            />
          )}

          {/* Rerolls allowed */}
          <ConstraintBadge
            icon="🔄"
            label="Перебросы"
            value={challenge.rerollsAllowed === 0 ? 'Без перебросов' : `${challenge.rerollsAllowed} переброс(а)`}
            color={challenge.rerollsAllowed === 0 ? '#ef4444' : '#fbbf24'}
          />

          {/* Rating cap */}
          {challenge.ratingCap && (
            <ConstraintBadge
              icon="📊"
              label="Макс. рейтинг"
              value={`≤ ${challenge.ratingCap}`}
              color="#ef4444"
            />
          )}

          {/* Completion odds */}
          <ConstraintBadge
            icon="🎯"
            label="Шанс выполнения"
            value={`${challenge.completionOdds}%`}
            color={challenge.completionOdds <= 20 ? '#ef4444' : challenge.completionOdds <= 40 ? '#f97316' : '#00C896'}
          />
        </div>
      </motion.div>

      {/* ── Countdown Timer ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-[#141414] border border-[#1E1E1E] p-4"
      >
        <div className="text-center mb-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[#9CA3AF]">
            До следующего челленджа
          </span>
        </div>
        <CountdownTimer />
      </motion.div>

      {/* ── Global Stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-[#141414] border border-[#1E1E1E] p-4"
      >
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="text-2xl font-black text-[#00C896]">{stats.completions}</div>
            <div className="text-[10px] text-[#9CA3AF] font-bold">Выполнили</div>
          </div>
          <div className="w-px h-8 bg-[#1E1E1E]" />
          <div className="text-center">
            <div className="text-2xl font-black text-[#FFFFFF]">{stats.attempts}</div>
            <div className="text-[10px] text-[#9CA3AF] font-bold">Попыток</div>
          </div>
          <div className="w-px h-8 bg-[#1E1E1E]" />
          <div className="text-center">
            <div className="text-2xl font-black text-[#fbbf24]">
              {stats.attempts > 0 ? Math.round((stats.completions / stats.attempts) * 100) : 0}%
            </div>
            <div className="text-[10px] text-[#9CA3AF] font-bold">Успешность</div>
          </div>
        </div>
      </motion.div>

      {/* ── Best Attempt Today ── */}
      <AnimatePresence>
        {todayBestAttempt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-[#00C896]/10 border border-[#00C896]/20 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🏆</span>
              <span className="text-xs font-bold text-[#00C896]">Ваш лучший результат сегодня</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-lg font-black text-[#FFFFFF]">{todayBestAttempt.points} очков</div>
              <div className="text-xs text-[#9CA3AF]">
                {todayBestAttempt.wins}В-{todayBestAttempt.draws}Н-{todayBestAttempt.losses}П
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Start Button ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          onClick={handleStart}
          disabled={isStarting}
          className="w-full h-14 text-lg font-bold bg-[#00C896] hover:bg-[#00A67A] text-[#0A0A0A] rounded-2xl transition-colors active:scale-[0.97] shadow-lg shadow-[#00C896]/20"
        >
          {isStarting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full"
            />
          ) : (
            'Начать челлендж →'
          )}
        </Button>
      </motion.div>

      {/* ── Info text ── */}
      <p className="text-[10px] text-[#64748b] text-center leading-relaxed">
        Челлендж обновляется каждый день в 00:00 по московскому времени.
        Ограничения применяются автоматически при начале игры.
      </p>
    </div>
  );
}
