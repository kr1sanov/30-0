import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

const person = { id: true, displayName: true, username: true, avatarColor: true, statusEmoji: true } as const;

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const [outgoing, incoming, seats, referrals] = await Promise.all([
    db.friendship.findMany({ where: { fromId: userId }, include: { to: { select: person } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    db.friendship.findMany({ where: { toId: userId }, include: { from: { select: person } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    db.multiplayerSeat.findMany({ where: { userId }, select: { roomCode: true }, orderBy: { joinedAt: 'desc' }, take: 40 }),
    db.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),
  ]);
  const friends = new Map<string, typeof outgoing[number]['to']>();
  for (const item of outgoing) if (item.status === 'accepted') friends.set(item.toId, item.to);
  for (const item of incoming) if (item.status === 'accepted') friends.set(item.fromId, item.from);
  const recentSeats = seats.length ? await db.multiplayerSeat.findMany({ where: { roomCode: { in: seats.map(s => s.roomCode) }, userId: { not: userId }, isBot: false }, select: { userId: true }, take: 100 }) : [];
  const contactIds = [...new Set(recentSeats.map(s => s.userId).filter((id): id is string => Boolean(id && id !== userId)))];
  const contacts = contactIds.length ? await db.user.findMany({ where: { id: { in: contactIds } }, select: person }) : [];
  const referred = referrals?.referralCode ? await db.user.findMany({ where: { referredBy: referrals.referralCode }, select: person, orderBy: { createdAt: 'desc' }, take: 30 }) : [];
  const suggestions = new Map(contacts.concat(referred).filter(p => !friends.has(p.id)).map(p => [p.id, p]));
  return NextResponse.json({ friends: [...friends.values()], incoming: incoming.filter(item => item.status === 'pending').map(item => item.from),
    outgoing: outgoing.filter(item => item.status === 'pending').map(item => item.to), suggestions: [...suggestions.values()] }, { headers: { 'Cache-Control': 'no-store' } });
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
    await db.friendship.update({ where: { id: reverse.id }, data: { status: 'accepted' } });
    return NextResponse.json({ status: 'accepted' });
  }
  const current = await db.friendship.findUnique({ where: { fromId_toId: { fromId: userId, toId: id } } });
  if (current?.status === 'accepted' || reverse?.status === 'accepted') return NextResponse.json({ status: 'accepted' });
  await db.friendship.upsert({ where: { fromId_toId: { fromId: userId, toId: id } }, create: { fromId: userId, toId: id, status: 'pending' }, update: { status: 'pending' } });
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
  const changed = action === 'accept' ? await db.friendship.updateMany({ where: filter, data: { status: 'accepted' } }) : await db.friendship.deleteMany({ where: filter });
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
