import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { sendTelegramMessage, telegramChatId } from './telegramBot';

export async function queueSocialNotification(eventKey: string, userId: string, text: string, startParam: string, client: Prisma.TransactionClient = db) {
  await client.telegramOutbox.upsert({ where: { eventKey }, create: { eventKey, userId, text, startParam }, update: {} });
}

export async function flushSocialNotifications() {
  const now = new Date();
  const pending = await db.telegramOutbox.findMany({ where: { sentAt: null, attempts: { lt: 5 }, availableAt: { lte: now } }, orderBy: { createdAt: 'asc' }, take: 20 });
  await Promise.all(pending.map(async item => {
    // Lease prevents concurrent Passenger workers from sending the same event.
    const claim = await db.telegramOutbox.updateMany({ where: { id: item.id, sentAt: null, attempts: item.attempts, availableAt: { lte: now } }, data: { attempts: { increment: 1 }, availableAt: new Date(now.getTime() + 60_000) } });
    if (!claim.count) return;
    const user = await db.user.findUnique({ where: { id: item.userId }, select: { providerId: true, telegramNotificationsEnabled: true, deleteAfterAt: true } });
    const chatId = user && telegramChatId(user.providerId);
    if (!chatId || !user?.telegramNotificationsEnabled || user.deleteAfterAt) {
      await db.telegramOutbox.update({ where: { id: item.id }, data: { sentAt: now } }); return;
    }
    const bot = (process.env.TELEGRAM_BOT_USERNAME || 'RPL30_bot').replace(/^@/, '');
    const sent = await sendTelegramMessage(chatId, item.text, { inline_keyboard: [[{ text: 'Open 30-0 / Открыть', url: `https://t.me/${bot}?startapp=${encodeURIComponent(item.startParam)}` }]] });
    await db.telegramOutbox.update({ where: { id: item.id }, data: sent ? { sentAt: new Date() } : { availableAt: new Date(Date.now() + 60_000 * 2 ** item.attempts) } });
  }));
}

export const escapeTelegramHtml = (text: string) => text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
