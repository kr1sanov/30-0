'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { useSound } from '@/hooks/use-sound';

export default function Header() {
  const { screen, resetGame } = useGameStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const { toggle, isEnabled } = useSound();
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isEnabled());
  }, [isEnabled]);

  const handleToggleSound = () => {
    const newState = toggle();
    setSoundOn(newState);
  };

  const isPlaying = screen !== 'home' && screen !== 'setup' && screen !== 'profile' && screen !== 'leaderboard';

  const handleHome = () => {
    if (screen === 'home') return;
    resetGame();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#1a1a2e]/80 bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <button
            onClick={handleHome}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
          >
            <span className="text-xl">⚽</span>
            <span className="text-2xl font-black text-[#22c55e] group-hover:text-[#16a34a] transition-colors">
              30-0
            </span>
            <span className="text-xs font-medium text-[#94a3b8] hidden sm:inline">
              RPL Драфт
            </span>
          </button>

          {/* Navigation */}
          <div className="flex items-center gap-1.5">
            {isPlaying && (
              <button
                onClick={resetGame}
                className="px-3 py-1.5 text-xs font-bold text-[#ef4444] hover:text-[#fca5a5] rounded-lg hover:bg-[#ef4444]/10 transition-all flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                </svg>
                Рестарт
              </button>
            )}

            <button
              onClick={handleToggleSound}
              className="px-3 py-1.5 text-sm font-medium text-[#94a3b8] hover:text-[#22c55e] rounded-lg hover:bg-[#22c55e]/10 transition-all"
              title={soundOn ? 'Выключить звук' : 'Включить звук'}
            >
              <span className="hidden sm:inline">{soundOn ? '🔊 Звук' : '🔇 Звук'}</span>
              <span className="sm:hidden">{soundOn ? '🔊' : '🔇'}</span>
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              className="px-3 py-1.5 text-sm font-medium text-[#94a3b8] hover:text-[#22c55e] rounded-lg hover:bg-[#22c55e]/10 transition-all"
            >
              <span className="hidden sm:inline">Как играть</span>
              <span className="sm:hidden">❓</span>
            </button>

            <button
              onClick={() => useGameStore.getState().loadLeaderboard()}
              className="px-3 py-1.5 text-sm font-medium text-[#94a3b8] hover:text-[#e2e8f0] rounded-lg hover:bg-[#1a1a2e] transition-all"
            >
              <span className="hidden sm:inline">Лидерборд</span>
              <span className="sm:hidden">🏆</span>
            </button>
          </div>
        </div>
      </header>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}
