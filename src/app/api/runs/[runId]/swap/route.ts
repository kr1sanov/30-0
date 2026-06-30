import { db } from '@/lib/db';
import { canFillSlot } from '@/lib/positions';
import type { Position } from '@/lib/positions';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
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

    // Save original data for swapping
    const fromData = {
      playerSeasonId: fromSlot.playerSeasonId,
      playerName: fromSlot.playerName,
      playerRating: fromSlot.playerRating,
      playerPosition: fromSlot.playerPosition,
    };

    const toData = {
      playerSeasonId: toSlot.playerSeasonId,
      playerName: toSlot.playerName,
      playerRating: toSlot.playerRating,
      playerPosition: toSlot.playerPosition,
    };

    // Calculate compatibility after swap
    const fromPos = fromSlotPosition.split('_')[0] as Position;
    const toPos = toSlotPosition.split('_')[0] as Position;

    let fromIsCompatible = true;
    let toIsCompatible = true;

    // Check if the player moving TO fromSlot can play there
    if (toData.playerPosition) {
      const toPlayerOtherPositions = toSlot.playerPosition
        ? [] // We don't have otherPositions in GameSlot, but we check main position
        : [];
      const result = canFillSlot(
        toData.playerPosition as Position,
        toPlayerOtherPositions as Position[],
        fromPos,
      );
      fromIsCompatible = result.canFill;
    }

    // Check if the player moving TO toSlot can play there
    if (fromData.playerPosition) {
      const fromPlayerOtherPositions: Position[] = [];
      const result = canFillSlot(
        fromData.playerPosition as Position,
        fromPlayerOtherPositions,
        toPos,
      );
      toIsCompatible = result.canFill;
    }

    // Swap in database — update fromSlot with toSlot's data
    await db.gameSlot.update({
      where: { id: fromSlot.id },
      data: {
        playerSeasonId: toData.playerSeasonId,
        playerName: toData.playerName,
        playerRating: toData.playerRating,
        playerPosition: toData.playerPosition,
        isCompatible: fromIsCompatible,
      },
    });

    // Update toSlot with fromSlot's data
    await db.gameSlot.update({
      where: { id: toSlot.id },
      data: {
        playerSeasonId: fromData.playerSeasonId,
        playerName: fromData.playerName,
        playerRating: fromData.playerRating,
        playerPosition: fromData.playerPosition,
        isCompatible: toIsCompatible,
      },
    });

    // Return the updated slots
    const updatedRun = await db.gameRun.findUnique({
      where: { id: runId },
      include: { slots: { orderBy: { slotPosition: 'asc' } } },
    });

    return NextResponse.json({ slots: updatedRun?.slots });
  } catch (error) {
    console.error('Failed to swap slots:', error);
    return NextResponse.json(
      { error: 'Failed to swap slots' },
      { status: 500 },
    );
  }
}
