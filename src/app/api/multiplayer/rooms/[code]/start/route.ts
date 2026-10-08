import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSeatRun } from '@/lib/multiplayer';
import { draftBot } from '@/lib/multiplayerBots';
import { getRandomManager } from '@/lib/managers';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(request, 'multiplayer:start', { limit: 6, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  const { code } = await params;
  const room = await db.multiplayerRoom.findUnique({ where: { code: code.toUpperCase() }, include: { seats: true } });
  if (!room || !userId || !room.seats.some(seat => seat.userId === userId)) return NextResponse.json({ error: 'Нет доступа к игре' }, { status: 403 });
  if (room.status !== 'lobby' || room.seats.length < 2 || room.seats.some(seat => !seat.ready) || !room.draftStartAt || room.draftStartAt.getTime() > Date.now())
    return NextResponse.json({ error: 'Дождись готовности игроков и конца отсчёта' }, { status: 409 });
  const claimed = await db.multiplayerRoom.updateMany({ where: { code: room.code, status: 'lobby', draftStartAt: { lte: new Date() } }, data: { status: 'starting' } });
  if (!claimed.count) return NextResponse.json({ error: 'Игра уже началась' }, { status: 409 });
  const createdRunIds: string[] = [];
  try {
    for (const seat of room.seats) {
      if (!seat.seriesMemberKey) await db.multiplayerSeat.update({ where: { id: seat.id }, data: { seriesMemberKey: seat.userId ?? `bot:${seat.id}` } });
      const runId = await createSeatRun(seat, room, seat.userId || undefined);
      createdRunIds.push(runId);
      if (room.withManager) {
        const manager = getRandomManager();
        if (manager) await db.multiplayerSeat.update({ where: { id: seat.id }, data: { managerName: manager.name, managerRating: manager.rating } });
      }
      if (seat.isBot) await draftBot(runId, room.eraStartYear, room.eraEndYear);
      else await db.multiplayerSeat.update({ where: { id: seat.id }, data: { ready: false } });
    }
    // One shared deadline begins only when every participant can actually draft.
    const deadline = new Date(Date.now() + 180_000);
    await db.$transaction([
      db.multiplayerSeat.updateMany({ where: { roomCode: room.code, isBot: false }, data: { pickDeadline: deadline } }),
      db.multiplayerRoom.update({ where: { code: room.code }, data: { status: 'drafting' } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Multiplayer start:', error);
    await db.multiplayerSeat.updateMany({ where: { roomCode: room.code, runId: { in: createdRunIds } }, data: { runId: null, pickDeadline: null } });
    await db.gameRun.deleteMany({ where: { id: { in: createdRunIds } } });
    await db.multiplayerRoom.update({ where: { code: room.code }, data: { status: 'lobby', draftStartAt: null } });
    return NextResponse.json({ error: 'Не удалось начать драфт' }, { status: 500 });
  }
}
