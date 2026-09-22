'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { isTelegramLoginData, type TelegramLoginData } from '@/lib/telegramLogin';

export default function TelegramLogin() {
  const openLogin = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const win = window as typeof window & { Telegram?: {
      WebApp?: { initData?: string };
      Login?: {
        auth: (
          options: { bot_id: number; request_access?: boolean; lang?: string },
          callback: (data: TelegramLoginData | false) => void,
        ) => void;
      };
    } };
    async function setup() {
      try {
        const response = await fetch('/api/auth/telegram', { cache: 'no-store' });
        if (!response.ok) throw new Error('Не удалось загрузить вход. Обновите страницу.');
        const config = await response.json();
        if (cancelled) return;
        if (config.user) { useAuthStore.getState().setUser(config.user); return; }
        const login = async (payload: Record<string, unknown>) => {
          setLoading(true); setError('');
          try {
            const res = await fetch('/api/auth/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, csrf: config.csrf }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Не удалось войти');
            if (!cancelled) useAuthStore.getState().setUser(data.user);
          } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Не удалось войти'); }
          finally { if (!cancelled) setLoading(false); }
        };
        if (win.Telegram?.WebApp?.initData) {
          if (!config.configured || !config.clientId) throw new Error('Вход через Telegram пока недоступен. Попробуйте позже.');
          await login({ initData: win.Telegram.WebApp.initData });
          return;
        }
        if (!config.webConfigured || !config.clientId) throw new Error('Вход через Telegram пока недоступен. Попробуйте позже.');
        const enableLogin = () => {
          if (cancelled) return;
          if (!win.Telegram?.Login) { setError('Не удалось загрузить Telegram. Обновите страницу.'); return; }
          openLogin.current = () => {
            setError('');
            win.Telegram?.Login?.auth({ bot_id: Number(config.clientId), request_access: false, lang: 'ru' }, data => {
              if (cancelled) return;
              if (isTelegramLoginData(data)) void login({ authData: data });
              else setError('Вход не завершён. Попробуйте ещё раз.');
            });
          };
          setReady(true);
        };
        if (win.Telegram?.Login) { enableLogin(); return; }
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.onload = enableLogin;
        script.onerror = () => { if (!cancelled) setError('Не удалось загрузить Telegram. Проверьте соединение и обновите страницу.'); };
        document.head.appendChild(script);
      } catch(e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Не удалось загрузить вход'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void setup();
    return () => { cancelled = true; openLogin.current = null; };
  }, []);
  return <section className="mx-auto my-12 max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 text-center">
    <div className="text-5xl font-black">30<span className="text-[#00C896]">-</span>0</div>
    <h1 className="mt-6 text-2xl font-bold">Войти через Telegram</h1>
    <p className="mt-3 text-sm text-[#9CA3AF]">Войдите, чтобы собрать команду и начать сезон.</p>
    <button type="button" disabled={!ready || loading} onClick={() => openLogin.current?.()} className="mt-6 min-h-12 w-full rounded-xl bg-[#00C896] px-4 font-bold text-black disabled:opacity-40">Войти через Telegram</button>
    {loading && <p role="status" className="text-sm text-[#9CA3AF]">Подключаем Telegram…</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
  </section>;
}
