'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { Home, User } from 'lucide-react';

const GAME_SCREENS = new Set([
  'setup',
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

  // Listen for custom event from Footer "How it works" link
  useEffect(() => {
    const handler = () => setShowHowToPlay(true);
    window.addEventListener('open-how-to-play', handler);
    return () => window.removeEventListener('open-how-to-play', handler);
  }, []);

  const handleHome = () => {
    if (runId) {
      goHome();
    } else {
      resetGame();
    }
  };

  const btnClass = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a]/80 border border-white/[0.08] text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-[#222] hover:border-white/[0.12] transition-all duration-200 active:scale-[0.97] backdrop-blur-sm";

  // Mode 2: Game screens — sticky header bar (same style as home screen)
  if (GAME_SCREENS.has(screen)) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full bg-[#0A0A0A]/70 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="mx-auto flex items-center justify-between h-14 px-4 lg:px-6">
            {/* Left: Home button */}
            <button
              onClick={handleHome}
              className={btnClass}
              aria-label="Домой"
            >
              <Home className="w-4 h-4" />
              <span>Домой</span>
            </button>

            {/* Right: My Profile button */}
            <button
              onClick={() => useGameStore.getState().setScreen('profile')}
              className={btnClass}
              title="Мой профиль"
            >
              <User className="w-4 h-4" />
              <span>Мой профиль</span>
            </button>
          </div>
        </header>

        <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  return (
    <>
      {/* Semi-transparent header with football field background */}
      <header className="sticky top-0 z-50 w-full bg-[#0A0A0A]/70 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="mx-auto flex items-center justify-between h-14 px-4 lg:px-6">
          {/* Left: Home button (38-0 style) */}
          <button
            onClick={handleHome}
            className={btnClass}
            aria-label="Домой"
          >
            <Home className="w-4 h-4" />
            <span>Домой</span>
          </button>

          {/* Right: My Profile button (38-0 style) */}
          <button
            onClick={() => useGameStore.getState().setScreen('profile')}
            className={btnClass}
            title="Мой профиль"
          >
            <User className="w-4 h-4" />
            <span>Мой профиль</span>
          </button>
        </div>
      </header>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}
