import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clubCount = await db.club.count();
    const playerCount = await db.player.count();
    const seasonCount = await db.season.count();
    const playerSeasonCount = await db.playerSeason.count();
    const gameRunCount = await db.gameRun.count();
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      clubs: clubCount,
      players: playerCount,
      playerSeasons: playerSeasonCount,
      seasons: seasonCount,
      gameRuns: gameRunCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
