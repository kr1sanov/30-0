import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { db } from '@/lib/db';
import { answerTelegramCallback, sendBotPhoto, sendTelegramMessage } from '@/lib/telegramBot';

export const runtime = 'nodejs';
const appUrl = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://30-0.xn--p1ai';
const openMarkup = { inline_keyboard: [[{ text: 'Открыть', web_app: { url: appUrl() } }]] };

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
        // Persist /start even when it arrives before the user's first web-app login.
        // The later Telegram auth upsert reuses this record and keeps chatStarted=true.
        const firstName = typeof message.from?.first_name === 'string' ? message.from.first_name : null;
        const lastName = typeof message.from?.last_name === 'string' ? message.from.last_name : null;
        const username = typeof message.from?.username === 'string' ? message.from.username : null;
        const now = new Date();
        const user = await db.user.upsert({
          where: { providerId: `telegram_${chatId}` },
          create: {
            provider: 'telegram', providerId: `telegram_${chatId}`,
            firstName, lastName, username,
            displayName: firstName || username || 'Игрок',
            telegramChatStarted: true, lastActiveAt: now,
          },
          update: {
            telegramChatStarted: true, lastActiveAt: now,
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
            ...(username ? { username } : {}),
          },
        });
        const photo = await readFile(`${process.cwd()}/public/telegram-start.png`).catch(() => readFile(`${process.cwd()}/.next/standalone/public/telegram-start.png`).catch(() => null));
        const caption = '<b>30-0 — футбольный драфт РПЛ</b> ⚽\nСобери состав мечты из игроков разных сезонов, пройди чемпионат и попробуй добиться результата 30-0.\n\nНажми «Открыть», чтобы начать игру прямо в Telegram.';
        const sent = photo
          ? await sendBotPhoto(chatId, photo, caption, openMarkup)
          : await sendTelegramMessage(chatId, caption, openMarkup);
        if (sent && !user.telegramWelcomeSentAt) {
          await db.user.update({ where: { id: user.id }, data: { telegramWelcomeSentAt: now } });
        }
        return NextResponse.json({ ok: true });
      }
      if (/^\/notifications\b/.test(message.text)) {
        const user = await db.user.findUnique({ where: { providerId: `telegram_${chatId}` } });
        if (!user) { await sendTelegramMessage(chatId, 'Сначала войдите в игру через Telegram, затем настройте уведомления в профиле.'); }
        else {
          const enabled = !user.telegramNotificationsEnabled;
          await db.user.update({ where: { id: user.id }, data: { telegramNotificationsEnabled: enabled } });
          await sendTelegramMessage(chatId, enabled ? 'Уведомления включены.' : 'Уведомления отключены. Их можно включить в профиле 30-0.');
        }
        return NextResponse.json({ ok: true });
      }
    }
    const query = update.callback_query;
    if (query?.id && query?.message?.chat?.type === 'private') {
      const actorId = String(query.from?.id ?? '');
      const data = String(query.data ?? '');
      if (data.startsWith('admin-accept:')) {
        const targetId = data.slice('admin-accept:'.length);
        if (targetId === actorId) {
          const access = await db.adminAccess.findUnique({ where: { telegramId: targetId } });
          if (access?.status === 'pending') {
            await db.adminAccess.update({ where: { id: access.id }, data: { status: 'active' } });
            await answerTelegramCallback(query.id, 'Доступ к админке подтверждён');
            await sendTelegramMessage(targetId, 'Доступ к админ-панели 30-0 активирован.');
          } else await answerTelegramCallback(query.id, 'Запрос уже не активен');
        } else await answerTelegramCallback(query.id, 'Подтвердить может только владелец этого Telegram ID');
      } else if (data === 'notifications-off' || data === 'notifications-on') {
        const user = await db.user.findUnique({ where: { providerId: `telegram_${actorId}` } });
        if (user) await db.user.update({ where: { id: user.id }, data: { telegramNotificationsEnabled: data === 'notifications-on' } });
        await answerTelegramCallback(query.id, data === 'notifications-on' ? 'Уведомления включены' : 'Уведомления отключены');
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: true }); }
}
