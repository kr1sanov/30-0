'use client';

import { useEffect, useRef, useState } from 'react';

type TelegramWindow = typeof window & {
  Telegram?: {
    Login?: {
      auth: (options: { client_id: number; scope: Array<'profile' | 'phone' | 'write'>; nonce: string; lang?: string }, callback: (data: { id_token?: unknown; error?: unknown } | false) => void) => void;
    };
  };
};

export default function AdminTelegramLogin() {
  const openLogin = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let csrf = '';
    let clientId = '';
    const telegramWindow = window as TelegramWindow;
    const enableLogin = () => {
      if (cancelled) return;
      const login = telegramWindow.Telegram?.Login;
      if (!login || !clientId) {
        setError('Не удалось загрузить вход Telegram. Обновите страницу.');
        setBusy(false);
        return;
      }
      openLogin.current = () => {
        setError('');
        setBusy(true);
        login.auth({ client_id: Number(clientId), scope: ['profile'], nonce: csrf, lang: 'ru' }, async payload => {
          if (cancelled) return;
          if (!payload || typeof payload.id_token !== 'string') {
            setError('Вход не завершён. Подтвердите вход в окне Telegram и попробуйте ещё раз.');
            setBusy(false);
            return;
          }
          try {
            const response = await fetch('/api/admin/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: payload.id_token, csrf }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Не удалось войти');
            window.location.reload();
          } catch (cause) {
            if (!cancelled) {
              setError(cause instanceof Error ? cause.message : 'Не удалось выполнить вход');
              setBusy(false);
            }
          }
        });
      };
      setReady(true);
      setBusy(false);
    };

    async function setup() {
      try {
        const response = await fetch('/api/auth/telegram', { cache: 'no-store' });
        const config = await response.json();
        if (!response.ok || !config.webConfigured || !config.clientId || !config.csrf) {
          throw new Error('Вход через Telegram пока не настроен.');
        }
        if (cancelled) return;
        csrf = config.csrf;
        clientId = String(config.clientId);
        if (telegramWindow.Telegram?.Login) {
          enableLogin();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-login.js?5';
        script.async = true;
        script.onload = enableLogin;
        script.onerror = () => {
          if (!cancelled) {
            setError('Не удалось загрузить Telegram. Проверьте соединение и обновите страницу.');
            setBusy(false);
          }
        };
        document.head.appendChild(script);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Не удалось загрузить вход');
          setBusy(false);
        }
      }
    }

    void setup();
    return () => { cancelled = true; openLogin.current = null; };
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
