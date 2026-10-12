import { after } from 'next/server';
import { queueSocialNotification, flushSocialNotifications, escapeTelegramHtml } from '@/lib/socialNotifications';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

const person = { id: true, displayName: true, username: true, avatarColor: true, statusEmoji: true } as const;

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const [outgoing, incoming] = await Promise.all([
    db.friendship.findMany({ where: { fromId: userId }, include: { to: { select: person } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    db.friendship.findMany({ where: { toId: userId }, include: { from: { select: person } }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  const friends = new Map<string, typeof outgoing[number]['to']>();
  for (const item of outgoing) if (item.status === 'accepted') friends.set(item.toId, item.to);
  for (const item of incoming) if (item.status === 'accepted') friends.set(item.fromId, item.from);
  return NextResponse.json({ friends: [...friends.values()], incoming: incoming.filter(item => item.status === 'pending').map(item => item.from),
    outgoing: outgoing.filter(item => item.status === 'pending').map(item => item.to) }, { headers: { 'Cache-Control': 'no-store' } });
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
  const reverse = await db.friendship.findUnique({ where: { fromId_toId: { fromId: id, toId: userId } } });
  if (reverse?.status === 'pending') {
    await db.$transaction(async tx => {
      const changed = await tx.friendship.updateMany({ where: { id: reverse.id, status: 'pending' }, data: { status: 'accepted' } });
      if (changed.count) await queueSocialNotification(`accepted:${reverse.id}`, id, 'Your friend request was accepted.', `profile_${userId}`, tx);
    });
    after(flushSocialNotifications);
    return NextResponse.json({ status: 'accepted' });
  }
  const current = await db.friendship.findUnique({ where: { fromId_toId: { fromId: userId, toId: id } } });
  if (current?.status === 'accepted' || reverse?.status === 'accepted') return NextResponse.json({ status: 'accepted' });
  if (current?.status === 'pending') return NextResponse.json({ status: 'pending' });
  const sender = await db.user.findUnique({ where: { id: userId }, select: { username: true, displayName: true } });
  await db.$transaction(async tx => {
    const friendship = await tx.friendship.upsert({ where: { fromId_toId: { fromId: userId, toId: id } }, create: { fromId: userId, toId: id, status: 'pending' }, update: {} });
    await queueSocialNotification(`friend:${friendship.id}`, id, `${escapeTelegramHtml(sender?.username ? '@' + sender.username : sender?.displayName || 'Player')} sent you a friend request.`, `profile_${userId}`, tx);
  });
  after(flushSocialNotifications);
  return NextResponse.json({ status: 'pending' });
}

export async function PATCH(request: Request) {
  const limited = enforceRateLimit(request, 'social:friend-response', { limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const { id, action } = await request.json().catch(() => ({ id: null, action: null }));
  if (typeof id !== 'string' || id.length > 100 || !['accept', 'decline'].includes(action)) return NextResponse.json({ error: 'Некорректная заявка' }, { status: 400 });
  const filter = { fromId: id, toId: userId, status: 'pending' };
  const changed = await db.$transaction(async tx => {
    const friendship = await tx.friendship.findFirst({ where: filter, select: { id: true } });
    const changed = action === 'accept' ? await tx.friendship.updateMany({ where: filter, data: { status: 'accepted' } }) : await tx.friendship.deleteMany({ where: filter });
    if (changed.count && action === 'accept' && friendship) await queueSocialNotification(`accepted:${friendship.id}`, id, 'Your friend request was accepted.', `profile_${userId}`, tx);
    return changed;
  });
  if (changed.count && action === 'accept') after(flushSocialNotifications);
  return changed.count ? NextResponse.json({ status: action === 'accept' ? 'accepted' : 'declined' }) : NextResponse.json({ error: 'Заявка уже обработана' }, { status: 409 });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const { id } = await request.json().catch(() => ({ id: null }));
  if (typeof id !== 'string' || id.length > 100) return NextResponse.json({ error: 'Некорректный игрок' }, { status: 400 });
  await db.friendship.deleteMany({ where: { OR: [{ fromId: userId, toId: id }, { fromId: id, toId: userId }] } });
  return NextResponse.json({ ok: true });
}
