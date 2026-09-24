import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashAdminCode, isTrustedAdmin, createAdminSession, ADMIN_COOKIE } from '@/lib/adminAuth';
import { enforceRateLimit } from '@/lib/rateLimit';
import { sameOrigin } from '@/lib/telegramSession';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  const limited = enforceRateLimit(request, 'admin:verify', { limit: 8, windowMs: 10 * 60_000 });
  if (limited) return limited;
  try {
    const { telegramId, code } = await request.json();
    const id = String(telegramId ?? '').trim();
    const input = String(code ?? '').trim();
    if (!/^\d{5,16}$/.test(id) || !/^\d{6}$/.test(input)) return NextResponse.json({ error: 'Проверьте ID и код' }, { status: 400 });
    const challenge = await db.adminLoginChallenge.findFirst({ where: { telegramId: id, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!challenge || challenge.attempts >= 5) return NextResponse.json({ error: 'Код истёк. Запросите новый.' }, { status: 401 });
    const match = challenge.codeHash === hashAdminCode(input);
    await db.adminLoginChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 }, ...(match ? { consumedAt: new Date() } : {}) } });
    if (!match || !await isTrustedAdmin(id)) return NextResponse.json({ error: 'Неверный код' }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, createAdminSession(id), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 });
    return response;
  } catch { return NextResponse.json({ error: 'Не удалось проверить код' }, { status: 500 }); }
}
