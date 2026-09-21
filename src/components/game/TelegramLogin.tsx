'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function TelegramLogin() {
  const widget = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const win = window as typeof window & { rplTelegramLogin?: (user: unknown) => void; Telegram?: { WebApp?: { initData?: string } } };
    async function setup() {
      try {
        const response = await fetch('/api/auth/telegram', { cache: 'no-store' });
        if (!response.ok) throw new Error('Не удалось загрузить вход. Обновите страницу.');
        const config = await response.json();
        if (cancelled) return;
        if (config.user) { useAuthStore.getState().setUser(config.user); return; }
        if (!config.configured || !config.botUsername) throw new Error('Вход через Telegram пока недоступен. Попробуйте позже.');
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
        win.rplTelegramLogin = user => { void login({ widget: user }); };
        if (win.Telegram?.WebApp?.initData) { await login({ initData: win.Telegram.WebApp.initData }); return; }
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', config.botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-lang', 'ru');
        script.setAttribute('data-onauth', 'rplTelegramLogin(user)');
        script.onerror = () => { if (!cancelled) setError('Не удалось загрузить Telegram. Проверьте соединение и обновите страницу.'); };
        widget.current?.replaceChildren(script);
      } catch(e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Не удалось загрузить вход'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void setup();
    return () => { cancelled = true; delete win.rplTelegramLogin; };
  }, []);
  return <section className="mx-auto my-12 max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 text-center">
    <div className="text-5xl font-black">30<span className="text-[#00C896]">-</span>0</div>
    <h1 className="mt-6 text-2xl font-bold">Войти через Telegram</h1>
    <p className="mt-3 text-sm text-[#9CA3AF]">Войдите, чтобы собрать команду и начать сезон.</p>
    <div ref={widget} className="mt-6 min-h-12" />
    {loading && <p role="status" className="text-sm text-[#9CA3AF]">Подключаем Telegram…</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
  </section>;
}
