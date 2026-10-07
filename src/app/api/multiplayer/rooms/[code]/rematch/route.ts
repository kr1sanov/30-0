import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { roomCode } from '@/lib/multiplayer';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(request, 'multiplayer:rematch', { limit: 4, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  const { code } = await params;
  const old = await db.multiplayerRoom.findUnique({ where: { code: code.toUpperCase() }, include: { seats: true } });
  if (!userId || !old || old.status !== 'completed' || !old.seats.some(seat => seat.userId === userId))
    return NextResponse.json({ error: 'Повторная игра недоступна' }, { status: 403 });
  const ownSeat = old.seats.find(seat => seat.userId === userId)!;
  const bots = old.seats.filter(seat => seat.isBot);
  for (let attempt = 0; attempt < 5; attempt++) {
    const nextCode = roomCode();
    try {
      await db.multiplayerRoom.create({ data: {
        code: nextCode, hostUserId: userId, maxPlayers: old.maxPlayers, seatCount: 1 + bots.length,
        ratingMode: old.ratingMode, draftMode: old.draftMode, showRatings: old.showRatings,
        eraFilter: old.eraFilter, eraStartYear: old.eraStartYear, eraEndYear: old.eraEndYear,
        withManager: old.withManager,
        seats: { create: [
          { userId, name: ownSeat.name, formation: ownSeat.formation, ready: false },
          ...bots.map(seat => ({ isBot: true, name: seat.name, formation: seat.formation, ready: true })),
        ] },
      } });
      return NextResponse.json({ code: nextCode });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
  }
  return NextResponse.json({ error: 'Не удалось создать комнату' }, { status: 503 });
}
