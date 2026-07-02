'use client';

import { useGameStore } from '@/store/gameStore';
import { Home } from 'lucide-react';

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
  const { screen, goHome } = useGameStore();

  // Mode 1: Home screen — hide everything
  if (screen === 'home') {
    return null;
  }

  // Mode 2: Game screens — subtle overlay home button
  if (GAME_SCREENS.has(screen)) {
    return (
      <button
        onClick={goHome}
        className="fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-full opacity-30 hover:opacity-80 transition-opacity duration-200 text-white/80 hover:text-white"
        aria-label="Домой"
        title="Домой"
      >
        <Home className="w-[18px] h-[18px]" />
      </button>
    );
  }

  // Mode 3: Setup, profile, leaderboard — minimal centered title
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1a3a1a]/80 bg-[#0a1a0a]/90 backdrop-blur-md">
      <div className="max-w-4xl mx-auto flex items-center justify-center h-12 px-4">
        <span className="text-xl font-black text-[#22c55e]">
          30-0
        </span>
      </div>
    </header>
  );
}
