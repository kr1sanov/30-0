'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import type { Achievement } from '@/lib/types';

export default function AchievementUnlocked() {
  const { newAchievements, dismissAchievement } = useGameStore();

  const currentAchievement: Achievement | null = newAchievements[0] ?? null;

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!currentAchievement) return;

    const timer = setTimeout(() => {
      dismissAchievement();
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentAchievement, dismissAchievement]);

  const handleContinue = useCallback(() => {
    dismissAchievement();
  }, [dismissAchievement]);

  return (
    <AnimatePresence>
      {currentAchievement && (
        <motion.div
          key={currentAchievement.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleContinue}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotateY: 180 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-80 rounded-3xl bg-gradient-to-b from-yellow-500/20 to-[#0d2d0d] border-2 border-yellow-500/50 p-8 text-center shadow-[0_0_60px_rgba(234,179,8,0.3)]"
          >
            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-lg pointer-events-none"
                style={{
                  top: `${15 + Math.random() * 70}%`,
                  left: `${10 + Math.random() * 80}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.2,
                  delay: 0.3 + i * 0.15,
                  repeat: Infinity,
                  repeatDelay: 1.5,
                }}
              >
                ✨
              </motion.div>
            ))}

            {/* Animated trophy */}
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
              className="text-5xl mb-4"
            >
              🏆
            </motion.div>

            {/* Title */}
            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-black text-yellow-400 mb-3"
            >
              ДОСТИЖЕНИЕ ОТКРЫТО!
            </motion.h3>

            {/* Achievement icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.3, stiffness: 200, damping: 12 }}
              className="text-4xl mb-2"
            >
              {currentAchievement.icon}
            </motion.div>

            {/* Achievement name */}
            <motion.p
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg font-bold text-[#e2e8f0]"
            >
              {currentAchievement.name}
            </motion.p>

            {/* Achievement description */}
            <motion.p
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-[#94a3b8] mt-1"
            >
              {currentAchievement.description}
            </motion.p>

            {/* Continue button */}
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContinue}
              className="mt-6 px-6 py-2 rounded-xl bg-yellow-500 text-black font-bold text-sm hover:bg-yellow-400 transition-colors"
            >
              Продолжить
            </motion.button>

            {/* Progress indicator if more achievements */}
            {newAchievements.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-3 text-xs text-[#94a3b8]"
              >
                Ещё {newAchievements.length - 1} достижени{newAchievements.length - 1 === 1 ? 'е' : newAchievements.length - 1 < 5 ? 'я' : 'й'}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
