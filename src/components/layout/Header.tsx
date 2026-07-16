'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { Home, User, HelpCircle } from 'lucide-react';
import { useTelegram } from '@/hooks/use-telegram';

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
  const { haptic, isTelegram, safeAreaInset } = useTelegram();

  const handleHaptic = () => {
    haptic('light');
  };

  // Mode 1: Home screen — show a minimal header with navigation
  if (screen === 'home') {
    return (
      <header className="sticky top-0 z-50 w-full bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#1E1E1E]/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
          {/* Left: Home indicator */}
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-[#00C896]" />
            <span className="text-sm font-semibold text-[#9CA3AF]">Главная</span>
          </div>

          {/* Right: Navigation buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { handleHaptic(); setShowHowToPlay(true); }}
              className="p-2.5 text-[#9CA3AF] hover:text-[#00C896] rounded-lg hover:bg-[#141414] transition-all"
              title="Как играть"
            >
              <HelpCircle className="w-6 h-6" />
            </button>

            <button
              onClick={() => { handleHaptic(); useGameStore.getState().setScreen('profile'); }}
              className="p-2.5 text-[#9CA3AF] hover:text-[#FFFFFF] rounded-lg hover:bg-[#141414] transition-all"
              title="Профиль"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Mode 2: Game screens — subtle overlay buttons (respect safe area)
  if (GAME_SCREENS.has(screen)) {
    // In Telegram, adjust top position for safe area (notch/dynamic island)
    const topOffset = isTelegram && safeAreaInset.top > 0 ? safeAreaInset.top + 4 : 16;

    return (
      <>
        {/* Subtle home button — top left */}
        <button
          onClick={() => { handleHaptic(); goHome(); }}
          className="fixed z-50 w-11 h-11 flex items-center justify-center rounded-full bg-black/30 opacity-50 hover:opacity-100 transition-opacity duration-200 text-white/70 hover:text-white"
          style={{ top: topOffset, left: 16 }}
          aria-label="Домой"
          title="Домой"
        >
          <Home className="w-6 h-6" />
        </button>

        {/* Subtle profile button — top right */}
        <button
          onClick={() => { handleHaptic(); useGameStore.getState().setScreen('profile'); }}
          className="fixed z-50 w-11 h-11 flex items-center justify-center rounded-full bg-black/30 opacity-50 hover:opacity-100 transition-opacity duration-200 text-white/70 hover:text-white"
          style={{ top: topOffset, right: 16 }}
          aria-label="Профиль"
          title="Профиль"
        >
          <User className="w-6 h-6" />
        </button>

        <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  // Mode 3: Setup, profile, etc. — normal header with buttons
  const handleHome = () => {
    handleHaptic();
    if (runId) {
      goHome();
    } else {
      resetGame();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#1E1E1E]/50 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
          {/* Left: Home button */}
          <button
            onClick={handleHome}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity group"
            aria-label="Домой"
          >
            <Home className="w-6 h-6 text-[#00C896] group-hover:text-[#00A67A] transition-colors" />
          </button>

          {/* Right: Navigation buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { handleHaptic(); setShowHowToPlay(true); }}
              className="p-2.5 text-[#9CA3AF] hover:text-[#00C896] rounded-lg hover:bg-[#141414] transition-all"
              title="Как играть"
            >
              <HelpCircle className="w-6 h-6" />
            </button>

            <button
              onClick={() => { handleHaptic(); useGameStore.getState().setScreen('profile'); }}
              className="p-2.5 text-[#9CA3AF] hover:text-[#FFFFFF] rounded-lg hover:bg-[#141414] transition-all"
              title="Профиль"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}
