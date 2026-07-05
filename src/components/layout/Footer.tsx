'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

type TabId = 'home' | 'play' | 'profile';

function getActiveTab(screen: string): TabId {
  if (screen === 'home' || screen === 'setup') return 'home';
  if (screen === 'profile') return 'profile';
  return 'play';
}

export default function Footer() {
  const { screen } = useGameStore();
  const activeTab = getActiveTab(screen);

  const handleTabClick = (tabId: TabId) => {
    switch (tabId) {
      case 'home': {
        const state = useGameStore.getState();
        if (state.runId) {
          state.goHome();
        } else {
          state.resetGame();
        }
        break;
      }
      case 'play': {
        const state = useGameStore.getState();
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
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode; activeIcon: React.ReactNode }[] = [
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
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z" />
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
  ];

  return (
    <>
      {/* Mobile Tab Bar — fixed to bottom */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden footer-gradient-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-[#0a1a0a]/95 backdrop-blur-md">
          <div className="flex items-center justify-around h-14 px-2">
            {/* Home tab */}
            <motion.button
              onClick={() => handleTabClick('home')}
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-full transition-colors"
            >
              <span className={activeTab === 'home' ? 'text-[#22c55e]' : 'text-[#94a3b8]'}>
                {activeTab === 'home' ? tabs[0].activeIcon : tabs[0].icon}
              </span>
              <span className={`text-[10px] font-medium leading-tight ${activeTab === 'home' ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
                Главная
              </span>
            </motion.button>

            {/* Play tab — centered, rounded, prominent */}
            <motion.button
              onClick={() => handleTabClick('play')}
              whileTap={{ scale: 0.92 }}
              className="flex flex-col items-center justify-center min-w-[56px] h-full"
            >
              <div
                className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                  activeTab === 'play'
                    ? 'bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white shadow-md shadow-[#22c55e]/40 w-12 h-12'
                    : 'bg-gradient-to-br from-[#22c55e]/70 to-[#16a34a]/70 text-white shadow-sm shadow-[#22c55e]/20 w-11 h-11'
                }`}
              >
                {tabs[1].icon}
              </div>
              <span className={`text-[10px] font-medium leading-tight mt-0.5 ${activeTab === 'play' ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
                Играть
              </span>
            </motion.button>

            {/* Profile tab */}
            <motion.button
              onClick={() => handleTabClick('profile')}
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-full transition-colors"
            >
              <span className={activeTab === 'profile' ? 'text-[#22c55e]' : 'text-[#94a3b8]'}>
                {activeTab === 'profile' ? tabs[2].activeIcon : tabs[2].icon}
              </span>
              <span className={`text-[10px] font-medium leading-tight ${activeTab === 'profile' ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
                Профиль
              </span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Spacer for mobile — reserves space for the fixed bottom bar.
          Body already has paddingBottom: env(safe-area-inset-bottom) in layout.tsx,
          so we only need to account for the nav bar height itself. */}
      <div
        className="sm:hidden h-14"
        aria-hidden="true"
      />

      {/* Desktop Footer — normal flow, sticks to bottom via flex mt-auto */}
      <footer className="hidden sm:flex w-full bg-[#0a1a0a] mt-auto footer-gradient-border">
        <div className="max-w-4xl mx-auto px-4 py-4 w-full">
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
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors relative ${
                      isPlay
                        ? 'px-4 py-2 rounded-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white shadow-md shadow-[#22c55e]/20'
                        : isActive
                        ? 'text-[#22c55e]'
                        : 'text-[#94a3b8] hover:text-[#e2e8f0]'
                    }`}
                  >
                    <span className={isPlay ? 'w-5 h-5' : 'w-4 h-4'}>{tab.icon}</span>
                    {tab.label}
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
              © 2025 Футбольный драфт
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
