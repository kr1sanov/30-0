'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAutoAuth() {
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/telegram', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => useAuthStore.getState().setUser(data.user ?? null))
      .catch(() => { if (!controller.signal.aborted) useAuthStore.getState().setUser(null); });
    return () => controller.abort();
  }, []);
}
