import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rateLimit';
import { sameOrigin } from '@/lib/telegramSession';
import { ADMIN_COOKIE, ADMIN_USERNAME, adminCredential, adminSession, createAdminSession, hashAdminPassword, verifyAdminPassword } from '@/lib/adminAuth';

export const runtime = 'nodejs';
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: 8 * 60 * 60 };
export async function GET(request: Request) {
  const admin = await adminSession(request);
  return NextResponse.json({ authenticated: Boolean(admin), mustChangePassword: admin?.mustChangePassword ?? false }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  const limited = enforceRateLimit(request, 'admin:password', { limit: 5, windowMs: 15 * 60_000 });
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (username !== ADMIN_USERNAME || password.length > 256 || !password) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
  }
  const admin = await adminCredential();
  if (!verifyAdminPassword(password, admin.passwordHash)) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true, mustChangePassword: admin.mustChangePassword });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(admin.username, admin.sessionVersion), cookieOptions);
  return response;
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  const limited = enforceRateLimit(request, 'admin:password-change', { limit: 5, windowMs: 15 * 60_000 });
  if (limited) return limited;
  const admin = await adminSession(request);
  if (!admin) return NextResponse.json({ error: 'Войдите заново' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (!verifyAdminPassword(current, admin.passwordHash)) return NextResponse.json({ error: 'Текущий пароль неверен' }, { status: 401 });
  if (next.length < 16 || next.length > 256 || next === current) return NextResponse.json({ error: 'Новый пароль должен содержать минимум 16 символов и отличаться от прежнего' }, { status: 400 });
  const updated = await db.adminCredential.update({ where: { id: admin.id }, data: {
    passwordHash: hashAdminPassword(next), mustChangePassword: false, sessionVersion: { increment: 1 },
  } });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(updated.username, updated.sessionVersion), cookieOptions);
  return response;
}
