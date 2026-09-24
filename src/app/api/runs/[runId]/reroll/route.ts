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
    const limited = enforceRateLimit(request, 'runs:reroll', { limit: 30, windowMs: 60_000 });
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

    if (run.completed) {
      return NextResponse.json(
        { error: 'Run is already completed' },
        { status: 400 },
      );
    }

    // Check if rerolls remain
    if (run.rerollsUsed >= run.rerollsTotal) {
      return NextResponse.json(
        { error: 'No rerolls remaining' },
        { status: 400 },
      );
    }

    // Increment rerollsUsed
    await db.gameRun.update({
      where: { id: runId },
      data: { rerollsUsed: run.rerollsUsed + 1 },
    });

    // Get open slots
    const openSlots = run.slots.filter((s) => !s.playerSeasonId);
    if (openSlots.length === 0) {
      return NextResponse.json(
        { error: 'No open slots remaining' },
        { status: 400 },
      );
    }

    const openPositions = openSlots.map((s) => s.slotPosition.split('_')[0]);

    // Get already drafted player names (unique person rule)
    const draftedSlots = run.slots.filter((s) => s.playerSeasonId);
    const draftedPlayerNames = new Set(
      draftedSlots.map((s) => s.playerName).filter(Boolean) as string[],
    );
    const draftedPlayerSeasonIds = new Set(
      draftedSlots.map((s) => s.playerSeasonId).filter(Boolean) as string[],
    );

    // Determine era range from run config
    const startYear = run.eraStartYear ?? 2000;
    const endYear = run.eraEndYear ?? 2026;

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
      clubSeasons, openPositions, draftedPlayerNames, draftedPlayerSeasonIds, run.nationalityFilter,
    );
    let compatible = filterCompatibleClubSeasons(openPositions, clubSeasonOptions);

    if (compatible.length === 0 && run.clubFilter) {
      const historicalClubSeasons = await db.clubSeason.findMany({
        where: { clubId: run.clubFilter },
        include: { club: true, season: true, players: { include: { player: true } } },
      });
      clubSeasonOptions = getClubSeasonOptions(
        historicalClubSeasons, openPositions, draftedPlayerNames, draftedPlayerSeasonIds, run.nationalityFilter,
      );
      compatible = filterCompatibleClubSeasons(openPositions, clubSeasonOptions);
    }

    if (compatible.length === 0) {
      return NextResponse.json(
        { error: 'No compatible club-seasons available' },
        { status: 400 },
      );
    }

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

    const eligiblePlayers = selectedClubSeason.players.filter((ps) => {
      if (draftedPlayerSeasonIds.has(ps.id)) return false;
      if (draftedPlayerNames.has(ps.player.fullName)) return false;
      // In nations_cup mode, only include players of the selected nationality
      if (run.nationalityFilter && ps.player.nationality !== run.nationalityFilter) return false;
      return true;
    });

    const players = eligiblePlayers.map((ps) => ({
      playerSeasonId: ps.id,
      fullName: ps.player.fullName,
      lastName: ps.player.lastName,
      rating: run.difficulty === 'hard' ? 0 : ps.rating,
      primeRating: ps.primeRating || ps.rating,
      primeSeason: ps.primeSeason || selectedClubSeason.season.label,
      mainPosition: ps.mainPosition,
      otherPositions: ps.otherPositions ? ps.otherPositions.split(',').map((p) => p.trim()) : [],
      nationality: ps.player.nationality,
    }));

    return NextResponse.json({
      clubSeasonId: selectedClubSeason.id,
      clubName: selectedClubSeason.club.nameRu,
      seasonLabel: selectedClubSeason.season.label,
      players,
      rerollsUsed: run.rerollsUsed + 1,
      rerollsTotal: run.rerollsTotal,
    });
  } catch (error) {
    console.error('Failed to reroll:', error);
    return NextResponse.json(
      { error: 'Failed to reroll' },
      { status: 500 },
    );
  }
}
