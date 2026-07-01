'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import HowToPlayModal from '@/components/game/HowToPlayModal';

type TabId = 'home' | 'play' | 'profile' | 'leaderboard' | 'help';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

function getActiveTab(screen: string): TabId {
  if (screen === 'home' || screen === 'setup') return 'home';
  if (screen === 'profile') return 'profile';
  if (screen === 'leaderboard') return 'leaderboard';
  if (['draft', 'position-assign', 'squad-complete', 'manager-choice', 'simulation', 'result'].includes(screen)) return 'play';
  return 'home';
}

export default function Footer() {
  const { screen } = useGameStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const activeTab = getActiveTab(screen);

  const handleTabClick = (tabId: TabId) => {
    switch (tabId) {
      case 'home': {
        const state = useGameStore.getState();
        // If there's an active draft, go home without clearing game state
        if (state.runId) {
          state.goHome();
        } else {
          state.resetGame();
        }
        break;
      }
      case 'play': {
        const state = useGameStore.getState();
        // If there's an active draft, resume it
        if (state.runId) {
          state.resumeGame();
        } else {
          state.setScreen('setup');
        }
        break;
      }
      case 'profile':
        useGameStore.getState().setScreen('profile');
        break;
      case 'leaderboard':
        useGameStore.getState().loadLeaderboard();
        break;
      case 'help':
        setShowHowToPlay(true);
        break;
    }
  };

  const tabs: TabDef[] = [
    {
      id: 'home',
      label: 'Главная',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
    },
    {
      id: 'play',
      label: 'Играть',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M10 9l5 3-5 3V9z" fill="#0a1a0a" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M10 9l5 3-5 3V9z" fill="#0a1a0a" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Профиль',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
      ),
    },
    {
      id: 'leaderboard',
      label: 'Лидерборд',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      ),
    },
    {
      id: 'help',
      label: 'Помощь',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Tab Bar — fixed to bottom */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden footer-gradient-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-[#0a1a0a]/95 backdrop-blur-md">
          <div className="flex items-center justify-around h-16">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isPlay = tab.id === 'play';

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] h-14 transition-colors ${
                    isPlay ? '-mt-4' : ''
                  }`}
                >
                  {isPlay ? (
                    <motion.div
                      className={`flex items-center justify-center rounded-2xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white shadow-lg shadow-[#22c55e]/40 w-14 h-14'
                          : 'bg-[#0d2d0d] text-[#94a3b8] w-12 h-12'
                      }`}
                      animate={isActive ? {
                        boxShadow: [
                          '0 0 15px rgba(34, 197, 94, 0.3)',
                          '0 0 25px rgba(34, 197, 94, 0.5)',
                          '0 0 15px rgba(34, 197, 94, 0.3)',
                        ],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {isActive ? tab.activeIcon : tab.icon}
                    </motion.div>
                  ) : (
                    <span className={`relative ${isActive ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
                      {isActive ? tab.activeIcon : tab.icon}
                      {/* Active dot indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeTabDot"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#22c55e]"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-medium leading-tight transition-colors ${
                      isActive ? 'text-[#22c55e]' : 'text-[#94a3b8]'
                    }`}
                  >
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Desktop Footer — normal flow */}
      <footer className="hidden sm:block w-full bg-[#0a1a0a] mt-auto footer-gradient-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Desktop nav links */}
            <div className="flex items-center gap-5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const isPlay = tab.id === 'play';

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors relative ${
                      isPlay
                        ? 'px-4 py-2 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white shadow-lg shadow-[#22c55e]/25'
                        : isActive
                        ? 'text-[#22c55e]'
                        : 'text-[#94a3b8] hover:text-[#e2e8f0]'
                    }`}
                  >
                    <span className={isPlay ? 'w-5 h-5' : 'w-4 h-4'}>{tab.icon}</span>
                    {tab.label}
                    {/* Active indicator for non-play tabs */}
                    {isActive && !isPlay && (
                      <motion.div
                        layoutId="desktopActiveTab"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#22c55e] rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Copyright */}
            <div className="text-xs text-[#94a3b8]/40">
              © 2025 30-0 RPL
            </div>
          </div>
        </div>
      </footer>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </>
  );
}
