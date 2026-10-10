'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useAutoAuth() {
  useEffect(() => {
    const controller = new AbortController();
    const ref = new URLSearchParams(window.location.search).get('ref');
    const initData = (window as typeof window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
    const signedRef = initData ? new URLSearchParams(initData).get('start_param') : null;
    const path = ref && /^[a-z0-9]{6,32}$/i.test(ref) ? `/api/auth/telegram?ref=${encodeURIComponent(ref)}` : '/api/auth/telegram';
    fetch(path, { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(async data => {
        // Signed Mini App referrals must be verified even when the invitee already has a session.
        if (data.user && data.configured && initData && signedRef && /^[a-z0-9]{6,32}$/i.test(signedRef)) {
          const response = await fetch('/api/auth/telegram', {
            method: 'POST', signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData, csrf: data.csrf }),
          });
          if (response.ok) data = await response.json();
        }
        if (!controller.signal.aborted) useAuthStore.getState().setUser(data.user ?? null);
      })
      .catch(() => { if (!controller.signal.aborted) useAuthStore.getState().setUser(null); });
    return () => controller.abort();
  }, []);
}
