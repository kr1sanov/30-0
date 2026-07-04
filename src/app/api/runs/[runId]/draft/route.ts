import { db } from '@/lib/db';
import { canFillSlotStrict } from '@/lib/positions';
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

    // Check position compatibility — STRICT matching only
    // Player can only be placed on positions explicitly listed on their card
    const slotPos = slotPosition.split('_')[0];
    const otherPositions = playerSeason.otherPositions
      ? playerSeason.otherPositions.split(',').map((p) => p.trim())
      : [];

    const canFill = canFillSlotStrict(
      playerSeason.mainPosition as Parameters<typeof canFillSlotStrict>[0],
      otherPositions as Parameters<typeof canFillSlotStrict>[1],
      slotPos as Parameters<typeof canFillSlotStrict>[2],
    );

    if (!canFill) {
      return NextResponse.json(
        { error: 'Player cannot fill this position (strict matching)' },
        { status: 400 },
      );
    }

    // Update the game slot with player info — including otherPositions and nationality
    await db.gameSlot.update({
      where: { id: slot.id },
      data: {
        playerSeasonId,
        playerName: playerSeason.player.fullName,
        playerLastName: playerSeason.player.lastName,
        playerRating: playerSeason.rating,
        playerPosition: playerSeason.mainPosition,
        playerOtherPositions: playerSeason.otherPositions ?? null,
        playerNationality: playerSeason.player.nationality ?? null,
        isCompatible: true, // Strict matching — always full compatibility
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
