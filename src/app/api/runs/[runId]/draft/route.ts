import { DraftConflict } from '@/lib/draftSelection';
import { getRosterPositions } from '@/lib/rosterPositions';
import { db } from '@/lib/db';
import { canFillSlotStrict } from '@/lib/positions';
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
    const denied = await authorizeRun(request, runId);
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
      include: { player: true, clubSeason: { include: { season: true, club: true } } },
    });

    if (!playerSeason) {
      return NextResponse.json(
        { error: 'Player season not found' },
        { status: 404 },
      );
    }

    const year = playerSeason.clubSeason.season.startYear;
    if (playerSeason.player.mergedIntoId ||
      (run.clubFilter ? playerSeason.clubSeason.clubId !== run.clubFilter : year < run.eraStartYear || year > run.eraEndYear) ||
      (run.nationalityFilter && (playerSeason.nationality ?? playerSeason.player.nationality) !== run.nationalityFilter)) {
      return NextResponse.json({ error: 'Игрок не соответствует условиям этого драфта' }, { status: 400 });
    }

    // Use the same advertised roles as the wheel, card and pitch.
    const slotPos = slotPosition.split('_')[0];
    const otherPositions = getRosterPositions(playerSeason, playerSeason.clubSeason.club.nameRu, playerSeason.clubSeason.season.startYear)
      .filter(pos => pos !== playerSeason.mainPosition);

    const canFill = canFillSlotStrict(
      playerSeason.mainPosition as Parameters<typeof canFillSlotStrict>[0],
      otherPositions as Parameters<typeof canFillSlotStrict>[1],
      slotPos as Parameters<typeof canFillSlotStrict>[2],
    );

    if (!canFill) {
      return NextResponse.json(
        { error: 'Player cannot fill this position' },
        { status: 400 },
      );
    }

    const isCompatible = true;

    // Update the game slot with player info — including otherPositions, nationality and primeRating
    await db.$transaction(async (tx) => {
      // Serialize picks on the run before checking uniqueness. Two requests for
      // different slots must not draft the same person from different seasons.
      const locked = await tx.gameRun.updateMany({ where: { id: runId, completed: false }, data: { rerollsUsed: { increment: 0 } } });
      if (!locked.count) throw new DraftConflict('Драфт уже завершён');
      const occupied = await tx.gameSlot.findMany({ where: { runId, playerSeasonId: { not: null } }, select: { playerSeasonId: true } });
      const duplicate = occupied.length && await tx.playerSeason.findFirst({
        where: { id: { in: occupied.map(slot => slot.playerSeasonId!) }, playerId: playerSeason.playerId }, select: { id: true },
      });
      if (duplicate) throw new DraftConflict('Этот игрок уже выбран');
      if (multiplayerSeat) {
        const claimed = await tx.multiplayerSeat.updateMany({ where: { id: multiplayerSeat.id,
          pendingSpinJson: multiplayerSeat.pendingSpinJson, ready: false, pickDeadline: { gt: new Date() }, room: { status: 'drafting' } }, data: { pendingSpinJson: null } });
        if (!claimed.count) throw new DraftConflict('Результат прокрута уже использован');
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
        playerOtherPositions: otherPositions.join(',') || null,
        playerNationality: playerSeason.nationality ?? playerSeason.player.nationality ?? null,
        isCompatible,
        },
      });
      if (!placed.count) throw new DraftConflict('Позиция уже занята');
    });

    // Return updated run with slots
    const updatedRun = await db.gameRun.findUnique({
      where: { id: runId },
      include: { slots: { orderBy: { slotPosition: 'asc' } } },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    if (error instanceof DraftConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error('Failed to draft player:', error);
    return NextResponse.json(
      { error: 'Failed to draft player' },
      { status: 500 },
    );
  }
}
