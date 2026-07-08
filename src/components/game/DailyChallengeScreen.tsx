'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';
import type { DailyChallenge, NationalityRequirement } from '@/lib/types';
import { ArrowLeft, Clock, RotateCcw, Trophy, Target, Zap } from 'lucide-react';

// ---------------------------------------------------------------------------
// Countdown timer hook
// ---------------------------------------------------------------------------
function useCountdown() {
  const [time, setTime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // Calculate time until midnight MSK (UTC+3)
      const utcH = now.getUTCHours();
      const mskH = (utcH + 3) % 24;
      let hoursLeft = 24 - mskH;
      if (hoursLeft === 24) hoursLeft = 0;

      const minutesLeft = 59 - now.getUTCMinutes();
      const secondsLeft = 59 - now.getUTCSeconds();

      setTime({
        hours: hoursLeft,
        minutes: minutesLeft,
        seconds: secondsLeft,
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

// ---------------------------------------------------------------------------
// Difficulty badge
// ---------------------------------------------------------------------------
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    easy: { bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]', label: 'Легко' },
    normal: { bg: 'bg-[#f97316]/15', text: 'text-[#f97316]', label: 'Нормально' },
    hard: { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]', label: 'Сложно' },
  };
  const c = config[difficulty] || config.normal;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function DailyChallengeScreen() {
  const { setScreen, startDailyChallenge } = useGameStore();
  const countdown = useCountdown();

  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Daily attempts stored in localStorage
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [rerollUsed, setRerollUsed] = useState(false);

  // Load daily challenge from API
  const fetchChallenge = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/daily');
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setChallenge(data.challenge);

      // Load attempts from localStorage
      const stored = localStorage.getItem(`daily-attempts-${data.challenge.date}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAttemptsUsed(parsed.attempts || 0);
        setRerollUsed(parsed.rerollUsed || false);
      }
    } catch {
      setError('Не удалось загрузить челлендж');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  // Save attempts to localStorage
  const saveAttempts = useCallback((attempts: number, reroll: boolean) => {
    if (!challenge) return;
    localStorage.setItem(
      `daily-attempts-${challenge.date}`,
      JSON.stringify({ attempts, rerollUsed: reroll }),
    );
  }, [challenge]);

  const handleStart = useCallback(() => {
    if (!challenge) return;
    const newAttempts = attemptsUsed + 1;
    setAttemptsUsed(newAttempts);
    saveAttempts(newAttempts, rerollUsed);
    startDailyChallenge(challenge);
  }, [challenge, attemptsUsed, rerollUsed, saveAttempts, startDailyChallenge]);

  const handleReroll = useCallback(() => {
    if (rerollUsed || !challenge) return;
    setRerollUsed(true);
    saveAttempts(attemptsUsed, true);
    // Re-fetch to get a new challenge variant (same date, different seed offset)
    fetchChallenge();
  }, [rerollUsed, challenge, attemptsUsed, saveAttempts, fetchChallenge]);

  const attemptsLeft = challenge ? challenge.maxAttempts - attemptsUsed : 0;
  const canStart = attemptsLeft > 0 && challenge;
  const canReroll = !rerollUsed && challenge;

  // Format countdown
  const pad = (n: number) => String(n).padStart(2, '0');
  const countdownStr = `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`;

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-[#10b981]"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <p className="text-sm text-[#9ca3af]">Загрузка челленджа...</p>
      </div>
    );
  }

  // Error state
  if (error || !challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-4xl">😔</div>
        <p className="text-sm text-[#9ca3af]">{error || 'Челлендж не найден'}</p>
        <Button
          onClick={fetchChallenge}
          variant="outline"
          className="border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10"
        >
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 pb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScreen('home')}
          className="p-2 rounded-xl bg-[#141414] border border-[#1f2937] text-[#9ca3af] hover:text-white hover:border-[#10b981]/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[#e2e8f0]">Ежедневный челлендж</h1>
          <p className="text-xs text-[#9ca3af]">{challenge.date}</p>
        </div>
        <DifficultyBadge difficulty={challenge.difficulty} />
      </div>

      {/* Countdown Timer Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-gradient-to-br from-[#10b981]/10 to-[#059669]/5 border border-[#10b981]/20 p-5 text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-[#10b981]" />
          <span className="text-xs font-semibold text-[#10b981] tracking-wide uppercase">
            Обновление через
          </span>
        </div>
        <div
          className="text-4xl font-black text-[#10b981] tracking-wider"
          style={{ textShadow: '0 0 20px rgba(16,185,129,0.3)' }}
        >
          {countdownStr}
        </div>
      </motion.div>

      {/* Challenge Title Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-[#141414] border border-[#1f2937] p-5 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#10b981]/15 flex items-center justify-center text-2xl">
            🎯
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[#e2e8f0]">{challenge.title}</h2>
            <p className="text-sm text-[#9ca3af] mt-0.5">{challenge.description}</p>
          </div>
        </div>

        {/* Nationality Requirements */}
        {challenge.nationalityRequirements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">
              <Target className="w-3.5 h-3.5" />
              Цель — выставить всех:
            </div>
            <div className="space-y-2">
              {challenge.nationalityRequirements.map((req: NationalityRequirement, idx: number) => (
                <motion.div
                  key={req.nationality}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.08 }}
                  className="flex items-center gap-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-3"
                >
                  <span className="text-2xl">{req.flag}</span>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-[#e2e8f0]">{req.nationality}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-[#10b981]">×{req.count}</span>
                    <span className="text-xs text-[#9ca3af]">игроков</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Era Restriction */}
        {challenge.eraRestriction && (
          <div className="flex items-center gap-2 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 p-3">
            <span className="text-lg">📅</span>
            <span className="text-sm text-[#f59e0b] font-medium">
              Эпоха: {challenge.eraRestriction.start}–{challenge.eraRestriction.end}
            </span>
          </div>
        )}

        {/* Formation Lock */}
        {challenge.formationLock && (
          <div className="flex items-center gap-2 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 p-3">
            <span className="text-lg">📐</span>
            <span className="text-sm text-[#3b82f6] font-medium">
              Схема: {challenge.formationLock}
            </span>
          </div>
        )}

        {/* Bonus description */}
        {challenge.bonusDescription && (
          <div className="flex items-center gap-2 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 p-3">
            <Zap className="w-4 h-4 text-[#a855f7] shrink-0" />
            <span className="text-sm text-[#a855f7] font-medium">{challenge.bonusDescription}</span>
          </div>
        )}
      </motion.div>

      {/* Completion Odds */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl bg-[#141414] border border-[#1f2937] p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#fbbf24]" />
            <span className="text-sm font-semibold text-[#e2e8f0]">Шанс выполнения</span>
          </div>
          <span className="text-lg font-black text-[#fbbf24]">{challenge.completionOdds}%</span>
        </div>
        <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${challenge.completionOdds}%` }}
            transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: challenge.completionOdds > 50
                ? 'linear-gradient(90deg, #22c55e, #10b981)'
                : challenge.completionOdds > 25
                  ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                  : 'linear-gradient(90deg, #ef4444, #dc2626)',
            }}
          />
        </div>
      </motion.div>

      {/* Attempts Counter */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-[#141414] border border-[#1f2937] p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#e2e8f0]">Попытки</span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: challenge.maxAttempts }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  i < attemptsUsed
                    ? 'bg-[#ef4444]/15 border-[#ef4444]/30 text-[#ef4444]'
                    : 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                }`}
              >
                {i < attemptsUsed ? '✗' : i + 1}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-[#9ca3af] mt-1.5">
          Осталось {attemptsLeft} из {challenge.maxAttempts}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="space-y-3"
      >
        {attemptsLeft > 0 ? (
          <Button
            onClick={handleStart}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#10b981] hover:to-[#059669] text-white rounded-xl transition-all active:scale-[0.97]"
          >
            🎯 Начать челлендж ({attemptsLeft} попыток)
          </Button>
        ) : (
          <div className="w-full h-14 flex items-center justify-center rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] font-semibold">
            Попытки закончились — ждите завтра
          </div>
        )}

        {canReroll && (
          <Button
            onClick={handleReroll}
            variant="outline"
            className="w-full h-11 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10 hover:text-[#fbbf24] rounded-xl font-semibold transition-all active:scale-[0.97]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Перегенерировать (1 раз)
          </Button>
        )}

        {rerollUsed && (
          <div className="text-center text-xs text-[#9ca3af]/50">
            Перегенерация уже использована
          </div>
        )}
      </motion.div>

      {/* Info footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] p-3 text-center"
      >
        <p className="text-xs text-[#9ca3af]/60">
          ⚡ Одинаковые условия для всех игроков каждый день.
          <br />
          Попытки обновляются в полночь (МСК).
        </p>
      </motion.div>
    </motion.div>
  );
}
