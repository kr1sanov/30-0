'use client';

import { useGameStore } from '@/store/gameStore';

const NO_HEADER_SCREENS = new Set([
  'home',
  'setup',
  'draft',
  'position-assign',
  'squad-complete',
]);

export default function Header() {
  const { screen } = useGameStore();

  // No header on home, setup, draft, position-assign, or squad-complete
  if (NO_HEADER_SCREENS.has(screen)) {
    return null;
  }

  // Other screens (profile, leaderboard, etc.) — minimal centered title
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
