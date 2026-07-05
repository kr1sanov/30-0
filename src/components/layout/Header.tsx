'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { useSound } from '@/hooks/use-sound';
import { Home, User, Trophy, HelpCircle, Volume2, VolumeX } from 'lucide-react';

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
          className="fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 opacity-50 hover:opacity-100 transition-opacity duration-200 text-white/70 hover:text-white"
          aria-label="Домой"
          title="Домой"
        >
          <Home className="w-[18px] h-[18px]" />
        </button>

        {/* Subtle profile button — top right */}
        <button
          onClick={() => useGameStore.getState().setScreen('profile')}
          className="fixed top-3 right-3 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 opacity-50 hover:opacity-100 transition-opacity duration-200 text-white/70 hover:text-white"
          aria-label="Профиль"
          title="Профиль"
        >
          <User className="w-[18px] h-[18px]" />
        </button>

        <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  // Mode 3: Setup, profile, leaderboard — normal header with buttons
  const handleHome = () => {
    if (screen === 'home') return;
    if (runId) {
      goHome();
    } else {
      resetGame();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#1a3a1a]/80 bg-[#0a1a0a]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-12 px-3">
          {/* Left: Home button */}
          <button
            onClick={handleHome}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity group"
            aria-label="Домой"
          >
            <Home className="w-5 h-5 text-[#22c55e] group-hover:text-[#16a34a] transition-colors" />
          </button>

          {/* Right: Navigation buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleSound}
              className="p-2 text-[#94a3b8] hover:text-[#22c55e] rounded-lg hover:bg-[#22c55e]/10 transition-all"
              title={soundOn ? 'Выключить звук' : 'Включить звук'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              className="p-2 text-[#94a3b8] hover:text-[#22c55e] rounded-lg hover:bg-[#22c55e]/10 transition-all"
              title="Как играть"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => useGameStore.getState().setScreen('profile')}
              className="p-2 text-[#94a3b8] hover:text-[#e2e8f0] rounded-lg hover:bg-[#0d2d0d] transition-all"
              title="Профиль"
            >
              <User className="w-4 h-4" />
            </button>

            <button
              onClick={() => useGameStore.getState().loadLeaderboard()}
              className="p-2 text-[#94a3b8] hover:text-[#e2e8f0] rounded-lg hover:bg-[#0d2d0d] transition-all"
              title="Лидерборд"
            >
              <Trophy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}
