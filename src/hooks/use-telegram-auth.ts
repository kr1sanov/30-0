'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAutoAuth() {
  const { isAuthenticated, isAuthenticating, loginAsGuest } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated || isAuthenticating) return;
    loginAsGuest();
  }, [isAuthenticated, isAuthenticating, loginAsGuest]);
}
