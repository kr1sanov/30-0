import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { db } from '@/lib/db';
import { answerTelegramCallback, sendBotPhoto, sendTelegramMessage } from '@/lib/telegramBot';

export const runtime = 'nodejs';
const openMarkup = { inline_keyboard: [[{ text: 'Играть', url: 'https://t.me/RPL30_bot?startapp' }]] };

export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || request.headers.get('x-telegram-bot-api-secret-token') !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const update = await request.json();
    const message = update.message;
    if (message?.chat?.type === 'private' && typeof message.text === 'string') {
      const chatId = String(message.chat.id);
      const match = /^\/start(?:\s|$)/.test(message.text);
      if (match) {
        const firstName = typeof message.from?.first_name === 'string' ? message.from.first_name : null;
        const lastName = typeof message.from?.last_name === 'string' ? message.from.last_name : null;
        const username = typeof message.from?.username === 'string' ? message.from.username : null;
        const now = new Date();
        const photo = await readFile(`${process.cwd()}/public/telegram-start.png`).catch(() => readFile(`${process.cwd()}/.next/standalone/public/telegram-start.png`).catch(() => null));
        const caption = '<b>30-0 · Драфт РПЛ</b> ⚽\nСобери команду из игроков РПЛ разных сезонов, сыграй сезон из 30 матчей и попробуй победить во всех. Играй сам или с друзьями.';
        const sent = photo && await sendBotPhoto(chatId, photo, caption, openMarkup)
          || await sendTelegramMessage(chatId, caption, openMarkup);
        if (!sent) return NextResponse.json({ error: 'Telegram delivery failed' }, { status: 502 });
        // Delivery must not depend on the game database being available.
        try {
          await db.user.upsert({
            where: { providerId: `telegram_${chatId}` },
            create: {
              provider: 'telegram', providerId: `telegram_${chatId}`,
              firstName, lastName, username,
              displayName: firstName || username || 'Игрок',
              telegramChatStarted: true, telegramWelcomeSentAt: now, lastActiveAt: now,
            },
            update: {
              telegramChatStarted: true, telegramWelcomeSentAt: now, lastActiveAt: now,
              ...(firstName ? { firstName } : {}),
              ...(lastName ? { lastName } : {}),
              ...(username ? { username } : {}),
            },
          });
        } catch (error) { console.error('Telegram /start profile update:', error); }
        return NextResponse.json({ ok: true });
      }
    }
    const query = update.callback_query;
    if (query?.id && query?.message?.chat?.type === 'private') {
      const actorId = String(query.from?.id ?? '');
      const data = String(query.data ?? '');
      if (data === 'notifications-off' || data === 'notifications-on') {
        const user = await db.user.findUnique({ where: { providerId: `telegram_${actorId}` } });
        if (user) await db.user.update({ where: { id: user.id }, data: { telegramNotificationsEnabled: data === 'notifications-on' } });
        await answerTelegramCallback(query.id, data === 'notifications-on' ? 'Уведомления включены' : 'Уведомления отключены');
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: true });
  } catch (error) { console.error('Telegram webhook:', error); return NextResponse.json({ error: 'Webhook failed' }, { status: 500 }); }
}
