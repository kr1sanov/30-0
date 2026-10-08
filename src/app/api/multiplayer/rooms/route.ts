import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { roomCode, roomName } from '@/lib/multiplayer';
import { ERA_CONFIG } from '@/lib/types';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'multiplayer:create', { limit: 12, windowMs: 60_000 });
  if (limited) return limited;
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый запрос' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войди через Telegram' }, { status: 401 });
  try {
    const body = await request.json();
    const name = roomName(body.name);
    if (name.length < 2) return NextResponse.json({ error: 'Введи имя от 2 символов' }, { status: 400 });
    if (body.code) {
      const code = String(body.code).toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return NextResponse.json({ error: 'Неверный код' }, { status: 400 });
      const room = await db.multiplayerRoom.findUnique({ where: { code } });
      if (!room) return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
      const existing = await db.multiplayerSeat.findUnique({ where: { roomCode_userId: { roomCode: code, userId } } });
      if (existing) return NextResponse.json({ code });
      if (room.status !== 'lobby') return NextResponse.json({ error: 'Драфт уже начался' }, { status: 409 });
      const reserved = await db.multiplayerRoom.updateMany({ where: { code, status: 'lobby', seatCount: { lt: room.maxPlayers } }, data: { seatCount: { increment: 1 } } });
      if (!reserved.count) return NextResponse.json({ error: 'Все места заняты' }, { status: 409 });
      try { await db.multiplayerSeat.create({ data: { roomCode: code, userId, name } }); }
      catch (error) { await db.multiplayerRoom.update({ where: { code }, data: { seatCount: { decrement: 1 } } }); throw error; }
      return NextResponse.json({ code });
    }
    const maxPlayers = Number(body.maxPlayers ?? 2);
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 6) return NextResponse.json({ error: 'Можно выбрать от 2 до 6 мест' }, { status: 400 });
    const seriesTargetWins = Number(body.seriesTargetWins ?? 0);
    if (![0, 2, 3, 5].includes(seriesTargetWins)) return NextResponse.json({ error: 'Выбери формат серии' }, { status: 400 });
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = roomCode();
      try {
        await db.multiplayerRoom.create({ data: { code, hostUserId: userId, maxPlayers, seriesTargetWins,
          eraStartYear: ERA_CONFIG.all.minYear, eraEndYear: ERA_CONFIG.all.maxYear,
          seats: { create: { userId, name } } } });
        return NextResponse.json({ code }, { status: 201 });
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error;
      }
    }
    return NextResponse.json({ error: 'Не удалось создать код' }, { status: 503 });
  } catch (error) { console.error('Multiplayer create/join:', error); return NextResponse.json({ error: 'Не удалось открыть комнату' }, { status: 500 }); }
}
