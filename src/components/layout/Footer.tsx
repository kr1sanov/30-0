'use client';

import { useState } from 'react';
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
      case 'home':
        useGameStore.getState().resetGame();
        break;
      case 'play':
        useGameStore.getState().setScreen('setup');
        break;
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
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M10 9l5 3-5 3V9z" fill="#0a0a0f" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M10 9l5 3-5 3V9z" fill="#0a0a0f" />
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
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-[#0a0a0f] border-t border-[#1a1a2e]/80">
          <div className="flex items-center justify-around h-14">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isPlay = tab.id === 'play';

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] h-14 transition-colors ${
                    isPlay ? '-mt-3' : ''
                  }`}
                >
                  {isPlay ? (
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
                        isActive
                          ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/30'
                          : 'bg-[#1a1a2e] text-[#94a3b8]'
                      }`}
                    >
                      {isActive ? tab.activeIcon : tab.icon}
                    </div>
                  ) : (
                    <span className={isActive ? 'text-[#22c55e]' : 'text-[#94a3b8]'}>
                      {isActive ? tab.activeIcon : tab.icon}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-medium leading-tight transition-colors ${
                      isActive ? 'text-[#22c55e]' : 'text-[#94a3b8]'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Desktop Footer — normal flow */}
      <footer className="hidden sm:block w-full border-t border-[#1a1a2e]/80 bg-[#0a0a0f] mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Desktop nav links */}
            <div className="flex items-center gap-5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      isActive ? 'text-[#22c55e]' : 'text-[#94a3b8] hover:text-[#e2e8f0]'
                    }`}
                  >
                    <span className="w-4 h-4">{tab.icon}</span>
                    {tab.label}
                  </button>
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
