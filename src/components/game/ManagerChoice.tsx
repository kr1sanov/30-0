'use client';

import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function ManagerChoice() {
  const { simulate, spinManager, currentManager, isSpinningManager } = useGameStore();
  const [showSpinAnimation, setShowSpinAnimation] = useState(false);

  const handleSpinManager = async () => {
    setShowSpinAnimation(true);
    await spinManager();
    setTimeout(() => setShowSpinAnimation(false), 500);
  };

  const handleWithManager = () => {
    simulate(currentManager);
  };

  const handleWithoutManager = () => {
    simulate(null);
  };

  return (
    <div className="rounded-2xl bg-[#1a1a2e] p-6 space-y-4 border border-[#1a1a2e]">
      <h3 className="text-lg font-bold text-[#e2e8f0] text-center">
        Играть с тренером?
      </h3>

      <p className="text-sm text-[#94a3b8] text-center">
        Тренер даёт <span className="text-[#22c55e] font-bold">+2 к рейтингу</span> команды в симуляции
      </p>

      <AnimatePresence mode="wait">
        {currentManager ? (
          <motion.div
            key="manager-result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="rounded-xl bg-gradient-to-b from-[#22c55e]/10 to-transparent p-4 border border-[#22c55e]/20 text-center"
          >
            <div className="text-3xl mb-2">👨‍💼</div>
            <div className="text-base font-bold text-[#e2e8f0]">{currentManager.name}</div>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="text-xs text-[#94a3b8]">{currentManager.nationality}</span>
              <span className="text-xs text-[#94a3b8]">·</span>
              <span className="text-xs text-[#94a3b8]">{currentManager.era}</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#22c55e]/15 px-3 py-1">
              <span className="text-xs font-bold text-[#22c55e]">Рейтинг: {currentManager.rating}</span>
              {currentManager.specialAbility && (
                <>
                  <span className="text-xs text-[#94a3b8]">·</span>
                  <span className="text-xs text-[#94a3b8]">{currentManager.specialAbility}</span>
                </>
              )}
            </div>
          </motion.div>
        ) : showSpinAnimation || isSpinningManager ? (
          <motion.div
            key="spinning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl bg-[#0a0a0f] p-6 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="text-3xl mb-2"
            >
              🎲
            </motion.div>
            <div className="text-sm text-[#94a3b8]">Крутим тренера...</div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-3">
        {!currentManager && !isSpinningManager && (
          <Button
            onClick={handleSpinManager}
            className="w-full h-12 text-sm font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20"
          >
            🎲 Крутить тренера
          </Button>
        )}

        {currentManager && (
          <Button
            onClick={handleWithManager}
            className="w-full h-12 text-sm font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20"
          >
            Играть с {currentManager.name.split(' ')[0]} (+2)
          </Button>
        )}

        {currentManager && (
          <button
            onClick={handleSpinManager}
            disabled={isSpinningManager}
            className="w-full text-xs text-[#94a3b8] hover:text-[#22c55e] transition-colors py-2"
          >
            🔄 Крутить ещё раз
          </button>
        )}

        <Button
          onClick={handleWithoutManager}
          variant="outline"
          className="w-full h-12 text-sm font-medium border-[#94a3b8]/30 text-[#94a3b8] hover:bg-[#0a0a0f] rounded-xl"
        >
          Без тренера (классика)
        </Button>
      </div>
    </div>
  );
}
