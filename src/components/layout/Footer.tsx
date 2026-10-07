'use client';

import { useGameStore } from '@/store/gameStore';
import { Home, Play, User } from 'lucide-react';
import Link from 'next/link';

interface FooterNavLink {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
}

export default function Footer({ onHome, onPlay, onProfile }: { onHome?: () => void; onPlay?: () => void; onProfile?: () => void } = {}) {
  const mainNavLinks: FooterNavLink[] = [
    {
      label: 'Главная',
      icon: <Home className="w-3.5 h-3.5" />,
      action: () => {
        if (onHome) { onHome(); return; }
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
        if (onPlay) { onPlay(); return; }
        const state = useGameStore.getState();
        if (state.runId) {
          state.resumeGame();
        } else {
          state.setScreen('setup');
        }
      },
    },
    {
      label: 'Мой профиль',
      icon: <User className="w-3.5 h-3.5" />,
      action: onProfile ?? (() => useGameStore.getState().setScreen('profile')),
    },
  ];

  const legalLinks = [
    { label: 'Политика конфиденциальности', href: '/privacy' },
    { label: 'Условия использования', href: '/terms' },
  ];

  const handleLinkClick = (link: FooterNavLink) => {
    link.action();
  };

  return (
    <footer className="w-full bg-[#0A0A0A] mt-auto footer-gradient-border">
      <div className="mx-auto max-w-5xl px-4 lg:px-6 pt-8 pb-6 md:pt-10 md:pb-8">
        {/* Navigation + Social Links — centered */}
        <div className="mb-6">
          <div className="hidden sm:flex flex-wrap gap-x-5 gap-y-2.5 justify-center items-center">
            {mainNavLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleLinkClick(link)}
                className="flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-white transition-colors duration-200"
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-center">
            <a href="https://t.me/RPL30_bot?startapp" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#229ED9]/45 bg-[#229ED9]/10 px-4 py-2 text-sm font-semibold text-[#8BD8F7] transition-colors hover:bg-[#229ED9]/20 hover:text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#229ED9"/><path fill="#fff" d="m18.8 6.7-2.4 11.2c-.2.8-.7 1-1.4.6l-3.7-2.8-1.8 1.8c-.2.2-.4.4-.8.4l.3-3.8 6.9-6.2c.3-.3-.1-.4-.5-.2l-8.5 5.4-3.7-1.2c-.8-.3-.8-.8.2-1.2L18 5.5c.7-.3 1.2.2.8 1.2Z"/></svg>
              Telegram Mini App
            </a>
          </div>
        </div>

        {/* Description — centered */}
        <p className="text-xs text-[#9CA3AF]/40 mb-6 max-w-lg mx-auto leading-relaxed text-center">
          30-0 — независимый фанатский симулятор драфта и сезона Российской Премьер-Лиги. Не аффилирован с РПЛ.
        </p>

        {/* Bottom section: Legal + Copyright — centered */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs text-[#9CA3AF]/40 hover:text-[#9CA3AF]/70 transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <p className="text-xs text-[#9CA3AF]/30">
              &copy; 2026 30-0. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
