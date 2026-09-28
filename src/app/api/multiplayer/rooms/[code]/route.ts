import { db } from '@/lib/db';
import { FORMATIONS } from '@/lib/positions';
import { ensureRunAccessConfigured, setRunAccessCookie } from '@/lib/runAccess';
import { enforceRateLimit } from '@/lib/rateLimit';
import { sameOrigin, sessionUser } from '@/lib/telegramSession';
import { NextRequest, NextResponse } from 'next/server';

type Context = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, context: Context) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const { code } = await context.params;
  const room = await db.multiplayerRoom.findUnique({ where: { code }, include: {
    seats: { orderBy: { joinedAt: 'asc' }, include: { run: { include: { slots: true } } } },
  } });
  if (!room || !room.seats.some(seat => seat.userId === userId)) {
    return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
  }
  const ownSeat = room.seats.find(seat => seat.userId === userId)!;
  const seats = room.seats.map(seat => ({
    id: seat.id, name: seat.name, formation: seat.formation, ready: seat.ready,
    drafted: seat.run?.slots.filter(slot => slot.playerSeasonId).length ?? 0,
    result: seat.run?.completed ? { wins: seat.run.wins, draws: seat.run.draws, losses: seat.run.losses, points: seat.run.points, overallRating: seat.run.overallRating } : null,
    isYou: seat.userId === userId, isHost: seat.userId === room.hostUserId,
  }));
  const response = NextResponse.json({
    code: room.code, status: room.status, maxPlayers: room.maxPlayers,
    ratingMode: room.ratingMode, eraStartYear: room.eraStartYear, eraEndYear: room.eraEndYear,
    isHost: room.hostUserId === userId, seats, ownRun: ownSeat.run,
  }, { headers: { 'Cache-Control': 'no-store' } });
  if (ownSeat.runId) {
    ensureRunAccessConfigured();
    setRunAccessCookie(response, ownSeat.runId);
  }
  return response;
}

export async function PATCH(request: NextRequest, context: Context) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник' }, { status: 403 });
  const limited = enforceRateLimit(request, 'multiplayer:room:update', { limit: 40, windowMs: 60_000 });
  if (limited) return limited;
  const { code } = await context.params;
  const body = await request.json().catch(() => ({}));
  const room = await db.multiplayerRoom.findUnique({ where: { code }, include: { seats: true } });
  if (!room || !room.seats.some(seat => seat.userId === userId)) return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Игра уже началась' }, { status: 409 });
  if (body.action === 'settings') {
    if (room.hostUserId !== userId) return NextResponse.json({ error: 'Только организатор может менять правила' }, { status: 403 });
    const maxPlayers = Number(body.maxPlayers);
    const eraStartYear = Number(body.eraStartYear);
    const eraEndYear = Number(body.eraEndYear);
    if (!Number.isInteger(maxPlayers) || maxPlayers < room.seatCount || maxPlayers > 6 || ![2010, 2019, 2024].includes(eraStartYear) || ![2018, 2026].includes(eraEndYear) || eraEndYear < eraStartYear || !['season', 'prime'].includes(body.ratingMode)) {
      return NextResponse.json({ error: 'Некорректные правила комнаты' }, { status: 400 });
    }
    await db.multiplayerRoom.update({ where: { code }, data: { maxPlayers, eraStartYear, eraEndYear, ratingMode: body.ratingMode } });
    return NextResponse.json({ ok: true });
  }
  if (body.action !== 'seat') return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  const formation = String(body.formation || '');
  const name = String(body.name || '').trim();
  if (!FORMATIONS.some(item => item.id === formation) || name.length < 2 || name.length > 30 || typeof body.ready !== 'boolean') {
    return NextResponse.json({ error: 'Проверьте имя и схему' }, { status: 400 });
  }
  await db.multiplayerSeat.update({ where: { roomCode_userId: { roomCode: code, userId } }, data: { name, formation, ready: body.ready } });
  return NextResponse.json({ ok: true });
}
