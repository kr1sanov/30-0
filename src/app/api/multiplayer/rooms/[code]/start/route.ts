import { db } from '@/lib/db';
import { FORMATIONS } from '@/lib/positions';
import { ensureRunAccessConfigured } from '@/lib/runAccess';
import { enforceRateLimit } from '@/lib/rateLimit';
import { sameOrigin, sessionUser } from '@/lib/telegramSession';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник' }, { status: 403 });
  const limited = enforceRateLimit(request, 'multiplayer:start', { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  ensureRunAccessConfigured();
  const { code } = await params;
  try {
    await db.$transaction(async tx => {
      const room = await tx.multiplayerRoom.findUnique({ where: { code }, include: { seats: true } });
      if (!room || room.hostUserId !== userId || room.status !== 'lobby') throw new Error('Комната недоступна');
      if (room.seats.length < 2 || room.seats.some(seat => !seat.ready)) throw new Error('Нужно минимум два готовых участника');
      const locked = await tx.multiplayerRoom.updateMany({ where: { code, status: 'lobby' }, data: { status: 'drafting' } });
      if (locked.count !== 1) throw new Error('Игра уже началась');
      for (const seat of room.seats) {
        const formation = FORMATIONS.find(item => item.id === seat.formation);
        if (!formation) throw new Error('Неизвестная схема');
        const run = await tx.gameRun.create({ data: {
          userId: seat.userId, formation: seat.formation, difficulty: 'normal', draftMode: 'squad_first',
          ratingMode: room.ratingMode, eraStartYear: room.eraStartYear, eraEndYear: room.eraEndYear,
          teamName: seat.name, rerollsTotal: 1,
          slots: { create: formation.slots.map((slot, index) => ({ slotPosition: `${slot.position}_${index}` })) },
        } });
        await tx.multiplayerSeat.update({ where: { id: seat.id }, data: { runId: run.id } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Не удалось начать игру' }, { status: 409 });
  }
}
