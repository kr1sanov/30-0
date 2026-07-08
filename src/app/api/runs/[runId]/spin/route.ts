import { db } from '@/lib/db';
import { canFillSlot } from '@/lib/positions';
import { filterCompatibleClubSeasons, spinWheel } from '@/lib/wheel';
import type { ClubSeasonWithPlayers } from '@/lib/wheel';
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
    const openPositions = openSlots.map((s) => s.slotPosition.split('_')[0]);

    // Get already drafted player names (unique person rule)
    const draftedSlots = run.slots.filter((s) => s.playerSeasonId);
    const draftedPlayerNames = new Set(
      draftedSlots.map((s) => s.playerName).filter(Boolean) as string[],
    );

    // Get already drafted playerSeasonIds
    const draftedPlayerSeasonIds = new Set(
      draftedSlots.map((s) => s.playerSeasonId).filter(Boolean) as string[],
    );

    const startYear = run.eraStartYear ?? 2000;
    const endYear = run.eraEndYear ?? 2025;

    // Get all ClubSeasons with their players for the given era
    const clubSeasons = await db.clubSeason.findMany({
      where: {
        season: {
          startYear: { gte: startYear, lte: endYear },
        },
      },
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

    // Build club-season options with available positions
    const clubSeasonOptions: ClubSeasonWithPlayers[] = [];

    for (const cs of clubSeasons) {
      // Get positions that this club-season's non-drafted players can cover
      const availablePositions = new Set<string>();

      for (const ps of cs.players) {
        // Skip already drafted player seasons
        if (draftedPlayerSeasonIds.has(ps.id)) continue;

        // Skip players with the same fullName as already drafted (unique person rule)
        if (draftedPlayerNames.has(ps.player.fullName)) continue;

        // Check main position compatibility with open slots
        for (const slotPos of openPositions) {
          const { canFill } = canFillSlot(
            ps.mainPosition as Parameters<typeof canFillSlot>[0],
            (ps.otherPositions ? ps.otherPositions.split(',') : []) as Parameters<typeof canFillSlot>[1],
            slotPos as Parameters<typeof canFillSlot>[2],
          );
          if (canFill) {
            availablePositions.add(ps.mainPosition);
            break;
          }
        }

        // Also check other positions
        if (ps.otherPositions) {
          const otherPositions = ps.otherPositions.split(',');
          for (const otherPos of otherPositions) {
            for (const slotPos of openPositions) {
              const { canFill } = canFillSlot(
                otherPos.trim() as Parameters<typeof canFillSlot>[0],
                [],
                slotPos as Parameters<typeof canFillSlot>[2],
              );
              if (canFill) {
                availablePositions.add(otherPos.trim());
                break;
              }
            }
          }
        }
      }

      if (availablePositions.size > 0) {
        clubSeasonOptions.push({
          clubSeasonId: cs.id,
          clubName: cs.club.nameRu,
          seasonLabel: cs.season.label,
          availablePositions: Array.from(availablePositions) as ClubSeasonWithPlayers['availablePositions'],
        });
      }
    }

    // Filter to only club-seasons compatible with open positions
    const compatible = filterCompatibleClubSeasons(openPositions, clubSeasonOptions);

    if (compatible.length === 0) {
      return NextResponse.json(
        { error: 'No compatible club-seasons available' },
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

    // Filter players - exclude already drafted and unique person rule
    const eligiblePlayers = selectedClubSeason.players.filter((ps) => {
      if (draftedPlayerSeasonIds.has(ps.id)) return false;
      if (draftedPlayerNames.has(ps.player.fullName)) return false;
      return true;
    });

    // Build player options — include primeRating and primeSeason for prime mode
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
    });
  } catch (error) {
    console.error('Failed to spin wheel:', error);
    return NextResponse.json(
      { error: 'Failed to spin wheel' },
      { status: 500 },
    );
  }
}
