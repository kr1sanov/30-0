import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cachedValue } from '@/lib/asyncWork';

const getStats = cachedValue(async () => {
    const activeYears = { startYear: { gte: 2006, lte: 2026 } };
    const activePlayers = { clubSeason: { season: activeYears } };
    const [clubs, seasons, players, playerSeasons, gameRuns, simulatedSeasons, years] = await Promise.all([
      db.club.count({ where: { seasons: { some: { season: activeYears, players: { some: {} } } } } }),
      db.season.count({ where: { ...activeYears, clubSeasons: { some: { players: { some: {} } } } } }),
      db.player.count({ where: { mergedIntoId: null, seasons: { some: activePlayers } } }),
      db.playerSeason.count({ where: activePlayers }),
      db.gameRun.count(),
      db.gameRun.count({ where: { completed: true } }),
      db.season.aggregate({ where: { ...activeYears, clubSeasons: { some: { players: { some: {} } } } }, _min: { startYear: true }, _max: { startYear: true } }),
    ]);

    return {
      clubs,
      seasons,
      players,
      playerSeasons,
      gameRuns,
      simulatedSeasons,
      firstYear: years._min.startYear,
      lastYear: years._max.startYear,
    };
}, 15_000);

export async function GET() {
  try {
    return NextResponse.json(await getStats());
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
