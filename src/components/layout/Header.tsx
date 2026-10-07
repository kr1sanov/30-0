'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { Home, User } from 'lucide-react';

export default function Header({ onHome, onProfile }: { onHome?: () => void; onProfile?: () => void } = {}) {
  const { goHome, resetGame, runId } = useGameStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Listen for custom event from Footer "How it works" link
  useEffect(() => {
    const handler = () => setShowHowToPlay(true);
    window.addEventListener('open-how-to-play', handler);
    return () => window.removeEventListener('open-how-to-play', handler);
  }, []);

  const handleHome = () => {
    if (onHome) { onHome(); return; }
    if (runId) {
      goHome();
    } else {
      resetGame();
    }
  };

  const btnClass = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a]/80 border border-white/[0.08] text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-[#222] hover:border-white/[0.12] transition-all duration-200 active:scale-[0.97] backdrop-blur-sm";

  return (
    <>
      <header className="hidden sm:block sticky top-0 z-50 w-full bg-[#0A0A0A]/70 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="mx-auto flex max-w-4xl items-center justify-between h-14 px-4 lg:px-6">
          <button
            onClick={handleHome}
            className={btnClass}
            aria-label="Домой"
          >
            <Home className="w-4 h-4" />
            <span>Домой</span>
          </button>

          <button
            onClick={onProfile ?? (() => useGameStore.getState().setScreen('profile'))}
            className={btnClass}
            title="Мой профиль"
          >
            <User className="w-4 h-4" />
            <span>Мой профиль</span>
          </button>
        </div>
      </header>

      <nav aria-label="Навигация" className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between border-t border-white/10 bg-[#0A0A0A]/95 px-4 pt-2 backdrop-blur-xl sm:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom), var(--tg-content-safe-bottom, 0px))' }}>
        <button onClick={handleHome} className={btnClass} aria-label="Домой"><Home className="h-4 w-4" /><span>Домой</span></button>
        <button onClick={onProfile ?? (() => useGameStore.getState().setScreen('profile'))} className={btnClass} aria-label="Мой профиль"><User className="h-4 w-4" /><span>Мой профиль</span></button>
      </nav>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}
