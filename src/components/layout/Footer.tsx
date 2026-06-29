'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';

export default function Footer() {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <>
      <footer className="w-full border-t border-[#1a1a2e]/80 bg-[#0a0a0f] mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Links */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => useGameStore.getState().resetGame()}
                className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              >
                Главная
              </button>
              <button
                onClick={() => setShowHowToPlay(true)}
                className="text-sm text-[#94a3b8] hover:text-[#22c55e] transition-colors"
              >
                Как играть
              </button>
              <button
                onClick={() => useGameStore.getState().loadLeaderboard()}
                className="text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
              >
                Лидерборд
              </button>
            </div>

            {/* Copyright */}
            <div className="text-xs text-[#94a3b8]/60">
              © 2025 30-0 RPL. Футбольный драфт.
            </div>
          </div>
        </div>
      </footer>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}
