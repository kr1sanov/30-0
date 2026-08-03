'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { Home, User, Menu, X, Play, Users, Trophy, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

export default function Header() {
  const { screen, goHome, resetGame, runId } = useGameStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
  };

  const handleNav = (action: () => void) => {
    action();
    setMobileMenuOpen(false);
  };

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Главная',
      icon: <Home className="w-4 h-4" />,
      action: handleHome,
    },
    {
      id: 'play',
      label: 'Играть',
      icon: <Play className="w-4 h-4" />,
      action: () => {
        const state = useGameStore.getState();
        if (state.runId) {
          state.resumeGame();
        } else {
          state.setScreen('setup');
        }
      },
    },
    {
      id: 'multiplayer',
      label: 'Мультиплеер',
      icon: <Users className="w-4 h-4" />,
      action: () => {},
      badge: 'Скоро',
    },
    {
      id: 'how-it-works',
      label: 'Как это работает',
      icon: <BookOpen className="w-4 h-4" />,
      action: () => setShowHowToPlay(true),
    },
    {
      id: 'leaderboard',
      label: 'Лидерборд',
      icon: <Trophy className="w-4 h-4" />,
      action: () => useGameStore.getState().setScreen('leaderboard'),
    },
  ];

  // Mode 2: Game screens — subtle overlay buttons
  if (GAME_SCREENS.has(screen)) {
    return (
      <>
        <button
          onClick={() => handleHome()}
          className="fixed z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-white/[0.08] text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-[#222] transition-all duration-200"
          style={{ top: 16, left: 12 }}
          aria-label="Домой"
          title="Домой"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Домой</span>
        </button>

        <button
          onClick={() => useGameStore.getState().setScreen('profile')}
          className="fixed z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-white/[0.08] text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-[#222] transition-all duration-200"
          style={{ top: 16, right: 12 }}
          aria-label="Мой профиль"
          title="Мой профиль"
        >
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Мой профиль</span>
        </button>

        <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/[0.06]">
        <div className="mx-auto flex items-center justify-between h-14 px-4 lg:px-6">
          {/* Left: Home button (38-0 style — dark rounded button with icon + text) */}
          <button
            onClick={handleHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-white/[0.08] text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-[#222] hover:border-white/[0.12] transition-all duration-200 active:scale-[0.97]"
            aria-label="Домой"
          >
            <Home className="w-4 h-4" />
            <span>Домой</span>
          </button>

          {/* Desktop Navigation (≥768px) — center section */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.filter(item => item.id !== 'home').map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.action)}
                className={`
                  relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${item.badge
                    ? 'text-[#9CA3AF] hover:text-white/70 cursor-default'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] active:scale-[0.97]'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[#00C896]/15 text-[#00C896]">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right: My Profile button (38-0 style — dark rounded button with icon + text) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => useGameStore.getState().setScreen('profile')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-white/[0.08] text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-[#222] hover:border-white/[0.12] transition-all duration-200 active:scale-[0.97]"
              title="Мой профиль"
            >
              <User className="w-4 h-4" />
              <span>Мой профиль</span>
            </button>

            {/* Mobile hamburger menu button (<768px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-in menu panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-[70] w-[280px] bg-[#0F0F0F] border-r border-white/[0.06] md:hidden flex flex-col"
            >
              {/* Menu header */}
              <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.06]">
                <span className="text-xl font-bold tracking-tight">
                  <span className="text-[#00C896]">30</span>
                  <span className="text-white/40">-</span>
                  <span className="text-white">0</span>
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                  aria-label="Закрыть меню"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation links */}
              <nav className="flex-1 py-3 px-2 overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.action)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${item.badge
                        ? 'text-[#9CA3AF] cursor-default'
                        : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] active:scale-[0.98]'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#00C896]/15 text-[#00C896]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}

                {/* Separator */}
                <div className="my-3 mx-4 h-px bg-white/[0.06]" />

                {/* Story link */}
                <button
                  onClick={() => handleNav(() => {})}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#9CA3AF] cursor-default transition-all duration-200"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>История</span>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#00C896]/15 text-[#00C896]">
                    Скоро
                  </span>
                </button>
              </nav>

              {/* Menu footer */}
              <div className="px-4 py-3 border-t border-white/[0.06]">
                <p className="text-[11px] text-[#9CA3AF]/50">
                  &copy; 2026 30-0. Все права защищены.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}
