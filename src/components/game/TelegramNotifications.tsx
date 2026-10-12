'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { telegramWebApp } from '@/hooks/use-telegram';
import { toast } from 'sonner';

export default function TelegramNotifications() {
  const user = useAuthStore(state => state.user);
  const update = useAuthStore(state => state.updateTelegramNotifications);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  return <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
    <div className="flex items-center justify-between gap-4"><h3 className="text-sm font-bold text-white">Уведомления Telegram</h3><label className="flex min-h-11 items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={user.telegramNotificationsEnabled} disabled={busy} onChange={async event => { setBusy(true); try { await update(event.target.checked); } catch { toast.error('Не удалось сохранить уведомления'); } finally { setBusy(false); } }} className="h-5 w-5 accent-[#00C896]"/>Включены</label></div>
    <p className="mt-1 text-xs leading-relaxed text-slate-400">Заявки в друзья и приглашения приходят в бот. Нажми «Начать» в Telegram, чтобы получать сообщения.</p>
    <a href="https://t.me/RPL30_bot?start=profile" onClick={event => { const app = telegramWebApp(); if (app?.openTelegramLink) { event.preventDefault(); app.openTelegramLink('https://t.me/RPL30_bot?start=profile'); } }} className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-[#229ED9]/40 px-4 text-sm text-[#5ac8fa]">Открыть Telegram</a>
  </section>;
}
