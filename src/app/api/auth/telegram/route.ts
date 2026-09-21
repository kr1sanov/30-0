import { NextResponse } from 'next/server';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rateLimit';
import { verifyMiniApp, verifyLoginWidget } from '@/lib/telegramVerification';
import { createSession, sessionUser, sameOrigin, SESSION_COOKIE, SESSION_SECONDS } from '@/lib/telegramSession';

export const dynamic = 'force-dynamic';
const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

export async function GET(request: Request) {
  const userId = sessionUser(request);
  const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
  const csrf = randomBytes(32).toString('hex');
  const response = NextResponse.json({
    user: user?.provider === 'telegram' ? { id: user.id, provider: 'telegram', displayName: user.displayName, createdAt: user.createdAt.getTime() } : null,
    botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null,
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && (process.env.TELEGRAM_SESSION_SECRET?.length ?? 0) >= 32),
    csrf,
  }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('rpl_login_csrf', csrf, { ...options, maxAge: 600 });
  return response;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  const limited = enforceRateLimit(request, 'telegram:login', { limit: 15, windowMs: 60_000 });
  if (limited) return limited;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || (process.env.TELEGRAM_SESSION_SECRET?.length ?? 0) < 32) return NextResponse.json({ error: 'Вход через Telegram ещё не настроен' }, { status: 503 });
  try {
    const text = await request.text();
    if (text.length > 20000) return NextResponse.json({ error: 'Слишком большой запрос' }, { status: 413 });
    const body = JSON.parse(text);
    const cookie = (request.headers.get('cookie') ?? '').split(';').map(p => p.trim()).find(p => p.startsWith('rpl_login_csrf='))?.slice(15);
    if (!cookie || typeof body.csrf !== 'string' || cookie.length !== body.csrf.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(body.csrf))) {
      return NextResponse.json({ error: 'Обновите страницу входа' }, { status: 403 });
    }
    const verified = typeof body.initData === 'string' ? verifyMiniApp(body.initData, token) : body.widget && typeof body.widget === 'object' ? verifyLoginWidget(body.widget, token) : null;
    if (!verified) return NextResponse.json({ error: 'Не удалось подтвердить вход через Telegram' }, { status: 401 });
    const data = { firstName: verified.firstName, lastName: verified.lastName ?? null, username: verified.username ?? null };
    const user = await db.user.upsert({
      where: { providerId: `telegram_${verified.id}` },
      create: { ...data, provider: 'telegram', providerId: `telegram_${verified.id}`, displayName: verified.firstName || verified.username || 'Игрок' },
      update: data,
    });
    const response = NextResponse.json({ user: { id: user.id, provider: 'telegram', displayName: user.displayName, createdAt: user.createdAt.getTime() } }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, createSession(user.id), { ...options, maxAge: SESSION_SECONDS });
    response.cookies.set('rpl_login_csrf', '', { ...options, maxAge: 0 });
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
