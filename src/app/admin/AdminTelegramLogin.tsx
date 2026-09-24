'use client';

import { useEffect, useRef, useState } from 'react';
import { createTelegramLoginPopupUrl } from '@/lib/telegramLoginPopup';

type TelegramAuthMessage = { event?: unknown; result?: unknown; id_token?: unknown; error?: unknown };
type TelegramConfig = { webConfigured?: boolean; clientId?: string; csrf?: string };

export default function AdminTelegramLogin() {
  const openLogin = useRef<(() => void) | null>(null);
  const cleanupPopup = useRef<(() => void) | null>(null);
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
          setError('');
          setBusy(true);

          const origin = window.location.origin;
          const authUrl = createTelegramLoginPopupUrl({
            clientId,
            origin,
            redirectUri: `${origin}${window.location.pathname}`,
            nonce: csrf,
            lang: 'ru',
          });
          const popup = window.open(
            authUrl,
            'telegram_oidc_login',
            'popup,width=550,height=650,resizable=yes,scrollbars=yes',
          );

          if (!popup) {
            setError('Не удалось открыть Telegram. Разрешите всплывающие окна и попробуйте снова.');
            setBusy(false);
            return;
          }

          let closedCheck: number | undefined;
          let timeout: number | undefined;
          let finished = false;
          const cleanup = () => {
            window.removeEventListener('message', onMessage);
            if (closedCheck !== undefined) window.clearInterval(closedCheck);
            if (timeout !== undefined) window.clearTimeout(timeout);
            if (cleanupPopup.current === cleanup) cleanupPopup.current = null;
          };
          const finishWithError = () => {
            if (finished) return;
            finished = true;
            cleanup();
            if (!popup.closed) popup.close();
            if (!cancelled) {
              setError('Вход не завершён. Подтвердите вход в окне Telegram и попробуйте ещё раз.');
              setBusy(false);
            }
          };
          const onMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://oauth.telegram.org' || event.source !== popup) return;

            let message: TelegramAuthMessage;
            try {
              message = typeof event.data === 'string' ? JSON.parse(event.data) as TelegramAuthMessage : event.data as TelegramAuthMessage;
            } catch {
              return;
            }
            if (!message || message.event !== 'auth_result') return;

            const idToken = typeof message.result === 'string'
              ? message.result
              : typeof message.id_token === 'string' ? message.id_token : null;
            if (!idToken) {
              finishWithError();
              return;
            }

            if (finished) return;
            finished = true;
            cleanup();
            if (!popup.closed) popup.close();
            void exchangeIdToken(idToken);
          };

          cleanupPopup.current?.();
          cleanupPopup.current = () => {
            finished = true;
            cleanup();
            if (!popup.closed) popup.close();
          };
          window.addEventListener('message', onMessage);
          closedCheck = window.setInterval(() => {
            if (popup.closed) finishWithError();
          }, 300);
          timeout = window.setTimeout(finishWithError, 3 * 60_000);
          popup.focus();
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
      cleanupPopup.current?.();
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
