import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const activeYears = { startYear: { gte: 2006, lte: 2021 } };
    const activePlayers = { clubSeason: { season: activeYears } };
    const [clubs, seasons, players, playerSeasons, gameRuns, years] = await Promise.all([
      db.club.count({ where: { seasons: { some: { season: activeYears, players: { some: {} } } } } }),
      db.season.count({ where: { ...activeYears, clubSeasons: { some: { players: { some: {} } } } } }),
      db.player.count({ where: { seasons: { some: activePlayers } } }),
      db.playerSeason.count({ where: activePlayers }),
      db.gameRun.count(),
      db.season.aggregate({ where: activeYears, _min: { startYear: true }, _max: { endYear: true } }),
    ]);

    return NextResponse.json({
      clubs,
      seasons,
      players,
      playerSeasons,
      gameRuns,
      firstYear: years._min.startYear,
      lastYear: years._max.endYear,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
