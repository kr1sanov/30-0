import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publicRoom, resolveRoom, roomName, validEra, validFormation, syncLobbyCountdown } from '@/lib/multiplayer';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';
import { setRunAccessCookie } from '@/lib/runAccess';
import { draftBot } from '@/lib/multiplayerBots';
import { ERA_CONFIG } from '@/lib/types';

type Context = { params: Promise<{ code: string }> };
export const runtime = 'nodejs';

export async function GET(request: Request, { params }: Context) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const { code } = await params;
  const authorized = await db.multiplayerSeat.findUnique({ where: { roomCode_userId: { roomCode: code.toUpperCase(), userId } } });
  if (!authorized) return NextResponse.json({ error: 'Комната недоступна' }, { status: 404 });
  await syncLobbyCountdown(code.toUpperCase());
  const allReady = await db.multiplayerSeat.count({ where: { roomCode: code.toUpperCase(), ready: false, room: { status: 'drafting' } } }) === 0;
  if (allReady) {
    const deadline = new Date(Date.now() + 10_000);
    await db.multiplayerSeat.updateMany({ where: { roomCode: code.toUpperCase(), isBot: false, pickDeadline: { gt: deadline } },
      data: { pickDeadline: deadline } });
  }
  const expired = await db.multiplayerSeat.findMany({ where: { roomCode: code.toUpperCase(),
    isBot: false, pickDeadline: { lte: new Date() },
    room: { status: 'drafting' } }, include: { room: true } });
  for (const seat of expired) {
    if (!seat.runId) continue;
    const claimed = await db.multiplayerSeat.updateMany({ where: { id: seat.id, pickDeadline: seat.pickDeadline },
      data: { pickDeadline: null } });
    if (!claimed.count) continue;
    try {
      const count = await db.gameSlot.count({ where: { runId: seat.runId, playerSeasonId: { not: null } } });
      await draftBot(seat.runId, seat.room.eraStartYear, seat.room.eraEndYear, 11);
      await db.multiplayerSeat.update({ where: { id: seat.id }, data: { ready: true, forfeited: count < 11 } });
    } catch (error) {
      console.error('Multiplayer auto finish:', error);
      await db.multiplayerSeat.update({ where: { id: seat.id }, data: { pickDeadline: seat.pickDeadline } });
    }
  }
  const waiting = await db.multiplayerSeat.count({ where: { roomCode: code.toUpperCase(), ready: false } });
  const activeClocks = await db.multiplayerSeat.count({ where: { roomCode: code.toUpperCase(), isBot: false, pickDeadline: { gt: new Date() } } });
  if (!waiting && !activeClocks) await resolveRoom(code.toUpperCase()).catch(error => console.error('Multiplayer resolve:', error));
  const room = await publicRoom(code.toUpperCase(), userId);
  if (!room) return NextResponse.json({ error: 'Комната недоступна' }, { status: 404 });
  const response = NextResponse.json(room, { headers: { 'Cache-Control': 'no-store' } });
  if (room.ownRun) setRunAccessCookie(response, room.ownRun.id);
  return response;
}

