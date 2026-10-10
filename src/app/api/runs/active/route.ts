import { db } from '@/lib/db';
import { FORMATIONS } from '@/lib/positions';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { sessionUser } from '@/lib/telegramSession';

/**
 * GET /api/runs/active?userId=xxx
 * Fetch the user's latest in-progress (not completed) game run with slots.
 * Used for cross-device sync: when a user logs in from a new device,
 * they can resume their current draft.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = sessionUser(request);
    if (!userId) return NextResponse.json({ error: 'Войди через Telegram' }, { status: 401 });
    const mode = request.nextUrl.searchParams.get('mode') ?? 'classic';
    const clubId = request.nextUrl.searchParams.get('clubId');
    const issueId = request.nextUrl.searchParams.get('issueId');
    if (!['classic', 'single_club', 'challenge_vagner', 'challenge_dzyuba'].includes(mode) || (mode === 'single_club' && !clubId))
      return NextResponse.json({ error: 'Выбери режим и клуб' }, { status: 400 });

    // Find the latest in-progress run for this user
    const run = await db.gameRun.findFirst({
      where: {
        completed: false,
        userId,
        multiplayerSeat: null,
        gameMode: mode,
        ...(mode.startsWith('challenge_') && issueId ? { challengeIssueId: issueId } : {}),
        clubFilter: mode === 'single_club' ? clubId : null,
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
    const club = run.clubFilter ? await db.club.findUnique({ where: { id: run.clubFilter }, select: { nameRu: true } }) : null;

    const slots = run.slots.map((slot) => {
      const slotPos = slot.slotPosition.split('_')[0];
      const formationIndex = Number(slot.slotPosition.slice(slot.slotPosition.lastIndexOf('_') + 1));
      const formationSlot = Number.isInteger(formationIndex) ? formation?.slots[formationIndex] : undefined;

      return {
        slotPosition: slot.slotPosition,
        position: slotPos,
        positionLabel: formationSlot?.label ?? slotPos,
        playerId: slot.playerSeasonId ?? undefined,
        playerName: slot.playerName ?? undefined,
        playerLastName: slot.playerLastName ?? undefined,
        playerRating: slot.playerRating ?? undefined,
        playerPrimeRating: slot.playerPrimeRating ?? undefined,
        playerSeasonYear: slot.playerSeasonYear ?? undefined,
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
        gameMode: run.gameMode,
        challengeIssueId: run.challengeIssueId,
        formation: run.formation,
        difficulty: run.difficulty,
        draftMode: run.draftMode,
        ratingMode: run.ratingMode,
        eraFilter: run.eraFilter,
        eraStartYear: run.eraStartYear,
        eraEndYear: run.eraEndYear,
        clubFilter: run.clubFilter,
        clubName: club?.nameRu ?? null,
        rerollsTotal: run.rerollsTotal,
        rerollsUsed: run.rerollsUsed,
        teamName: run.teamName,
        nationalityFilter: run.nationalityFilter,
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
