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
    const limited = enforceRateLimit(request, 'runs:undo', { limit: 60, windowMs: 60_000 });
    if (limited) return limited;
    const denied = authorizeRun(request, runId);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const { slotPosition: targetSlotPosition } = body;

    // Get the run with slots
    const run = await db.gameRun.findUnique({
      where: { id: runId },
      include: { slots: { orderBy: { slotPosition: 'asc' } } },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    if (run.completed) {
      return NextResponse.json(
        { error: 'Run is already completed' },
        { status: 400 },
      );
    }

    // Find filled slots
    const filledSlots = run.slots.filter((s) => s.playerSeasonId);
    if (filledSlots.length === 0) {
      return NextResponse.json(
        { error: 'No drafted players to undo' },
        { status: 400 },
      );
    }

    let targetSlot;
    if (targetSlotPosition) {
      // Undo the specific slot the client requested
      targetSlot = filledSlots.find((s) => s.slotPosition === targetSlotPosition);
      if (!targetSlot) {
        return NextResponse.json({ error: 'Slot not found or not filled' }, { status: 400 });
      }
    } else {
      // Fallback: last filled slot by position order (old behavior)
      targetSlot = filledSlots[filledSlots.length - 1];
    }

    if (run.gameMode === 'challenge_vagner' || run.gameMode === 'challenge_dzyuba') {
      const featuredNames = run.gameMode === 'challenge_vagner'
        ? ['Vagner Love', 'Вагнер Лав'] : ['Artem Dzyuba', 'Артём Дзюба', 'Артем Дзюба'];
      const featured = await db.playerSeason.findFirst({
        where: { player: { fullName: { in: featuredNames } } },
        orderBy: [{ rating: 'desc' }, { id: 'asc' }], select: { id: true },
      });
      if (targetSlot.playerSeasonId === featured?.id) return NextResponse.json({ error: 'Стартовая карточка челленджа закреплена' }, { status: 400 });
    }

    // Remove the player from that slot — clear ALL player fields
    await db.gameSlot.update({
      where: { id: targetSlot.id },
      data: {
        playerSeasonId: null,
        playerName: null,
        playerLastName: null,
        playerRating: null,
        playerPrimeRating: null,
        playerPosition: null,
        playerOtherPositions: null,
        playerNationality: null,
        isCompatible: true,
      },
    });

    // Return updated run with slots
    const updatedRun = await db.gameRun.findUnique({
      where: { id: runId },
      include: { slots: { orderBy: { slotPosition: 'asc' } } },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error('Failed to undo pick:', error);
    return NextResponse.json(
      { error: 'Failed to undo pick' },
      { status: 500 },
    );
  }
}
