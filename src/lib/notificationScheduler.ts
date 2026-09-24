import { db } from '@/lib/db';
import { sendTelegramMessage, telegramChatId } from '@/lib/telegramBot';

const APP = process.env.NEXT_PUBLIC_BASE_URL || 'https://30-0.xn--p1ai';
const escapeHtml = (text: string) => text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
function weekKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
function period(cadence: string, now: Date) {
  if (cadence === 'daily') return now.toISOString().slice(0, 10);
  if (cadence === 'weekly' || cadence === 'return') return weekKey(now);
  return now.toISOString().slice(0, 7);
}
async function dispatch(campaignId: string, cadence: string, title: string, message: string, now: Date) {
  const key = `${campaignId}:${period(cadence, now)}`;
  const users = await db.user.findMany({ where: { telegramNotificationsEnabled: true, telegramChatStarted: true, provider: 'telegram', ...(cadence !== 'return' ? { notificationCadence: cadence } : { lastActiveAt: { lt: new Date(now.getTime() - 7 * 86400000) } }) }, select: { id: true, providerId: true } });
  for (const user of users) {
    const chatId = telegramChatId(user.providerId); if (!chatId) continue;
    try { await db.notificationDispatch.create({ data: { userId: user.id, campaignKey: key } }); }
    catch { continue; }
    const sent = await sendTelegramMessage(chatId, `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}\n\n<a href="${APP}">Открыть 30-0</a>`, { inline_keyboard: [[{ text: 'Открыть 30-0', web_app: { url: APP } }]] });
    if (!sent) await db.notificationDispatch.deleteMany({ where: { userId: user.id, campaignKey: key } });
  }
}
export async function runNotificationSchedule(now = new Date()) {
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  if (hour !== 9 || minute > 2) return;
  const day = now.getUTCDay(); const date = now.getUTCDate();
  const due = ['daily', ...(day === 1 ? ['weekly'] : []), ...(date === 1 ? ['monthly'] : [])];
  const campaigns = await db.notificationCampaign.findMany({ where: { enabled: true, cadence: { in: [...due, 'return'] } } });
  for (const campaign of campaigns) await dispatch(campaign.id, campaign.cadence, campaign.title, campaign.message, now);
}
