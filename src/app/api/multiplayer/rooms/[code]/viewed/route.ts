import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const { code } = await params;
  const room = await db.multiplayerRoom.findUnique({ where: { code: code.toUpperCase() }, select: { status: true } });
  if (room?.status !== 'completed') return NextResponse.json({ error: 'Сезон ещё не завершён' }, { status: 409 });
  const updated = await db.multiplayerSeat.updateMany({ where: { roomCode: code.toUpperCase(), userId }, data: { resultViewedAt: new Date() } });
  return updated.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
}
