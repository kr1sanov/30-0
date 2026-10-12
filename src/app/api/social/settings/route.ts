import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';
import { AVATAR_COLORS, STATUS_EMOJIS } from '@/lib/profileLinks';

export async function PATCH(request: Request) {
  const limited = enforceRateLimit(request, 'social:settings', { limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const { avatarColor, statusEmoji } = await request.json().catch(() => ({}));
  if ((avatarColor !== undefined && !AVATAR_COLORS.includes(avatarColor)) || (statusEmoji !== undefined && !STATUS_EMOJIS.includes(statusEmoji)) || (avatarColor === undefined && statusEmoji === undefined))
    return NextResponse.json({ error: 'Выбери цвет или статус из списка' }, { status: 400 });
  const user = await db.user.update({ where: { id: userId }, data: { ...(avatarColor !== undefined ? { avatarColor } : {}), ...(statusEmoji !== undefined ? { statusEmoji } : {}) }, select: { avatarColor: true, statusEmoji: true } });
  return NextResponse.json(user);
}
