'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: 'Авторизация через Яндекс ещё не настроена. Попробуйте позже.',
  config_missing: 'Ошибка конфигурации авторизации. Обратитесь к разработчикам.',
  no_code: 'Не получен код авторизации от Яндекса.',
  state_mismatch: 'Ошибка безопасности. Попробуйте снова.',
  token_failed: 'Не удалось получить токен Яндекса. Попробуйте снова.',
  no_access_token: 'Не получен токен доступа от Яндекса.',
  user_info_failed: 'Не удалось получить информацию о пользователе.',
  server_error: 'Ошибка сервера при авторизации. Попробуйте позже.',
  access_denied: 'Вы отменили авторизацию.',
  invalid_callback: 'Неверный адрес обратного вызова.',
};

export function useAutoAuth() {
  const { user, isAuthenticated, isAuthenticating, _hasHydrated, loginAsGuest, handleYandexCallback, clearAuthError } = useAuthStore();

  useEffect(() => {
    // Wait for persisted state to rehydrate before making auth decisions
    if (!_hasHydrated) return;

    const params = new URLSearchParams(window.location.search);

    // ── Case 1: Yandex redirected to our app root with ?code=...&state=...
    // This happens when redirect_uri is set to the app root (e.g. https://30-Oaapp.vercel.app/)
    const code = params.get('code');
    const yandexError = params.get('error'); // Yandex sends ?error=access_denied if user cancels
    const state = params.get('state');

    if (code) {
      // Clean URL immediately so we don't re-process on refresh
      window.history.replaceState({}, '', '/');

      // Call server-side API to exchange code for token + user info
      (async () => {
        try {
          const res = await fetch('/api/auth/yandex/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state }),
          });

          const data = await res.json();

          if (data.success && data.user) {
            handleYandexCallback({
              user_id: data.user.id,
              display_name: data.user.displayName,
              photo_url: data.user.photoUrl || undefined,
              email: data.user.email || undefined,
            });
          } else {
            const errorKey = data.error || 'server_error';
            const message = AUTH_ERROR_MESSAGES[errorKey] || `Ошибка авторизации: ${errorKey}`;
            import('sonner').then(({ toast }) => {
              toast.error(message, { duration: 5000 });
            });
          }
        } catch (err) {
          console.error('Yandex callback fetch error:', err);
          import('sonner').then(({ toast }) => {
            toast.error('Ошибка сети при авторизации. Попробуйте снова.', { duration: 5000 });
          });
        }
      })();
      return;
    }

    // ── Case 2: Yandex returned an error (e.g. user denied access)
    if (yandexError) {
      window.history.replaceState({}, '', '/');
      const message = AUTH_ERROR_MESSAGES[yandexError] || `Ошибка авторизации: ${yandexError}`;
      import('sonner').then(({ toast }) => {
        toast.error(message, { duration: 5000 });
      });
      return;
    }

    // ── Case 3: Our API redirected with auth_error param
    const authError = params.get('auth_error');
    if (authError) {
      console.error('Yandex auth error:', authError);
      const message = AUTH_ERROR_MESSAGES[authError] || `Ошибка авторизации: ${authError}`;
      import('sonner').then(({ toast }) => {
        toast.error(message, { duration: 5000 });
      });
      window.history.replaceState({}, '', '/');
      clearAuthError();
      return;
    }

    // ── Case 4: Our API redirected with auth_success param (legacy flow)
    const authSuccess = params.get('auth_success');
    if (authSuccess === 'yandex') {
      const userId = params.get('user_id');
      const displayName = params.get('display_name');
      const photoUrl = params.get('photo_url');
      const email = params.get('email');

      if (userId && displayName) {
        handleYandexCallback({
          user_id: userId,
          display_name: displayName,
          photo_url: photoUrl || undefined,
          email: email || undefined,
        });
        window.history.replaceState({}, '', '/');
        return;
      }
    }

    // ── Case 5: Validate existing Yandex session on server (best-effort)
    // If the user appears authenticated via Yandex from localStorage,
    // try to refresh user data from the server-side session.
    // If the server session is missing/expired, we DON'T log out —
    // the client-side auth is the source of truth for the UI.
    // The server session is only needed for API calls that require it.
    if (isAuthenticated && user?.provider === 'yandex') {
      fetch('/api/auth/yandex/me')
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            // Server session is valid — refresh user data from server
            handleYandexCallback({
              user_id: data.user.id,
              display_name: data.user.displayName,
              photo_url: data.user.photoUrl || undefined,
              email: data.user.email || undefined,
            });
          }
          // If server session is missing/expired, keep client-side auth.
          // The user can still play; we just won't have server-side session data.
        })
        .catch(() => {
          // Network error — keep existing auth state, don't disrupt
        });
      return;
    }

    // ── Case 6: Auto-login as guest if not authenticated
    if (isAuthenticated || isAuthenticating) return;
    loginAsGuest();
  }, [isAuthenticated, isAuthenticating, _hasHydrated, user, loginAsGuest, handleYandexCallback, clearAuthError]);
}
