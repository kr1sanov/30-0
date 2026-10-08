import { db } from '@/lib/db';
import { canFillSlot } from '@/lib/positions';
import { enforceRateLimit } from '@/lib/rateLimit';
import { authorizeRun } from '@/lib/runAccess';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const limited = enforceRateLimit(request, 'runs:draft', { limit: 120, windowMs: 60_000 });
    if (limited) return limited;
    const denied = authorizeRun(request, runId);
    if (denied) return denied;

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

    const multiplayerSeat = await db.multiplayerSeat.findUnique({ where: { runId } });
    if (multiplayerSeat) {
      const room = await db.multiplayerRoom.findUnique({ where: { code: multiplayerSeat.roomCode } });
      if (room?.status !== 'drafting' || multiplayerSeat.isBot || !multiplayerSeat.pickDeadline || multiplayerSeat.pickDeadline < new Date()) {
        return NextResponse.json({ error: 'Время выбора истекло или драфт закрыт' }, { status: 409 });
      }
      const pending = multiplayerSeat.pendingSpinJson ? JSON.parse(multiplayerSeat.pendingSpinJson) : null;
      if (!pending?.players?.some((player: { playerSeasonId: string }) => player.playerSeasonId === playerSeasonId)) {
        return NextResponse.json({ error: 'Сначала прокрути колесо и выбери игрока из этой команды' }, { status: 409 });
      }
      if (run.draftMode === 'position_first' && pending.targetSlotPosition !== slotPosition) {
        return NextResponse.json({ error: 'Выбери исходную позицию для этого прокрута' }, { status: 409 });
      }
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
      include: { player: true, clubSeason: { include: { season: true } } },
    });

    if (!playerSeason) {
      return NextResponse.json(
        { error: 'Player season not found' },
        { status: 404 },
      );
    }

    // Check unique person rule by ID. Distinct people may share a name.
    const draftedSlots = run.slots.filter((s) => s.playerSeasonId);
    const draftedPlayerSeasons = await db.playerSeason.findMany({
      where: { id: { in: draftedSlots.map((s) => s.playerSeasonId!).filter(Boolean) } },
      select: { playerId: true },
    });
    if (draftedPlayerSeasons.some((s) => s.playerId === playerSeason.playerId)) {
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

    // Check position compatibility using the compatibility matrix
    // Players can fill slots based on their positions + matrix rules
    // 'full' = no penalty, 'partial' = 0.8x rating penalty
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

    const isCompatible = penalty === 1; // full = compatible, partial = not fully compatible

    // Update the game slot with player info — including otherPositions, nationality and primeRating
    await db.$transaction(async (tx) => {
      if (multiplayerSeat) {
        const claimed = await tx.multiplayerSeat.updateMany({ where: { id: multiplayerSeat.id,
          pendingSpinJson: multiplayerSeat.pendingSpinJson, ready: false }, data: { pendingSpinJson: null } });
        if (!claimed.count) throw new Error('Результат прокрута уже использован');
      }
      const placed = await tx.gameSlot.updateMany({
        where: { id: slot.id, playerSeasonId: null }, data: {
        playerSeasonId,
        playerSeasonYear: playerSeason.clubSeason.season.startYear,
        playerName: playerSeason.player.alias || playerSeason.player.fullName,
        playerLastName: playerSeason.player.alias || playerSeason.player.lastName,
        playerRating: playerSeason.rating,
        playerPrimeRating: playerSeason.primeRating || playerSeason.rating,
        playerPosition: playerSeason.mainPosition,
        playerOtherPositions: playerSeason.otherPositions ?? null,
        playerNationality: playerSeason.nationality ?? playerSeason.player.nationality ?? null,
        isCompatible,
        },
      });
      if (!placed.count) throw new Error('Позиция уже занята');
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
