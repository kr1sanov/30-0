'use client';

import { useEffect, useState, useCallback } from 'react';

// Telegram WebApp SDK types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        openTelegramLink: (url: string) => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        disableVerticalSwipes?: () => void;
      };
    };
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);

  // Get user info lazily - no need to store in state
  const user = typeof window !== 'undefined'
    ? window.Telegram?.WebApp?.initDataUnsafe?.user
    : undefined;

  const isTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tg = window.Telegram?.WebApp;
    if (!tg) {
      // Still mark as ready so the app can run outside Telegram
      Promise.resolve().then(() => setIsReady(true));
      return;
    }

    // Initialize Telegram WebApp
    tg.ready();
    tg.expand();

    // Set dark theme colors
    try {
      tg.setHeaderColor('#0a0a0f');
      tg.setBackgroundColor('#0a0a0f');
    } catch {
      // Some versions may not support these
    }

    // Enable closing confirmation to prevent accidental exits during gameplay
    try {
      tg.enableClosingConfirmation();
    } catch {
      // noop
    }

    // Mark ready using a microtask to avoid synchronous setState in effect
    Promise.resolve().then(() => setIsReady(true));
  }, []);

  const haptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  }, []);

  const notify = useCallback((type: 'success' | 'warning' | 'error') => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
  }, []);

  const showMainButton = useCallback((text: string, onClick: () => void) => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.MainButton.setText(text);
    tg.MainButton.onClick(onClick);
    tg.MainButton.show();
  }, []);

  const hideMainButton = useCallback(() => {
    window.Telegram?.WebApp?.MainButton?.hide();
  }, []);

  const showBackButton = useCallback((onClick: () => void) => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.BackButton.onClick(onClick);
    tg.BackButton.show();
  }, []);

  const hideBackButton = useCallback(() => {
    window.Telegram?.WebApp?.BackButton?.hide();
  }, []);

  const shareToTelegram = useCallback((text: string, url?: string) => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url || 'https://30-0.app')}&text=${encodeURIComponent(text)}`;
    window.Telegram?.WebApp?.openTelegramLink(shareUrl);
  }, []);

  return {
    isReady,
    user,
    isTelegram,
    haptic,
    notify,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    shareToTelegram,
  };
}
