import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { roomCode } from '@/lib/multiplayer';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(request, 'multiplayer:next', { limit: 8, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  const { code } = await params;
  const old = await db.multiplayerRoom.findUnique({ where: { code: code.toUpperCase() }, include: { seats: true } });
  if (!userId || !old || !old.seats.some(seat => seat.userId === userId)) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  if (old.nextRoomCode) return NextResponse.json({ code: old.nextRoomCode });
  if (old.status !== 'completed' || !old.seriesTargetWins || old.seriesWinnerKey)
    return NextResponse.json({ error: 'Серия уже завершена' }, { status: 409 });
  // Everyone in the series may advance it; the compare-and-set prevents duplicate rounds.
  for (let attempt = 0; attempt < 5; attempt++) {
    const nextCode = roomCode();
    try {
      const next = await db.$transaction(async tx => {
        const claimed = await tx.multiplayerRoom.updateMany({ where: { code: old.code, status: 'completed', nextRoomCode: null, seriesWinnerKey: null }, data: { nextRoomCode: nextCode } });
        if (!claimed.count) return null;
        await tx.multiplayerRoom.create({ data: {
          code: nextCode, hostUserId: old.hostUserId, maxPlayers: old.maxPlayers, seatCount: old.seats.length,
          ratingMode: old.ratingMode, draftMode: old.draftMode, showRatings: old.showRatings,
          eraFilter: old.eraFilter, eraStartYear: old.eraStartYear, eraEndYear: old.eraEndYear,
          withManager: false, seriesTargetWins: old.seriesTargetWins, seriesRound: old.seriesRound + 1,
          seriesRootCode: old.seriesRootCode ?? old.code,
          seriesScoreJson: old.seriesScoreJson,
          seats: { create: old.seats.map(seat => ({ userId: seat.userId, isBot: seat.isBot, name: seat.name,
            formation: seat.formation, ready: seat.isBot, seriesMemberKey: seat.seriesMemberKey ?? seat.userId ?? `bot:${seat.id}` })) },
        } });
        return nextCode;
      });
      if (next) return NextResponse.json({ code: next });
      const current = await db.multiplayerRoom.findUnique({ where: { code: old.code }, select: { nextRoomCode: true } });
      return NextResponse.json({ code: current?.nextRoomCode });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }
  return NextResponse.json({ error: 'Не удалось создать раунд' }, { status: 503 });
}
