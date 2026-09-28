import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rateLimit';
import { sameOrigin, sessionUser } from '@/lib/telegramSession';
import { NextRequest, NextResponse } from 'next/server';

const codePattern = /^[A-HJ-NP-Z2-9]{6}$/;
function code() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(6), byte => alphabet[byte % alphabet.length]).join('');
}

export async function POST(request: NextRequest) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник' }, { status: 403 });
  const limited = enforceRateLimit(request, 'multiplayer:rooms', { limit: 12, windowMs: 60_000 });
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true } });
  if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 });
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 30) : user.displayName;
  if (name.length < 2) return NextResponse.json({ error: 'Введите имя' }, { status: 400 });

  if (body.code) {
    const roomCode = String(body.code).toUpperCase().trim();
    if (!codePattern.test(roomCode)) return NextResponse.json({ error: 'Неверный код' }, { status: 400 });
    try {
      const room = await db.$transaction(async tx => {
        const existing = await tx.multiplayerSeat.findUnique({ where: { roomCode_userId: { roomCode, userId } } });
        if (existing) return tx.multiplayerRoom.findUniqueOrThrow({ where: { code: roomCode } });
        const updated = await tx.multiplayerRoom.updateMany({ where: { code: roomCode, status: 'lobby', seatCount: { lt: 6 } }, data: { seatCount: { increment: 1 } } });
        if (!updated.count) throw new Error('Комната недоступна или игра уже началась');
        const room = await tx.multiplayerRoom.findUniqueOrThrow({ where: { code: roomCode } });
        if (room.seatCount > room.maxPlayers) throw new Error('В комнате нет свободных мест');
        await tx.multiplayerSeat.create({ data: { roomCode, userId, name } });
        return room;
      });
      return NextResponse.json({ code: room.code });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Не удалось войти' }, { status: 409 });
    }
  }

  const maxPlayers = Number(body.maxPlayers);
  if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 6) {
    return NextResponse.json({ error: 'От 2 до 6 игроков' }, { status: 400 });
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const room = await db.multiplayerRoom.create({ data: {
        code: code(), hostUserId: userId, maxPlayers,
        seats: { create: { userId, name } },
      } });
      return NextResponse.json({ code: room.code }, { status: 201 });
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  return NextResponse.json({ error: 'Не удалось создать комнату' }, { status: 500 });
}
