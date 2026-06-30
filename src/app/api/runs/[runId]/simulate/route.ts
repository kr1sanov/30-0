import { db } from '@/lib/db';
import { simulateSeason, type SquadSlot } from '@/lib/simulation';
import { NextResponse } from 'next/server';
import { calculateSquadStrength } from '@/lib/simulation';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const body = await request.json().catch(() => ({}));
    const managerName = (body as { managerName?: string }).managerName;
    const managerRating = (body as { managerRating?: number }).managerRating;

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
      position: slot.slotPosition.split('_')[0],
      playerName: slot.playerName || 'Unknown',
      playerRating: slot.playerRating || 0,
      isCompatible: slot.isCompatible,
    }));

    // Run the simulation
    const result = simulateSeason(squadSlots, managerRating);

    // Calculate squad strength for overall rating
    const strength = calculateSquadStrength(squadSlots, managerRating);

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
        overallRating: Math.round(strength.overall),
        managerName: managerName || null,
        managerRating: managerRating || null,
      },
    });

    // Build player list for result
    const players = filledSlots.map((slot) => ({
      name: slot.playerName || 'Unknown',
      position: slot.slotPosition.split('_')[0],
      rating: slot.playerRating || 0,
      isCompatible: slot.isCompatible,
    }));

    // Return full season result including table, matches and squad
    return NextResponse.json({
      ...result,
      runId,
      formation: run.formation,
      difficulty: run.difficulty,
      managerName: managerName || null,
      managerRating: managerRating || null,
      squadRating: Math.round(strength.overall),
      squadStrength: strength,
      players,
    });
  } catch (error) {
    console.error('Failed to simulate season:', error);
    return NextResponse.json(
      { error: 'Failed to simulate season' },
      { status: 500 },
    );
  }
}
