'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useTelegramAuth() {
  const { isAuthenticated, isAuthenticating, loginWithTelegram, loginAsGuest } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated || isAuthenticating) return;

    // Check if running inside Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp;
      webapp.ready();

      const initData = webapp.initData;
      if (initData) {
        loginWithTelegram(initData);
        return;
      }
    }

    // Not in Telegram — login as guest
    loginAsGuest();
  }, [isAuthenticated, isAuthenticating, loginWithTelegram, loginAsGuest]);
}
