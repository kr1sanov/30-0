'use client';

import { useGameStore } from '@/store/gameStore';
import { Home, Play, Users, BookOpen, Trophy, MessageCircle, Instagram } from 'lucide-react';

interface FooterNavLink {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  badge?: string;
}

export default function Footer() {
  const mainNavLinks: FooterNavLink[] = [
    {
      label: 'Главная',
      icon: <Home className="w-3.5 h-3.5" />,
      action: () => {
        const state = useGameStore.getState();
        if (state.runId) {
          state.goHome();
        } else {
          state.resetGame();
        }
      },
    },
    {
      label: 'Играть',
      icon: <Play className="w-3.5 h-3.5" />,
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
      label: 'Мультиплеер',
      icon: <Users className="w-3.5 h-3.5" />,
      action: () => {},
      badge: 'Скоро',
    },
    {
      label: 'Как это работает',
      icon: <BookOpen className="w-3.5 h-3.5" />,
      action: () => {
        window.dispatchEvent(new CustomEvent('open-how-to-play'));
      },
    },
    {
      label: 'Лидерборд',
      icon: <Trophy className="w-3.5 h-3.5" />,
      action: () => useGameStore.getState().setScreen('leaderboard'),
    },
    {
      label: 'История',
      icon: <MessageCircle className="w-3.5 h-3.5" />,
      action: () => useGameStore.getState().setScreen('history'),
    },
  ];

  const socialLinks = [
    {
      label: 'Instagram',
      icon: <Instagram className="w-4 h-4" />,
      href: 'https://www.instagram.com/30_0app',
    },
  ];

  const legalLinks = [
    { label: 'Политика конфиденциальности', href: '#' },
    { label: 'Условия использования', href: '#' },
  ];

  const handleLinkClick = (link: FooterNavLink) => {
    link.action();
  };

  return (
    <footer className="w-full bg-[#0A0A0A] mt-auto footer-gradient-border">
      <div className="mx-auto max-w-5xl px-4 lg:px-6 pt-8 pb-6 md:pt-10 md:pb-8">
        {/* Navigation Links — centered */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 justify-center">
            {mainNavLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleLinkClick(link)}
                className={`
                  flex items-center gap-1.5 text-sm transition-colors duration-200
                  ${link.badge
                    ? 'text-[#9CA3AF]/40 cursor-default'
                    : 'text-[#9CA3AF] hover:text-white'
                  }
                `}
              >
                {link.icon}
                <span>{link.label}</span>
                {link.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-[#00C896]/10 text-[#00C896]/60">
                    {link.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Social + Community Links — centered */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 justify-center">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-white transition-colors duration-200"
              >
                {link.icon}
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Description — centered */}
        <p className="text-xs text-[#9CA3AF]/40 mb-6 max-w-lg mx-auto leading-relaxed text-center">
          30-0 — независимый фанатский симулятор драфта и сезона Российской Премьер-Лиги. Не аффилирован с РПЛ.
        </p>

        {/* Bottom section: Legal + Copyright — centered */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="flex flex-col items-center gap-3">
            {/* Legal links — centered */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center">
              {legalLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-xs text-[#9CA3AF]/40 hover:text-[#9CA3AF]/70 transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Copyright — centered */}
            <p className="text-xs text-[#9CA3AF]/30">
              &copy; 2026 30-0. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
