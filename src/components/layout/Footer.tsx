'use client';

import { useGameStore } from '@/store/gameStore';
import { Home, Play, Users, BookOpen, Trophy, MessageCircle, Instagram } from 'lucide-react';
import { useTelegram } from '@/hooks/use-telegram';

interface FooterNavLink {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  badge?: string;
  external?: boolean;
  href?: string;
}

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

export default function Footer() {
  const { haptic, isTelegram } = useTelegram();

  const handleHaptic = () => {
    haptic('light');
  };

  const mainNavLinks: FooterNavLink[] = [
    {
      label: 'Home',
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
      label: 'Play',
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
      label: 'Multiplayer',
      icon: <Users className="w-3.5 h-3.5" />,
      action: () => {},
      badge: 'Скоро',
    },
    {
      label: 'How it works',
      icon: <BookOpen className="w-3.5 h-3.5" />,
      action: () => {
        window.dispatchEvent(new CustomEvent('open-how-to-play'));
      },
    },
    {
      label: 'Leaderboard',
      icon: <Trophy className="w-3.5 h-3.5" />,
      action: () => useGameStore.getState().setScreen('leaderboard'),
    },
    {
      label: 'Story',
      icon: <MessageCircle className="w-3.5 h-3.5" />,
      action: () => {},
      badge: 'Скоро',
    },
    {
      label: 'Telegram',
      icon: <TelegramIcon className="w-3.5 h-3.5" />,
      action: () => {},
      external: true,
      href: 'https://t.me/RPL30_bot/app?startapp',
    },
  ];

  const socialLinks = [
    {
      label: 'Telegram',
      icon: <TelegramIcon className="w-4 h-4" />,
      href: 'https://t.me/+iX9kd8CgQJxkYzFi',
    },
    {
      label: 'Instagram',
      icon: <Instagram className="w-4 h-4" />,
      href: 'https://www.instagram.com/30_0app',
    },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Use', href: '#' },
  ];

  const handleLinkClick = (link: FooterNavLink) => {
    handleHaptic();
    if (link.external && link.href) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    } else {
      link.action();
    }
  };

  return (
    <footer
      className="w-full bg-[#0A0A0A] mt-auto footer-gradient-border"
      style={isTelegram ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : undefined}
    >
      <div className="mx-auto max-w-5xl px-4 lg:px-6 pt-8 pb-6 md:pt-10 md:pb-8">
        {/* Navigation Links */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2.5">
            {mainNavLinks.map((link) => (
              link.external && link.href ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleHaptic}
                  className="flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-white transition-colors duration-200"
                >
                  {link.icon}
                  <span>{link.label}</span>
                </a>
              ) : (
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
              )
            ))}
          </div>
        </div>

        {/* Social + Community Links */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleHaptic}
                className="flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-white transition-colors duration-200"
              >
                {link.icon}
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[#9CA3AF]/40 mb-6 max-w-lg leading-relaxed">
          30-0 — независимый фанатский симулятор драфта и сезона Российской Премьер-Лиги. Не аффилирован с РПЛ.
        </p>

        {/* Bottom section: Legal + Copyright */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Legal links */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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

            {/* Copyright */}
            <p className="text-xs text-[#9CA3AF]/30">
              © 2026 30-0. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
