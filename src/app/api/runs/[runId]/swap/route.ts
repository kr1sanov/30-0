import { DraftConflict } from '@/lib/draftSelection';
import { db } from '@/lib/db';
import { canFillSlotStrict } from '@/lib/positions';
import type { Position } from '@/lib/positions';
import { enforceRateLimit } from '@/lib/rateLimit';
import { authorizeRun } from '@/lib/runAccess';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const limited = enforceRateLimit(request, 'runs:swap', { limit: 60, windowMs: 60_000 });
    if (limited) return limited;
    const denied = await authorizeRun(request, runId);
    if (denied) return denied;

    const body = await request.json();
    const { fromSlotPosition, toSlotPosition } = body as {
      fromSlotPosition: string;
      toSlotPosition: string;
    };

    if (!fromSlotPosition || !toSlotPosition) {
      return NextResponse.json(
        { error: 'fromSlotPosition and toSlotPosition are required' },
        { status: 400 },
      );
    }

    // Get the run with slots
    const run = await db.gameRun.findUnique({
      where: { id: runId },
      include: { slots: true },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    const multiplayerSeat = await db.multiplayerSeat.findUnique({ where: { runId } });
    if (multiplayerSeat) {
      const room = await db.multiplayerRoom.findUnique({ where: { code: multiplayerSeat.roomCode } });
      if (room?.status !== 'drafting' || multiplayerSeat.isBot || !multiplayerSeat.pickDeadline || multiplayerSeat.pickDeadline <= new Date()) {
        return NextResponse.json({ error: 'Время драфта истекло' }, { status: 409 });
      }
    }

    if (run.completed) {
      return NextResponse.json(
        { error: 'Run is already completed' },
        { status: 400 },
      );
    }

    // Find both slots
    const fromSlot = run.slots.find((s) => s.slotPosition === fromSlotPosition);
    const toSlot = run.slots.find((s) => s.slotPosition === toSlotPosition);

    if (!fromSlot || !toSlot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    // Save original data for swapping — include ALL fields
    const fromData = {
      playerSeasonId: fromSlot.playerSeasonId,
      playerSeasonYear: fromSlot.playerSeasonYear,
      playerName: fromSlot.playerName,
      playerLastName: fromSlot.playerLastName,
      playerRating: fromSlot.playerRating,
      playerPrimeRating: fromSlot.playerPrimeRating,
      playerPosition: fromSlot.playerPosition,
      playerOtherPositions: fromSlot.playerOtherPositions,
      playerNationality: fromSlot.playerNationality,
    };

    const toData = {
      playerSeasonId: toSlot.playerSeasonId,
      playerSeasonYear: toSlot.playerSeasonYear,
      playerName: toSlot.playerName,
      playerLastName: toSlot.playerLastName,
      playerRating: toSlot.playerRating,
      playerPrimeRating: toSlot.playerPrimeRating,
      playerPosition: toSlot.playerPosition,
      playerOtherPositions: toSlot.playerOtherPositions,
      playerNationality: toSlot.playerNationality,
    };

    // Calculate compatibility after swap — STRICT matching
    const fromPos = fromSlotPosition.split('_')[0] as Position;
    const toPos = toSlotPosition.split('_')[0] as Position;

    // Parse otherPositions from comma-separated string
    const parseOtherPositions = (pos: string | null | undefined): Position[] => {
      if (!pos) return [];
      return pos.split(',').map((p) => p.trim()) as Position[];
    };

    // If toSlot has a player, check if that player can play at fromPos
    if (toData.playerPosition) {
      const toPlayerOtherPositions = parseOtherPositions(toData.playerOtherPositions);
      const canFill = canFillSlotStrict(
        toData.playerPosition as Position,
        toPlayerOtherPositions,
        fromPos,
      );
      if (!canFill) {
        return NextResponse.json(
          { error: `${toData.playerName} не может играть на ${fromPos}` },
          { status: 400 },
        );
      }
    }

    // Check if fromSlot's player can play at toPos
    if (fromData.playerPosition) {
      const fromPlayerOtherPositions = parseOtherPositions(fromData.playerOtherPositions);
      const canFill = canFillSlotStrict(
        fromData.playerPosition as Position,
        fromPlayerOtherPositions,
        toPos,
      );
      if (!canFill) {
        return NextResponse.json(
          { error: `${fromData.playerName} не может играть на ${toPos}` },
          { status: 400 },
        );
      }
    }

    // Reject stale snapshots rather than overwrite a concurrent pick or move.
    await db.$transaction(async tx => {
      const locked = await tx.gameRun.updateMany({ where: { id: runId, completed: false }, data: { rerollsUsed: { increment: 0 } } });
      if (!locked.count) throw new DraftConflict('Драфт уже завершён');
      if (multiplayerSeat) {
        const active = await tx.multiplayerSeat.findFirst({ where: { id: multiplayerSeat.id,
          pickDeadline: { gt: new Date() }, room: { status: 'drafting' } }, select: { id: true } });
        if (!active) throw new DraftConflict('Время драфта истекло');
      }
      const moved = await tx.gameSlot.updateMany({ where: { id: fromSlot.id, ...fromData }, data: { ...toData, isCompatible: true } });
      if (!moved.count) throw new DraftConflict('Состав изменился. Повтори перемещение');
      if (toSlot.id !== fromSlot.id) {
        const replaced = await tx.gameSlot.updateMany({ where: { id: toSlot.id, ...toData }, data: { ...fromData, isCompatible: true } });
        if (!replaced.count) throw new DraftConflict('Состав изменился. Повтори перемещение');
      }
    });

    // Return the updated run
    const updatedRun = await db.gameRun.findUnique({
      where: { id: runId },
      include: { slots: { orderBy: { slotPosition: 'asc' } } },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    if (error instanceof DraftConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error('Failed to swap slots:', error);
    return NextResponse.json(
      { error: 'Failed to swap slots' },
      { status: 500 },
    );
  }
}
