import { db } from '@/lib/db';
import { filterCompatibleClubSeasons, spinWheel } from '@/lib/wheel';
import { getClubSeasonOptions } from '@/lib/clubAvailability';
import { enforceRateLimit } from '@/lib/rateLimit';
import { authorizeRun } from '@/lib/runAccess';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const limited = enforceRateLimit(request, 'runs:spin', { limit: 60, windowMs: 60_000 });
    if (limited) return limited;
    const denied = authorizeRun(request, runId);
    if (denied) return denied;


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
    }

    if (run.completed) {
      return NextResponse.json(
        { error: 'Run is already completed' },
        { status: 400 },
      );
    }

    // Get open slots (where playerSeasonId is null)
    const openSlots = run.slots.filter((s) => !s.playerSeasonId);
    if (openSlots.length === 0) {
      return NextResponse.json(
        { error: 'No open slots remaining' },
        { status: 400 },
      );
    }

    // Extract the position codes from open slot positions
    // slotPosition format is "POSITION_INDEX" e.g. "ВР_0", "ЦЗ_1"
    let openPositions = openSlots.map((s) => s.slotPosition.split('_')[0]);
    if (multiplayerSeat && run.draftMode === 'position_first') {
      const body = await request.json().catch(() => ({}));
      const target = openSlots.find(slot => slot.slotPosition === body.targetSlotPosition);
      if (!target) return NextResponse.json({ error: 'Сначала выберите свободную позицию' }, { status: 400 });
      openPositions = [target.slotPosition.split('_')[0]];
    }

    // Identify people by stable player ID; names can legitimately coincide.
    const draftedSlots = run.slots.filter((s) => s.playerSeasonId);
    const draftedPlayerSeasonIds = new Set(
      draftedSlots.map((s) => s.playerSeasonId).filter(Boolean) as string[],
    );
    const draftedPlayerIds = new Set((await db.playerSeason.findMany({
      where: { id: { in: [...draftedPlayerSeasonIds] } }, select: { playerId: true },
    })).map((ps) => ps.playerId));

    const startYear = run.eraStartYear ?? 2010;
    const endYear = run.eraEndYear ?? 2021;

    // Build the where clause for ClubSeasons
    // If clubFilter is set (single_club mode), only return club-seasons for that club
    const clubSeasonWhere: Record<string, unknown> = {
      season: {
        startYear: { gte: startYear, lte: endYear },
      },
    };

    if (run.clubFilter) {
      clubSeasonWhere.clubId = run.clubFilter;
    }

    // Get all ClubSeasons with their players for the given era
    const clubSeasons = await db.clubSeason.findMany({
      where: clubSeasonWhere,
      include: {
        club: true,
        season: true,
        players: {
          include: {
            player: true,
          },
        },
      },
    });

    let clubSeasonOptions = getClubSeasonOptions(
      clubSeasons, openPositions, draftedPlayerIds, draftedPlayerSeasonIds, run.nationalityFilter,
    );
    let compatible = filterCompatibleClubSeasons(openPositions, clubSeasonOptions);

    // A selected club can have no fresh candidates inside a narrow era after
    // several picks. Keep the run playable by widening only that club to its
    // full recorded history. The returned season label makes the chosen era clear.
    if (compatible.length === 0 && run.clubFilter) {
      const historicalClubSeasons = await db.clubSeason.findMany({
        where: { clubId: run.clubFilter },
        include: { club: true, season: true, players: { include: { player: true } } },
      });
      clubSeasonOptions = getClubSeasonOptions(
        historicalClubSeasons, openPositions, draftedPlayerIds, draftedPlayerSeasonIds, run.nationalityFilter,
      );
      compatible = filterCompatibleClubSeasons(openPositions, clubSeasonOptions);
    }

    if (compatible.length === 0) {
      // Check if database is empty — give a more helpful error
      const totalClubs = await db.club.count();
      if (totalClubs === 0) {
        return NextResponse.json(
          { error: 'База данных пуста. Запустите сид: POST /api/seed', needsSeed: true },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: 'No compatible club-seasons available for the selected era/filters' },
        { status: 400 },
      );
    }

    // Spin the wheel
    const selected = spinWheel(compatible);

    // Get the full player data for the selected club-season
    const selectedClubSeason = await db.clubSeason.findUnique({
      where: { id: selected.clubSeasonId },
      include: {
        club: true,
        season: true,
        players: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!selectedClubSeason) {
      return NextResponse.json(
        { error: 'Selected club-season not found' },
        { status: 500 },
      );
    }

    // Filter players - exclude already drafted, unique person rule, and nationality filter
    const eligiblePlayers = selectedClubSeason.players.filter((ps) => {
      if (draftedPlayerSeasonIds.has(ps.id)) return false;
      if (draftedPlayerIds.has(ps.playerId)) return false;
      // In nations_cup mode, only include players of the selected nationality
      if (run.nationalityFilter && (ps.nationality ?? ps.player.nationality) !== run.nationalityFilter) return false;
      return true;
    });

    // Build player options — include primeRating and primeSeason for prime mode
    const players = eligiblePlayers.map((ps) => ({
      playerSeasonId: ps.id,
      fullName: ps.player.alias || ps.player.fullName,
      lastName: ps.player.alias || ps.player.lastName,
      rating: run.difficulty === 'hard' ? 0 : ps.rating,
      primeRating: ps.primeRating || ps.rating,
      primeSeason: ps.primeSeason || selectedClubSeason.season.label,
      mainPosition: ps.mainPosition,
      otherPositions: ps.otherPositions ? ps.otherPositions.split(',').map((p) => p.trim()) : [],
      nationality: ps.nationality ?? ps.player.nationality,
    }));

    return NextResponse.json({
      clubSeasonId: selectedClubSeason.id,
      clubName: selectedClubSeason.club.nameRu,
      seasonLabel: selectedClubSeason.season.label,
      players,
    });
  } catch (error) {
    console.error('Failed to spin wheel:', error);
    return NextResponse.json(
      { error: 'Failed to spin wheel' },
      { status: 500 },
    );
  }
}
