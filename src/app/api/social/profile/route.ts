import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { AVATARS, STYLES } from '@/lib/profileEconomy';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся, чтобы открыть профиль' }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: userId }, select: {
    tokenBalance: true, selectedAvatar: true, profileStyle: true,
    profileUnlocks: { select: { key: true } },
  } });
  return user ? NextResponse.json({ ...user, unlocks: user.profileUnlocks.map(item => item.key), avatars: AVATARS, styles: STYLES })
    : NextResponse.json({ error: 'Профиль не найден' }, { status: 404 });
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'social:profile', { limit: 15, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const kind = body.kind === 'avatar' ? 'avatar' : body.kind === 'style' ? 'style' : null;
  const item = kind === 'avatar' ? AVATARS.find(value => value.key === body.key) : STYLES.find(value => value.key === body.key);
  if (!kind || !item) return NextResponse.json({ error: 'Неизвестное оформление' }, { status: 400 });
  const key = `${kind}:${item.key}`;
  try {
    const user = await db.$transaction(async tx => {
      if (item.price) {
        const unlocked = await tx.profileUnlock.findUnique({ where: { userId_key: { userId, key } } });
        if (!unlocked) {
          const debit = await tx.user.updateMany({ where: { id: userId, tokenBalance: { gte: item.price } }, data: { tokenBalance: { decrement: item.price } } });
          if (!debit.count) throw new Error('INSUFFICIENT');
          await tx.profileUnlock.create({ data: { userId, key } });
          await tx.tokenEntry.create({ data: { userId, amount: -item.price, reason: key } });
        }
      }
      return tx.user.update({ where: { id: userId }, data: kind === 'avatar' ? { selectedAvatar: item.key } : { profileStyle: item.key },
        select: { tokenBalance: true, selectedAvatar: true, profileStyle: true } });
    });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT') return NextResponse.json({ error: 'Недостаточно токенов' }, { status: 409 });
    console.error('Profile unlock failed', error);
    return NextResponse.json({ error: 'Покупка не завершена. Попробуй снова' }, { status: 500 });
  }
}
