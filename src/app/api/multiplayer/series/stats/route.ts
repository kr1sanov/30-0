import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const wins = await db.multiplayerRoom.count({ where: { status: 'completed', seriesWinnerKey: userId, seriesTargetWins: { gt: 0 } } });
  return NextResponse.json({ seriesWins: wins }, { headers: { 'Cache-Control': 'no-store' } });
}
