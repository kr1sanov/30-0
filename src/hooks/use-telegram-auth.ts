'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * useAutoAuth — auto-initializes a local browser profile on first visit.
 * All profile data and game progress are stored in localStorage.
 */
export function useAutoAuth() {
  const { isAuthenticated, _hasHydrated, initLocalProfile } = useAuthStore();

  useEffect(() => {
    // Wait for persisted state to rehydrate before making auth decisions
    if (!_hasHydrated) return;

    // Clean up any leftover Yandex OAuth params in URL
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') || params.has('auth_error') || params.has('auth_success')) {
      window.history.replaceState({}, '', '/');
    }

    // If not authenticated, create a local profile
    if (!isAuthenticated) {
      initLocalProfile();
    }
  }, [isAuthenticated, _hasHydrated, initLocalProfile]);
}
