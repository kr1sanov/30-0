import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
  const body = await request.json().catch(() => ({}));
  if (body.round !== old.seriesRound) return NextResponse.json({ error: 'Обнови комнату перед продолжением серии' }, { status: 409 });
  const next = await db.$transaction(async tx => {
    const snapshot = await tx.multiplayerRoom.findUniqueOrThrow({ where: { code: old.code }, include: { seats: { include: { run: { include: { slots: true } } } } } });
    const rounds = JSON.parse(snapshot.roundsJson || '[]');
    const { roundsJson: _previous, ...archived } = snapshot;
    void _previous;
    rounds.push(archived);
    const claimed = await tx.multiplayerRoom.updateMany({ where: { code: old.code, status: 'completed', seriesRound: body.round, seriesWinnerKey: null }, data: {
      roundsJson: JSON.stringify(rounds), seriesRound: { increment: 1 }, status: 'lobby', draftStartAt: null, resultJson: null,
    } });
    if (!claimed.count) return false;
    for (const seat of snapshot.seats) {
      if (seat.runId) await tx.gameRun.update({ where: { id: seat.runId }, data: { gameMode: 'multiplayer', multiplayerRoomCode: old.code, multiplayerRound: old.seriesRound } });
      await tx.multiplayerSeat.update({ where: { id: seat.id }, data: { runId: null, ready: seat.isBot, forfeited: false, lastSeenAt: null,
        pickDeadline: null, pendingSpinJson: null, resultViewedAt: null } });
    }
    return true;
  });
  return next ? NextResponse.json({ code: old.code }) : NextResponse.json({ error: 'Раунд уже изменился. Обнови комнату' }, { status: 409 });
}
