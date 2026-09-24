import { NextResponse } from 'next/server';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rateLimit';
import { verifyLoginWidget, verifyMiniAppPublic } from '@/lib/telegramVerification';
import { verifyTelegramIdToken } from '@/lib/telegramOidc';
import { createSession, sessionUser, sameOrigin, SESSION_COOKIE, SESSION_SECONDS } from '@/lib/telegramSession';
import { sendTelegramMessage, telegramChatId } from '@/lib/telegramBot';

export const dynamic = 'force-dynamic';
const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

export async function GET(request: Request) {
  const userId = sessionUser(request);
  const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
  if (user?.provider === 'telegram') {
    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } }).catch(() => undefined);
  }
  const csrf = randomBytes(32).toString('hex');
  const response = NextResponse.json({
    user: user?.provider === 'telegram' ? {
      id: user.id,
      provider: 'telegram',
      displayName: user.displayName,
      createdAt: user.createdAt.getTime(),
      telegramNotificationsEnabled: user.telegramNotificationsEnabled,
      notificationCadence: user.notificationCadence,
      telegramChatStarted: user.telegramChatStarted,
    } : null,
    botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null,
    clientId: process.env.TELEGRAM_CLIENT_ID ?? null,
    configured: Boolean(process.env.TELEGRAM_CLIENT_ID && (process.env.TELEGRAM_SESSION_SECRET?.length ?? 0) >= 32),
    webConfigured: Boolean(process.env.TELEGRAM_CLIENT_ID && process.env.TELEGRAM_BOT_TOKEN && (process.env.TELEGRAM_SESSION_SECRET?.length ?? 0) >= 32),
    csrf,
  }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('rpl_login_csrf', csrf, { ...options, maxAge: 600 });
  return response;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  const limited = enforceRateLimit(request, 'telegram:login', { limit: 15, windowMs: 60_000 });
  if (limited) return limited;
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  if (!clientId || (process.env.TELEGRAM_SESSION_SECRET?.length ?? 0) < 32) return NextResponse.json({ error: 'Вход через Telegram ещё не настроен' }, { status: 503 });
  try {
    const text = await request.text();
    if (text.length > 20000) return NextResponse.json({ error: 'Слишком большой запрос' }, { status: 413 });
    const body = JSON.parse(text);
    const cookie = (request.headers.get('cookie') ?? '').split(';').map(p => p.trim()).find(p => p.startsWith('rpl_login_csrf='))?.slice(15);
    if (!cookie || typeof body.csrf !== 'string' || cookie.length !== body.csrf.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(body.csrf))) {
      return NextResponse.json({ error: 'Обновите страницу входа' }, { status: 403 });
    }
    const authData = body.authData && typeof body.authData === 'object' && !Array.isArray(body.authData)
      ? body.authData as Record<string, unknown>
      : null;
    const verified = typeof body.initData === 'string'
      ? verifyMiniAppPublic(body.initData, clientId)
      : typeof body.idToken === 'string'
        ? await verifyTelegramIdToken(body.idToken, clientId, cookie)
        : authData && process.env.TELEGRAM_BOT_TOKEN
          ? verifyLoginWidget(authData, process.env.TELEGRAM_BOT_TOKEN)
          : null;
    if (!verified) return NextResponse.json({ error: 'Не удалось подтвердить вход через Telegram' }, { status: 401 });
    const data = { firstName: verified.firstName, lastName: verified.lastName ?? null, username: verified.username ?? null };
    // Telegram signs start_param inside initData. Only attribute a referral after
    // the initData signature above has been verified.
    const referralCode = typeof body.initData === 'string'
      ? new URLSearchParams(body.initData).get('start_param')
      : null;
    const safeReferralCode = referralCode && /^[a-z0-9]{6,32}$/i.test(referralCode) ? referralCode : null;
    const user = await db.$transaction(async (tx) => {
      const providerId = `telegram_${verified.id}`;
      const existing = await tx.user.findUnique({ where: { providerId } });
      if (existing) {
        const referrer = !existing.referredBy && safeReferralCode && safeReferralCode !== existing.referralCode
          ? await tx.user.findUnique({ where: { referralCode: safeReferralCode }, select: { id: true } })
          : null;
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            ...data,
            lastActiveAt: new Date(),
            ...(!existing.referralCode ? { referralCode: `rpl${randomBytes(6).toString('hex')}` } : {}),
            ...(referrer ? { referredBy: safeReferralCode } : {}),
          },
        });
        if (referrer) {
          await tx.user.update({ where: { id: referrer.id }, data: { referralCount: { increment: 1 } } });
        }
        return updated;
      }

      const referrer = safeReferralCode
        ? await tx.user.findUnique({ where: { referralCode: safeReferralCode }, select: { id: true } })
        : null;
      const created = await tx.user.create({
        data: {
          ...data,
          provider: 'telegram',
          providerId,
          displayName: verified.firstName || verified.username || 'Игрок',
          referralCode: `rpl${randomBytes(6).toString('hex')}`,
          ...(referrer ? { referredBy: safeReferralCode } : {}),
        },
      });
      if (referrer) {
        await tx.user.update({ where: { id: referrer.id }, data: { referralCount: { increment: 1 } } });
      }
      return created;
    });
    const response = NextResponse.json({ user: {
      id: user.id,
      provider: 'telegram',
      displayName: user.displayName,
      createdAt: user.createdAt.getTime(),
      telegramNotificationsEnabled: user.telegramNotificationsEnabled,
      notificationCadence: user.notificationCadence,
      telegramChatStarted: user.telegramChatStarted,
      referralCount: user.referralCount,
    } }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, createSession(user.id), { ...options, maxAge: SESSION_SECONDS });
    response.cookies.set('rpl_login_csrf', '', { ...options, maxAge: 0 });
    if (user.telegramChatStarted && !user.telegramWelcomeSentAt && user.telegramNotificationsEnabled) {
      const chatId = telegramChatId(user.providerId);
      if (chatId) {
        void sendTelegramMessage(chatId, [
          '<b>Добро пожаловать в 30-0!</b> ⚽',
          '',
          'Соберите команду из игроков РПЛ разных эпох и попробуйте пройти сезон без поражений.',
          '',
          'После каждого сезона сюда будет приходить карточка результата.',
        ].join('\n')).then(async sent => {
          if (sent) await db.user.update({ where: { id: user.id }, data: { telegramWelcomeSentAt: new Date() } });
        }).catch(() => undefined);
      }
    }
    return response;
  } catch {
    return NextResponse.json({ error: 'Не удалось выполнить вход. Попробуйте ещё раз.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...options, maxAge: 0 });
  return response;
}
