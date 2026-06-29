import { db } from '@/lib/db';
import { simulateSeason, type SquadSlot } from '@/lib/simulation';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;

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

    // Get all filled slots
    const filledSlots = run.slots.filter((s) => s.playerSeasonId);
    if (filledSlots.length < 11) {
      return NextResponse.json(
        { error: 'All 11 slots must be filled before simulation' },
        { status: 400 },
      );
    }

    // Build squad slots for simulation
    const squadSlots: SquadSlot[] = filledSlots.map((slot) => ({
      position: slot.slotPosition.split('_')[0], // Extract position from "POSITION_INDEX"
      playerName: slot.playerName || 'Unknown',
      playerRating: slot.playerRating || 0,
      isCompatible: slot.isCompatible,
    }));

    // Run the simulation
    const result = simulateSeason(squadSlots, run.managerRating ?? undefined);

    // Update the game run with results
    await db.gameRun.update({
      where: { id: runId },
      data: {
        completed: true,
        wins: result.wins,
        draws: result.draws,
        losses: result.losses,
        points: result.points,
        position: result.position,
        goalsFor: result.goalsFor,
        goalsAgainst: result.goalsAgainst,
        overallRating: Math.round(
          (result.wins * 3 + result.draws) / 30 * 100,
        ),
      },
    });

    // Return full season result including table
    return NextResponse.json({
      ...result,
      runId,
      formation: run.formation,
      difficulty: run.difficulty,
    });
  } catch (error) {
    console.error('Failed to simulate season:', error);
    return NextResponse.json(
      { error: 'Failed to simulate season' },
      { status: 500 },
    );
  }
}
