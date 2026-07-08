import { db } from '@/lib/db';
import { FORMATIONS } from '@/lib/positions';
import { NextResponse } from 'next/server';

/**
 * GET /api/runs/active?userId=xxx
 * Fetch the user's latest in-progress (not completed) game run with slots.
 * Used for cross-device sync: when a user logs in from a new device,
 * they can resume their current draft.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const telegramId = searchParams.get('telegramId');

    let userFilter: { userId: string } | { user: { telegramId: string } };

    if (userId) {
      userFilter = { userId };
    } else if (telegramId) {
      userFilter = { user: { telegramId: String(telegramId) } };
    } else {
      return NextResponse.json(
        { error: 'userId or telegramId query parameter is required' },
        { status: 400 },
      );
    }

    // Find the latest in-progress run for this user
    const run = await db.gameRun.findFirst({
      where: {
        completed: false,
        ...userFilter,
      },
      include: {
        slots: { orderBy: { slotPosition: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!run) {
      return NextResponse.json({ activeRun: null });
    }

    // Build the response in a format the frontend can use
    const formation = FORMATIONS.find((f) => f.id === run.formation);

    const slots = run.slots.map((slot, index) => {
      const slotPos = slot.slotPosition.split('_')[0];
      const formationSlot = formation?.slots[index];

      return {
        slotPosition: slot.slotPosition,
        position: slotPos,
        positionLabel: formationSlot?.label ?? slotPos,
        playerId: slot.playerSeasonId ?? undefined,
        playerName: slot.playerName ?? undefined,
        playerLastName: slot.playerLastName ?? undefined,
        playerRating: slot.playerRating ?? undefined,
        playerPosition: slot.playerPosition ?? undefined,
        playerOtherPositions: slot.playerOtherPositions
          ? slot.playerOtherPositions.split(',').map((p) => p.trim())
          : undefined,
        playerNationality: slot.playerNationality ?? undefined,
        isCompatible: slot.isCompatible ?? true,
      };
    });

    return NextResponse.json({
      activeRun: {
        id: run.id,
        formation: run.formation,
        difficulty: run.difficulty,
        draftMode: run.draftMode,
        ratingMode: run.ratingMode,
        eraFilter: run.eraFilter,
        eraStartYear: run.eraStartYear,
        eraEndYear: run.eraEndYear,
        clubFilter: run.clubFilter,
        rerollsTotal: run.rerollsTotal,
        rerollsUsed: run.rerollsUsed,
        teamName: run.teamName,
        slots,
        createdAt: run.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to fetch active run:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active run' },
      { status: 500 },
    );
  }
}
