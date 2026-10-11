import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const friends = await db.friendship.findMany({ where: { fromId: userId }, orderBy: { createdAt: 'desc' }, take: 100,
    include: { to: { select: { id: true, displayName: true, username: true, photoUrl: true } } } });
  return NextResponse.json({ friends: friends.map(item => item.to) });
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'social:friends', { limit: 15, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const { id } = await request.json().catch(() => ({ id: null }));
  if (typeof id !== 'string' || id.length > 100 || id === userId) return NextResponse.json({ error: 'Выбери другого игрока' }, { status: 400 });
  if (!await db.user.findUnique({ where: { id }, select: { id: true } })) return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
  await db.friendship.upsert({ where: { fromId_toId: { fromId: userId, toId: id } }, create: { fromId: userId, toId: id }, update: {} });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const { id } = await request.json().catch(() => ({ id: null }));
  if (typeof id !== 'string' || id.length > 100) return NextResponse.json({ error: 'Некорректный игрок' }, { status: 400 });
  await db.friendship.deleteMany({ where: { fromId: userId, toId: id } });
  return NextResponse.json({ ok: true });
}
