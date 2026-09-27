import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [clubs, seasons, players, playerSeasons, gameRuns, years] = await Promise.all([
      db.club.count({ where: { seasons: { some: { players: { some: {} } } } } }),
      db.season.count({ where: { clubSeasons: { some: { players: { some: {} } } } } }),
      db.player.count({ where: { seasons: { some: {} } } }),
      db.playerSeason.count(),
      db.gameRun.count(),
      db.season.aggregate({ _min: { startYear: true }, _max: { endYear: true } }),
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
