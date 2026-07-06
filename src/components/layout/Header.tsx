'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { useSound } from '@/hooks/use-sound';
import { Home, User, HelpCircle, Volume2, VolumeX } from 'lucide-react';

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

  // Mode 1: Home screen — show a minimal header with navigation
  if (screen === 'home') {
    return (
      <header className="sticky top-0 z-50 w-full bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#1E1E1E]/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-12 px-4">
          {/* Left: Home indicator */}
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-[#00C896]" />
            <span className="text-sm font-semibold text-[#9CA3AF]">Главная</span>
          </div>

          {/* Right: Navigation buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleSound}
              className="p-2 text-[#9CA3AF] hover:text-[#00C896] rounded-lg hover:bg-[#141414] transition-all"
              title={soundOn ? 'Выключить звук' : 'Включить звук'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              className="p-2 text-[#9CA3AF] hover:text-[#00C896] rounded-lg hover:bg-[#141414] transition-all"
              title="Как играть"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => useGameStore.getState().setScreen('profile')}
              className="p-2 text-[#9CA3AF] hover:text-[#FFFFFF] rounded-lg hover:bg-[#141414] transition-all"
              title="Профиль"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
    );
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

  // Mode 3: Setup, profile, etc. — normal header with buttons
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
      <header className="sticky top-0 z-50 w-full border-b border-[#1E1E1E]/50 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-12 px-4">
          {/* Left: Home button */}
          <button
            onClick={handleHome}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity group"
            aria-label="Домой"
          >
            <Home className="w-5 h-5 text-[#00C896] group-hover:text-[#00A67A] transition-colors" />
          </button>

          {/* Right: Navigation buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleSound}
              className="p-2 text-[#9CA3AF] hover:text-[#00C896] rounded-lg hover:bg-[#141414] transition-all"
              title={soundOn ? 'Выключить звук' : 'Включить звук'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              className="p-2 text-[#9CA3AF] hover:text-[#00C896] rounded-lg hover:bg-[#141414] transition-all"
              title="Как играть"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => useGameStore.getState().setScreen('profile')}
              className="p-2 text-[#9CA3AF] hover:text-[#FFFFFF] rounded-lg hover:bg-[#141414] transition-all"
              title="Профиль"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}
