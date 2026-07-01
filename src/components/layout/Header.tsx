'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { useSound } from '@/hooks/use-sound';
import { Home, User } from 'lucide-react';

const GAME_SCREENS = new Set([
  'draft',
  'position-assign',
  'squad-complete',
  'pre-match',
  'manager-choice',
  'simulation',
  'result',
  'awards',
]);

export default function Header() {
  const { screen, goHome, resetGame, runId } = useGameStore();
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

  // Mode 1: Home screen — hide everything
  if (screen === 'home') {
    return null;
  }

  // Mode 2: Game screens — subtle overlay buttons
  if (GAME_SCREENS.has(screen)) {
    return (
      <>
        {/* Subtle home button — top left */}
        <button
          onClick={goHome}
          className="fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-full opacity-30 hover:opacity-80 transition-opacity duration-200 text-white/80 hover:text-white"
          aria-label="Домой"
          title="Домой"
        >
          <Home className="w-[18px] h-[18px]" />
        </button>

        {/* Subtle profile button — top right */}
        <button
          onClick={() => useGameStore.getState().setScreen('profile')}
          className="fixed top-3 right-3 z-50 w-9 h-9 flex items-center justify-center rounded-full opacity-30 hover:opacity-80 transition-opacity duration-200 text-white/80 hover:text-white"
          aria-label="Профиль"
          title="Профиль"
        >
          <User className="w-[18px] h-[18px]" />
        </button>
      </>
    );
  }

  // Mode 3: Setup, profile, leaderboard — normal header
  const handleHome = () => {
    if (screen === 'home') return;
    // If there's an active draft, go home without clearing game state
    if (runId) {
      goHome();
    } else {
      resetGame();
    }
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
              onClick={() => useGameStore.getState().setScreen('profile')}
              className="px-3 py-1.5 text-sm font-medium text-[#94a3b8] hover:text-[#e2e8f0] rounded-lg hover:bg-[#1a1a2e] transition-all"
            >
              <span className="hidden sm:inline">Профиль</span>
              <span className="sm:hidden">👤</span>
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
