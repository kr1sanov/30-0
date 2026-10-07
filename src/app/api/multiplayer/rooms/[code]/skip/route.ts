import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const { code } = await params;
  const seat = await db.multiplayerSeat.findUnique({ where: { roomCode_userId: { roomCode: code.toUpperCase(), userId } }, include: { room: true } });
  if (!seat || seat.room.status !== 'drafting' || !seat.pickDeadline || seat.pickDeadline <= new Date() || seat.ready)
    return NextResponse.json({ error: 'Драфт закрыт' }, { status: 409 });
  await db.multiplayerSeat.update({ where: { id: seat.id }, data: { pendingSpinJson: null } });
  return NextResponse.json({ ok: true });
}
