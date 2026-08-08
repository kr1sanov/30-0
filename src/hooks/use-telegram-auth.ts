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
};

export function useAutoAuth() {
  const { isAuthenticated, isAuthenticating, loginAsGuest, handleYandexCallback, clearAuthError } = useAuthStore();

  useEffect(() => {
    // Check for Yandex OAuth callback params in URL
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');

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

        // Clean URL params
        window.history.replaceState({}, '', '/');
        return;
      }
    }

    if (authError) {
      console.error('Yandex auth error:', authError);
      const message = AUTH_ERROR_MESSAGES[authError] || `Ошибка авторизации: ${authError}`;

      // Show error toast
      import('sonner').then(({ toast }) => {
        toast.error(message, { duration: 5000 });
      });

      // Clean URL params
      window.history.replaceState({}, '', '/');
      clearAuthError();
      return;
    }

    // Auto-login as guest if not authenticated
    if (isAuthenticated || isAuthenticating) return;
    loginAsGuest();
  }, [isAuthenticated, isAuthenticating, loginAsGuest, handleYandexCallback, clearAuthError]);
}
