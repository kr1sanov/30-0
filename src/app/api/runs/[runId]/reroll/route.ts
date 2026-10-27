import { selectDraftPlayers, DraftConflict } from '@/lib/draftSelection';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rateLimit';
import { authorizeRun } from '@/lib/runAccess';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const limited = enforceRateLimit(request, 'runs:reroll', { limit: 30, windowMs: 60_000 });
    if (limited) return limited;
    const denied = await authorizeRun(request, runId);
    if (denied) return denied;


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

    // Check if rerolls remain
    if (run.rerollsUsed >= run.rerollsTotal) {
      return NextResponse.json(
        { error: 'No rerolls remaining' },
        { status: 400 },
      );
    }

    // Get open slots
    const openSlots = run.slots.filter((s) => !s.playerSeasonId);
    if (openSlots.length === 0) {
      return NextResponse.json(
        { error: 'No open slots remaining' },
        { status: 400 },
      );
    }

    let openPositions = openSlots.map((s) => s.slotPosition.split('_')[0]);
    let targetSlotPosition: string | undefined;
    if (multiplayerSeat && run.draftMode === 'position_first') {
      const body = await request.json().catch(() => ({}));
      const target = openSlots.find(slot => slot.slotPosition === body.targetSlotPosition);
      if (!target) return NextResponse.json({ error: 'Сначала выбери свободную позицию' }, { status: 400 });
      openPositions = [target.slotPosition.split('_')[0]];
      targetSlotPosition = target.slotPosition;
    }

    const selection = await selectDraftPlayers(run, openPositions);
    if (!selection) return NextResponse.json(
      { error: 'Нет подходящих составов для свободных позиций и выбранных фильтров' }, { status: 400 },
    );
    const result = {
      ...selection,
      ...(targetSlotPosition ? { targetSlotPosition } : {}),
      rerollsUsed: run.rerollsUsed + 1,
      rerollsTotal: run.rerollsTotal,
    };
    // Claim the exact pending spin and spend the reroll together. A concurrent
    // pick/timeout must not consume a reroll or overwrite the next player's spin.
    await db.$transaction(async tx => {
      const spent = await tx.gameRun.updateMany({ where: { id: runId, completed: false, rerollsUsed: run.rerollsUsed },
        data: { rerollsUsed: { increment: 1 } } });
      if (!spent.count) throw new DraftConflict('Повтори переброс');
      if (multiplayerSeat) {
        const saved = await tx.multiplayerSeat.updateMany({ where: {
          id: multiplayerSeat.id, pendingSpinJson: multiplayerSeat.pendingSpinJson, ready: false,
          pickDeadline: { gt: new Date() }, room: { status: 'drafting' },
        }, data: { pendingSpinJson: JSON.stringify(result) } });
        if (!saved.count) throw new DraftConflict('Драфт изменился. Обнови состав');
      }
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DraftConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error('Failed to reroll:', error);
    return NextResponse.json(
      { error: 'Failed to reroll' },
      { status: 500 },
    );
  }
}
