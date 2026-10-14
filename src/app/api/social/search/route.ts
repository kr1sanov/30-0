import { publicAvatarUrl } from '@/lib/avatarUrl';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Авторизуйся' }, { status: 401 });
  const limited = enforceRateLimit(request, 'social:search', { limit: 40, windowMs: 60_000 });
  if (limited) return limited;
  const query = new URL(request.url).searchParams.get('q')?.trim().replace(/^@/, '') ?? '';
  if (!/^[A-Za-z0-9_]{2,32}$/.test(query)) return NextResponse.json({ players: [] });
  const players = await db.user.findMany({ where: { id: { not: userId }, username: { startsWith: query }, deleteAfterAt: null },
    select: { id: true, username: true, displayName: true, photoUrl: true, avatarColor: true, statusEmoji: true }, orderBy: { username: 'asc' }, take: 20 });
  return NextResponse.json({ players: players.map(player => ({ ...player, photoUrl: publicAvatarUrl(player.photoUrl) })) }, { headers: { 'Cache-Control': 'no-store' } });
}
