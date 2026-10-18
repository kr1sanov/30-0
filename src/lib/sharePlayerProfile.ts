import { toast } from 'sonner';
import { telegramWebApp } from '@/hooks/use-telegram';
import { miniAppLink } from './miniAppLinks';
import { translateInterface } from './enTranslations';

export async function sharePlayerProfile(player: { id: string; username?: string | null }) {
  const app = telegramWebApp();
  const text = document.documentElement.lang === 'en' ? translateInterface('Посмотри мой профиль в 30-0') : 'Посмотри мой профиль в 30-0';
  const url = miniAppLink(`profile_${player.id}`);
  if (app?.openTelegramLink) {
    app.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    return;
  }
  if (navigator.share) {
    try { await navigator.share({ title: '30-0', text, url }); return; }
    catch (error) { if ((error as Error).name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast.success('Ссылка на профиль скопирована'); }
  catch { toast.error('Не удалось скопировать ссылку'); }
}
