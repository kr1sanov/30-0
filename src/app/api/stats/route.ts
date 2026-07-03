import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [clubs, seasons, players, playerSeasons, gameRuns] = await Promise.all([
      db.club.count(),
      db.season.count(),
      db.player.count(),
      db.playerSeason.count(),
      db.gameRun.count(),
    ]);

    return NextResponse.json({
      clubs,
      seasons,
      players,
      playerSeasons,
      gameRuns,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
