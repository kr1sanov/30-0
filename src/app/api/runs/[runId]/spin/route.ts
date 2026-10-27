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
    const limited = enforceRateLimit(request, 'runs:spin', { limit: 60, windowMs: 60_000 });
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
      if (room?.status !== 'drafting' || multiplayerSeat.isBot || !multiplayerSeat.pickDeadline || multiplayerSeat.pickDeadline < new Date()) {
        return NextResponse.json({ error: 'Время выбора истекло или драфт закрыт' }, { status: 409 });
      }
      if (multiplayerSeat.pendingSpinJson) return NextResponse.json(JSON.parse(multiplayerSeat.pendingSpinJson));
    }

    if (run.completed) {
      return NextResponse.json(
        { error: 'Run is already completed' },
        { status: 400 },
      );
    }

    // Get open slots (where playerSeasonId is null)
    const openSlots = run.slots.filter((s) => !s.playerSeasonId);
    if (openSlots.length === 0) {
      return NextResponse.json(
        { error: 'No open slots remaining' },
        { status: 400 },
      );
    }

    // Extract the position codes from open slot positions
    // slotPosition format is "POSITION_INDEX" e.g. "ВР_0", "ЦЗ_1"
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
    };
    if (multiplayerSeat) {
      const saved = await db.multiplayerSeat.updateMany({ where: { id: multiplayerSeat.id, pendingSpinJson: null, ready: false, pickDeadline: { gt: new Date() }, room: { status: 'drafting' } },
        data: { pendingSpinJson: JSON.stringify(result) } });
      if (!saved.count) {
        const current = await db.multiplayerSeat.findUnique({ where: { id: multiplayerSeat.id } });
        if (current?.pendingSpinJson) return NextResponse.json(JSON.parse(current.pendingSpinJson));
        return NextResponse.json({ error: 'Драфт уже завершён' }, { status: 409 });
      }
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DraftConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error('Failed to spin wheel:', error);
    return NextResponse.json(
      { error: 'Failed to spin wheel' },
      { status: 500 },
    );
  }
}
