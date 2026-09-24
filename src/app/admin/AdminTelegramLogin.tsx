'use client';

import { useEffect, useRef, useState } from 'react';
import { addTelegramLoginOrigin } from '@/lib/telegramLoginPopup';

type TelegramAuthResult = { id_token?: unknown; error?: unknown } | false;
type TelegramWindow = typeof window & {
  Telegram?: {
    Login?: {
      auth: (
        options: { client_id: number; scope: Array<'profile'>; nonce: string; lang?: string },
        callback: (result: TelegramAuthResult) => void,
      ) => void;
    };
  };
};
type TelegramConfig = { webConfigured?: boolean; clientId?: string; csrf?: string };

function loadTelegramLoginSdk(): Promise<void> {
  const telegramWindow = window as TelegramWindow;
  if (telegramWindow.Telegram?.Login) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-telegram-login-sdk]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-login.js?5';
      script.async = true;
      script.dataset.telegramLoginSdk = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Не удалось загрузить окно входа Telegram.')), { once: true });
  });
}

function telegramErrorMessage(error: unknown): string {
  if (typeof error !== 'string') return 'Telegram не прислал подтверждение. Проверьте настройки URL входа в BotFather и повторите попытку.';
  if (error === 'popup_closed') return 'Окно Telegram закрылось до завершения входа. Подтвердите вход и дождитесь возврата на сайт.';
  return `Telegram отклонил вход: ${error.slice(0, 180)}`;
}

export default function AdminTelegramLogin() {
  const openLogin = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const response = await fetch('/api/auth/telegram', { cache: 'no-store' });
        const config = await response.json() as TelegramConfig;
        if (!response.ok || !config.webConfigured || !config.clientId || !config.csrf) {
          throw new Error('Вход через Telegram пока не настроен.');
        }
        await loadTelegramLoginSdk();
        if (cancelled) return;

        const { clientId, csrf } = config;
        const exchangeIdToken = async (idToken: string) => {
          try {
            const loginResponse = await fetch('/api/admin/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken, csrf }),
            });
            const data = await loginResponse.json().catch(() => ({}));
            if (!loginResponse.ok) throw new Error(data.error || 'Не удалось войти');
            window.location.reload();
          } catch (cause) {
            if (!cancelled) {
              setError(cause instanceof Error ? cause.message : 'Не удалось выполнить вход');
              setBusy(false);
            }
          }
        };

        openLogin.current = () => {
          const login = (window as TelegramWindow).Telegram?.Login;
          if (!login) {
            setError('Окно входа Telegram не загрузилось. Обновите страницу и попробуйте снова.');
            setBusy(false);
            return;
          }

          setError('');
          setBusy(true);

          // Let the official SDK own popup messaging and callback validation;
          // add only the required application origin to its auth URL.
          const originalOpen = window.open;
          window.open = ((url?: string | URL, target?: string, features?: string) => {
            const authUrl = typeof url === 'string' ? url : url?.toString();
            let withOrigin = url;
            if (authUrl) {
              const parsed = new URL(authUrl, window.location.href);
              if (parsed.origin === 'https://oauth.telegram.org' && parsed.pathname === '/auth') {
                withOrigin = addTelegramLoginOrigin(parsed, window.location.origin);
              }
            }
            return originalOpen.call(window, withOrigin, target, features);
          }) as typeof window.open;

          try {
            login.auth({ client_id: Number(clientId), scope: ['profile'], nonce: csrf, lang: 'ru' }, result => {
              if (cancelled) return;
              if (!result || typeof result.id_token !== 'string') {
                setError(telegramErrorMessage(result && result.error));
                setBusy(false);
                return;
              }
              void exchangeIdToken(result.id_token);
            });
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Не удалось открыть Telegram');
            setBusy(false);
          } finally {
            window.open = originalOpen;
          }
        };

        setReady(true);
        setBusy(false);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Не удалось загрузить вход');
          setBusy(false);
        }
      }
    }

    void setup();
    return () => {
      cancelled = true;
      openLogin.current = null;
    };
  }, []);

  return <section className="mx-auto my-12 max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 text-center text-white">
    <div className="text-5xl font-black">30<span className="text-[#00C896]">-</span>0</div>
    <h1 className="mt-6 text-2xl font-bold">Вход в админку</h1>
    <p className="mt-3 text-sm text-[#9CA3AF]">Подтвердите вход в Telegram. Админка сверит ID и username.</p>
    <button type="button" disabled={!ready || busy} onClick={() => openLogin.current?.()} className="mt-6 min-h-12 w-full rounded-xl bg-[#00C896] px-4 font-bold text-black disabled:opacity-40">
      {busy ? 'Подключаем Telegram…' : 'Войти как @kr1sanov'}
    </button>
    {busy && <p role="status" className="mt-3 text-sm text-[#9CA3AF]">Откроется окно подтверждения Telegram</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
  </section>;
}
