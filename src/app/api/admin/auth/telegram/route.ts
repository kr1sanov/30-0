import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';
import { ADMIN_COOKIE, createAdminSession, isTrustedAdmin } from '@/lib/adminAuth';
import { isAdminOwnerTelegramIdentity } from '@/lib/adminTelegramIdentity';
import { sameOrigin } from '@/lib/telegramSession';
import { verifyTelegramIdToken } from '@/lib/telegramOidc';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  const limited = enforceRateLimit(request, 'admin:telegram-login', { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const text = await request.text();
    if (text.length > 20_000) return NextResponse.json({ error: 'Слишком большой запрос' }, { status: 413 });
    const body = JSON.parse(text);
    const csrfCookie = (request.headers.get('cookie') ?? '').split(';').map(part => part.trim())
      .find(part => part.startsWith('rpl_login_csrf='))?.slice('rpl_login_csrf='.length);
    if (!csrfCookie || typeof body.csrf !== 'string' || csrfCookie.length !== body.csrf.length
      || !timingSafeEqual(Buffer.from(csrfCookie), Buffer.from(body.csrf))) {
      return NextResponse.json({ error: 'Обновите страницу и повторите вход' }, { status: 403 });
    }

    const clientId = process.env.TELEGRAM_CLIENT_ID;
    if (!clientId || (process.env.ADMIN_SESSION_SECRET || process.env.TELEGRAM_SESSION_SECRET || '').length < 32) {
      return NextResponse.json({ error: 'Вход через Telegram не настроен на сервере' }, { status: 503 });
    }
    const identity = typeof body.idToken === 'string'
      ? await verifyTelegramIdToken(body.idToken, clientId, csrfCookie)
      : null;
    if (!identity) return NextResponse.json({ error: 'Telegram не подтвердил профиль. Повторите вход.' }, { status: 401 });
    if (!isAdminOwnerTelegramIdentity(identity.id, identity.username)) {
      return NextResponse.json({ error: 'Вход разрешён только аккаунту @kr1sanov с ID 361912433' }, { status: 403 });
    }
    if (!await isTrustedAdmin(identity.id)) return NextResponse.json({ error: 'У аккаунта нет доступа к админке' }, { status: 403 });

    const response = NextResponse.json({ ok: true, identity: { id: identity.id, username: identity.username } });
    response.cookies.set(ADMIN_COOKIE, createAdminSession(identity.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60,
    });
    response.cookies.set('rpl_login_csrf', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: 'Не удалось выполнить вход через Telegram' }, { status: 400 });
  }
}
