import { db } from '@/lib/db';
import { canFillSlot } from '@/lib/positions';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const body = await request.json();
    const { playerSeasonId, slotPosition } = body;

    if (!playerSeasonId || !slotPosition) {
      return NextResponse.json(
        { error: 'playerSeasonId and slotPosition are required' },
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

    if (run.completed) {
      return NextResponse.json(
        { error: 'Run is already completed' },
        { status: 400 },
      );
    }

    // Find the target slot
    const slot = run.slots.find((s) => s.slotPosition === slotPosition);
    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    if (slot.playerSeasonId) {
      return NextResponse.json(
        { error: 'Slot is already filled' },
        { status: 400 },
      );
    }

    // Get the player season data
    const playerSeason = await db.playerSeason.findUnique({
      where: { id: playerSeasonId },
      include: { player: true },
    });

    if (!playerSeason) {
      return NextResponse.json(
        { error: 'Player season not found' },
        { status: 404 },
      );
    }

    // Check unique person rule - can't draft same person twice
    const draftedSlots = run.slots.filter((s) => s.playerSeasonId);
    const alreadyDraftedName = draftedSlots.find(
      (s) => s.playerName === playerSeason.player.fullName,
    );
    if (alreadyDraftedName) {
      return NextResponse.json(
        { error: 'This player has already been drafted (unique person rule)' },
        { status: 400 },
      );
    }

    // Check if this specific playerSeason is already drafted
    const alreadyDraftedSeason = draftedSlots.find(
      (s) => s.playerSeasonId === playerSeasonId,
    );
    if (alreadyDraftedSeason) {
      return NextResponse.json(
        { error: 'This player season has already been drafted' },
        { status: 400 },
      );
    }

    // Check position compatibility
    // Extract the position from slotPosition (format: "POSITION_INDEX")
    const slotPos = slotPosition.split('_')[0];
    const otherPositions = playerSeason.otherPositions
      ? playerSeason.otherPositions.split(',').map((p) => p.trim())
      : [];

    const { canFill, penalty } = canFillSlot(
      playerSeason.mainPosition as Parameters<typeof canFillSlot>[0],
      otherPositions as Parameters<typeof canFillSlot>[1],
      slotPos as Parameters<typeof canFillSlot>[2],
    );

    if (!canFill) {
      return NextResponse.json(
        { error: 'Player cannot fill this position' },
        { status: 400 },
      );
    }

    // Update the game slot with player info
    const isCompatible = penalty === 1; // full compatibility = true, partial = false

    await db.gameSlot.update({
      where: { id: slot.id },
      data: {
        playerSeasonId,
        playerName: playerSeason.player.fullName,
        playerLastName: playerSeason.player.lastName,
        playerRating: playerSeason.rating,
        playerPosition: playerSeason.mainPosition,
        isCompatible,
      },
    });

    // Return updated run with slots
    const updatedRun = await db.gameRun.findUnique({
      where: { id: runId },
      include: { slots: { orderBy: { slotPosition: 'asc' } } },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error('Failed to draft player:', error);
    return NextResponse.json(
      { error: 'Failed to draft player' },
      { status: 500 },
    );
  }
}
