'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAutoAuth() {
  const { isAuthenticated, isAuthenticating, loginAsGuest, handleYandexCallback } = useAuthStore();

  useEffect(() => {
    // Check for Yandex OAuth callback params in URL
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');

    if (authSuccess === 'yandex') {
      const userId = params.get('user_id');
      const displayName = params.get('display_name');
      const photoUrl = params.get('photo_url');

      if (userId && displayName) {
        handleYandexCallback({
          user_id: userId,
          display_name: displayName,
          photo_url: photoUrl || undefined,
        });

        // Clean URL params
        window.history.replaceState({}, '', '/');
        return;
      }
    }

    if (authError) {
      console.error('Auth error:', authError);
      // Clean URL params
      window.history.replaceState({}, '', '/');
    }

    // Auto-login as guest if not authenticated
    if (isAuthenticated || isAuthenticating) return;
    loginAsGuest();
  }, [isAuthenticated, isAuthenticating, loginAsGuest, handleYandexCallback]);
}
