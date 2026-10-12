import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { roomCode } from '@/lib/multiplayer';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(request, 'multiplayer:rematch', { limit: 8, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  const { code } = await params;
  const old = await db.multiplayerRoom.findUnique({ where: { code: code.toUpperCase() }, include: { seats: true } });
  if (!userId || !old || old.status !== 'completed' || !old.seats.some(seat => seat.userId === userId))
    return NextResponse.json({ error: 'Повторная игра недоступна' }, { status: 403 });
  if (old.seriesTargetWins && !old.seriesWinnerKey) return NextResponse.json({ error: 'Сначала заверши серию' }, { status: 409 });
  if (old.nextRoomCode) return NextResponse.json({ code: old.nextRoomCode });

  // The completed room owns the next code. Every participant gets the same lobby,
  // including the original host, while the old season remains in history.
  for (let attempt = 0; attempt < 5; attempt++) {
    const nextCode = roomCode();
    try {
      const claimedCode = await db.$transaction(async tx => {
        const claimed = await tx.multiplayerRoom.updateMany({ where: { code: old.code, status: 'completed', nextRoomCode: null }, data: { nextRoomCode: nextCode } });
        if (!claimed.count) return null;
        await tx.multiplayerRoom.create({ data: {
          code: nextCode, hostUserId: old.hostUserId, maxPlayers: old.maxPlayers, seatCount: old.seats.length,
          ratingMode: old.ratingMode, draftMode: old.draftMode, showRatings: old.showRatings,
          eraFilter: old.eraFilter, eraStartYear: old.eraStartYear, eraEndYear: old.eraEndYear,
          withManager: false, seriesTargetWins: old.seriesTargetWins,
          seats: { create: old.seats.map(seat => ({ userId: seat.userId, isBot: seat.isBot, name: seat.name,
            formation: seat.formation, ready: seat.isBot })) },
        } });
        return nextCode;
      });
      if (claimedCode) return NextResponse.json({ code: claimedCode });
      const current = await db.multiplayerRoom.findUnique({ where: { code: old.code }, select: { nextRoomCode: true } });
      if (current?.nextRoomCode) return NextResponse.json({ code: current.nextRoomCode });
    } catch (error) {
      if (!['P2002', 'P2034'].includes((error as { code?: string }).code ?? '')) throw error;
    }
  }
  return NextResponse.json({ error: 'Не удалось создать комнату' }, { status: 503 });
}
