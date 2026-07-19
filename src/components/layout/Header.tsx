'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { Home, User, Menu, X, Play, Users, Trophy, BookOpen } from 'lucide-react';
import { useTelegram } from '@/hooks/use-telegram';
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
  const { haptic, isTelegram, safeAreaInset } = useTelegram();

  const handleHaptic = () => {
    haptic('light');
  };

  // Listen for custom event from Footer "How it works" link
  useEffect(() => {
    const handler = () => setShowHowToPlay(true);
    window.addEventListener('open-how-to-play', handler);
    return () => window.removeEventListener('open-how-to-play', handler);
  }, []);

  const handleHome = () => {
    handleHaptic();
    if (runId) {
      goHome();
    } else {
      resetGame();
    }
    setMobileMenuOpen(false);
  };

  const handleNav = (action: () => void) => {
    handleHaptic();
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
      label: 'Home',
      icon: <Home className="w-4 h-4" />,
      action: handleHome,
    },
    {
      id: 'play',
      label: 'Play',
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
      label: 'Multiplayer',
      icon: <Users className="w-4 h-4" />,
      action: () => {},
      badge: 'Скоро',
    },
    {
      id: 'how-it-works',
      label: 'How it works',
      icon: <BookOpen className="w-4 h-4" />,
      action: () => setShowHowToPlay(true),
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: <Trophy className="w-4 h-4" />,
      action: () => useGameStore.getState().setScreen('leaderboard'),
    },
  ];

  // Mode 2: Game screens — subtle overlay buttons (respect safe area)
  if (GAME_SCREENS.has(screen)) {
    const topOffset = isTelegram && safeAreaInset.top > 0 ? safeAreaInset.top + 4 : 16;

    return (
      <>
        <button
          onClick={() => { handleHaptic(); handleHome(); }}
          className="fixed z-50 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity duration-200 text-white/80 hover:text-white"
          style={{ top: topOffset, left: 12 }}
          aria-label="Домой"
          title="Домой"
        >
          <Home className="w-5 h-5" />
        </button>

        <button
          onClick={() => { handleHaptic(); useGameStore.getState().setScreen('profile'); }}
          className="fixed z-50 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity duration-200 text-white/80 hover:text-white"
          style={{ top: topOffset, right: 12 }}
          aria-label="Профиль"
          title="Профиль"
        >
          <User className="w-5 h-5" />
        </button>

        <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/[0.06]">
        <div
          className="mx-auto flex items-center justify-between h-14 px-4 lg:px-6"
          style={isTelegram && safeAreaInset.top > 0 ? { paddingTop: safeAreaInset.top } : undefined}
        >
          {/* Left: Logo */}
          <button
            onClick={handleHome}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
            aria-label="На главную"
          >
            <span className="text-xl font-bold tracking-tight">
              <span className="text-[#00C896]">30</span>
              <span className="text-white/40">-</span>
              <span className="text-white">0</span>
            </span>
          </button>

          {/* Desktop Navigation (≥768px) */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
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

          {/* Right: Account + Mobile Menu */}
          <div className="flex items-center gap-1">
            {/* Account button */}
            <button
              onClick={() => { handleHaptic(); useGameStore.getState().setScreen('profile'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-all duration-200 active:scale-[0.97]"
              title="Мой аккаунт"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Мой аккаунт</span>
            </button>

            {/* Mobile hamburger menu button (<768px) */}
            <button
              onClick={() => { handleHaptic(); setMobileMenuOpen(!mobileMenuOpen); }}
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
              style={isTelegram && safeAreaInset.top > 0 ? { paddingTop: safeAreaInset.top } : undefined}
            >
              {/* Menu header */}
              <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.06]">
                <button
                  onClick={handleHome}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <span className="text-xl font-bold tracking-tight">
                    <span className="text-[#00C896]">30</span>
                    <span className="text-white/40">-</span>
                    <span className="text-white">0</span>
                  </span>
                </button>
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
                  <span>Story</span>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#00C896]/15 text-[#00C896]">
                    Скоро
                  </span>
                </button>

                {/* Telegram link */}
                <a
                  href="https://t.me/RPL30_bot/app?startapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { handleHaptic(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  <span>Telegram</span>
                </a>
              </nav>

              {/* Menu footer */}
              <div className="px-4 py-3 border-t border-white/[0.06]">
                <p className="text-[11px] text-[#9CA3AF]/50">
                  © 2026 30-0. Все права защищены.
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
