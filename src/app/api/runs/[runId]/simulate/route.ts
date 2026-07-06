import { db } from '@/lib/db';
import { simulateSeason, calculateSquadStrength, type SquadSlot } from '@/lib/simulation';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const body = await request.json().catch(() => ({}));
    const managerName = (body as { managerName?: string }).managerName;
    const managerRating = (body as { managerRating?: number }).managerRating;
    const januaryTransfer = (body as { januaryTransfer?: boolean }).januaryTransfer ?? false;

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

    // Get previous best points for personal best trophy
    // We'll get this from user's profile if available
    let previousBestPoints = 0;
    if (run.userId) {
      const user = await db.user.findUnique({
        where: { id: run.userId },
      });
      if (user?.profileStatsJson) {
        try {
          const stats = JSON.parse(user.profileStatsJson as string) as { bestPoints?: number };
          previousBestPoints = stats.bestPoints ?? 0;
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Run the improved simulation
    const result = simulateSeason(
      squadSlots,
      managerRating ?? undefined,
      januaryTransfer,
      previousBestPoints,
    );

    // Calculate squad strength for overall rating
    const strength = calculateSquadStrength(squadSlots, managerRating ?? undefined);

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

    // Return full season result including table, matches, trophies and squad
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
