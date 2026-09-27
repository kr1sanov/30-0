'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAutoAuth() {
  useEffect(() => {
    const controller = new AbortController();
    const ref = new URLSearchParams(window.location.search).get('ref');
    const path = ref && /^[a-z0-9]{6,32}$/i.test(ref) ? `/api/auth/telegram?ref=${encodeURIComponent(ref)}` : '/api/auth/telegram';
    fetch(path, { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => useAuthStore.getState().setUser(data.user ?? null))
      .catch(() => { if (!controller.signal.aborted) useAuthStore.getState().setUser(null); });
    return () => controller.abort();
  }, []);
}
