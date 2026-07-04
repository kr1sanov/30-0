import { db } from '@/lib/db';
import { canFillSlotStrict } from '@/lib/positions';
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

    // Save original data for swapping — include ALL fields
    const fromData = {
      playerSeasonId: fromSlot.playerSeasonId,
      playerName: fromSlot.playerName,
      playerLastName: fromSlot.playerLastName,
      playerRating: fromSlot.playerRating,
      playerPosition: fromSlot.playerPosition,
      playerOtherPositions: fromSlot.playerOtherPositions,
      playerNationality: fromSlot.playerNationality,
    };

    const toData = {
      playerSeasonId: toSlot.playerSeasonId,
      playerName: toSlot.playerName,
      playerLastName: toSlot.playerLastName,
      playerRating: toSlot.playerRating,
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

    // Swap in database — update fromSlot with toSlot's data (ALL fields)
    await db.gameSlot.update({
      where: { id: fromSlot.id },
      data: {
        playerSeasonId: toData.playerSeasonId,
        playerName: toData.playerName,
        playerLastName: toData.playerLastName,
        playerRating: toData.playerRating,
        playerPosition: toData.playerPosition,
        playerOtherPositions: toData.playerOtherPositions,
        playerNationality: toData.playerNationality,
        isCompatible: true, // Strict matching — always full compatibility
      },
    });

    // Update toSlot with fromSlot's data (ALL fields)
    await db.gameSlot.update({
      where: { id: toSlot.id },
      data: {
        playerSeasonId: fromData.playerSeasonId,
        playerName: fromData.playerName,
        playerLastName: fromData.playerLastName,
        playerRating: fromData.playerRating,
        playerPosition: fromData.playerPosition,
        playerOtherPositions: fromData.playerOtherPositions,
        playerNationality: fromData.playerNationality,
        isCompatible: true, // Strict matching — always full compatibility
      },
    });

    // Return the updated run
    const updatedRun = await db.gameRun.findUnique({
      where: { id: runId },
      include: { slots: { orderBy: { slotPosition: 'asc' } } },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error('Failed to swap slots:', error);
    return NextResponse.json(
      { error: 'Failed to swap slots' },
      { status: 500 },
    );
  }
}