export async function PATCH(request: Request, { params }: Context) {
  const limited = enforceRateLimit(request, 'multiplayer:update', { limit: 50, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  const { code } = await params;
  const room = await db.multiplayerRoom.findUnique({ where: { code: code.toUpperCase() }, include: { seats: true } });
  if (!room || !room.seats.some(seat => seat.userId === userId)) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  if (room.status !== 'lobby') return NextResponse.json({ error: 'Лобби закрыто' }, { status: 409 });
  try {
    const body = await request.json();
    if (room.seriesRound > 1 && body.action !== 'seat')
      return NextResponse.json({ error: 'Правила и участники серии уже зафиксированы' }, { status: 409 });
    if (body.action === 'seat') {
      const formation = String(body.formation);
      const name = roomName(body.name);
      if (!validFormation(formation) || name.length < 2) return NextResponse.json({ error: 'Проверьте имя и схему' }, { status: 400 });
      await db.multiplayerSeat.update({ where: { roomCode_userId: { roomCode: room.code, userId } },
        data: { formation, name, ready: Boolean(body.ready) } });
    } else if (body.action === 'capacity') {
      const maxPlayers = Number(body.maxPlayers);
      if (!Number.isInteger(maxPlayers) || maxPlayers < room.seatCount || maxPlayers > 6 || maxPlayers < 2)
        return NextResponse.json({ error: 'Выберите от 2 до 6 мест' }, { status: 400 });
      const resized = await db.multiplayerRoom.updateMany({ where: { code: room.code, status: 'lobby', seatCount: { lte: maxPlayers } }, data: { maxPlayers } });
      if (!resized.count) return NextResponse.json({ error: 'Количество игроков изменилось. Обновите лобби' }, { status: 409 });
      await db.multiplayerSeat.updateMany({ where: { roomCode: room.code, isBot: false }, data: { ready: false } });
    } else if (body.action === 'settings' && room.hostUserId === userId) {
      const maxPlayers = Number(body.maxPlayers), eraStartYear = Number(body.eraStartYear), eraEndYear = Number(body.eraEndYear);
      const seriesTargetWins = Number(body.seriesTargetWins ?? room.seriesTargetWins);
      const eraFilter = String(body.eraFilter);
      if (!Number.isInteger(maxPlayers) || maxPlayers < room.seatCount || maxPlayers > 6 || maxPlayers < 2 ||
        !Number.isInteger(seriesTargetWins) || ![0, 2, 3, 5].includes(seriesTargetWins) || (room.seriesRound > 1 && seriesTargetWins !== room.seriesTargetWins) ||
        !validEra(eraStartYear, eraEndYear) || !['season', 'prime'].includes(body.ratingMode) ||
        !['squad_first', 'position_first'].includes(body.draftMode) || !(eraFilter in ERA_CONFIG) ||
        (eraFilter !== 'custom' && (eraStartYear !== ERA_CONFIG[eraFilter as keyof typeof ERA_CONFIG].minYear || eraEndYear !== ERA_CONFIG[eraFilter as keyof typeof ERA_CONFIG].maxYear))) {
        return NextResponse.json({ error: 'Неверные правила' }, { status: 400 });
      }
      await db.multiplayerRoom.update({ where: { code: room.code }, data: {
        maxPlayers, eraStartYear, eraEndYear, eraFilter, seriesTargetWins, ratingMode: body.ratingMode,
        draftMode: body.draftMode, showRatings: Boolean(body.showRatings), withManager: Boolean(body.withManager),
      } });
      await db.multiplayerSeat.updateMany({ where: { roomCode: room.code, isBot: false }, data: { ready: false } });
    } else if (body.action === 'bot') {
      const reserved = await db.multiplayerRoom.updateMany({ where: { code: room.code, status: 'lobby', seatCount: { lt: room.maxPlayers }, maxPlayers: { gte: room.seatCount + 1 } }, data: { seatCount: { increment: 1 } } });
      if (!reserved.count) return NextResponse.json({ error: 'Все места заняты' }, { status: 409 });
      try { await db.multiplayerSeat.create({ data: { roomCode: room.code, isBot: true, name: `Бот ${room.seatCount}`, ready: true } }); }
      catch (error) { await db.multiplayerRoom.update({ where: { code: room.code }, data: { seatCount: { decrement: 1 } } }); throw error; }
    } else if (body.action === 'remove-bot') {
      const botId = typeof body.botId === 'string' ? body.botId : '';
      const bot = room.seats.find(seat => seat.id === botId && seat.isBot);
      if (!bot) return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });
      await db.$transaction(async tx => {
        const reserved = await tx.multiplayerRoom.updateMany({ where: { code: room.code, status: 'lobby' }, data: { seatCount: { decrement: 1 } } });
        if (!reserved.count) throw new Error('Лобби закрыто');
        const removed = await tx.multiplayerSeat.deleteMany({ where: { id: bot.id, roomCode: room.code, isBot: true } });
        if (!removed.count) throw new Error('Бот уже удалён');
      });
    } else return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    await syncLobbyCountdown(room.code);
    return NextResponse.json(await publicRoom(room.code, userId));
  } catch (error) { console.error('Multiplayer update:', error); return NextResponse.json({ error: 'Не удалось изменить комнату' }, { status: 500 }); }
}
