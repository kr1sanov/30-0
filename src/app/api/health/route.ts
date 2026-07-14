import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();

  try {
    const clubCount = await db.club.count();
    const playerCount = await db.player.count();
    const seasonCount = await db.season.count();
    const playerSeasonCount = await db.playerSeason.count();
    const gameRunCount = await db.gameRun.count();
    const userCount = await db.user.count();

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      version: process.env.NODE_ENV || 'development',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      stats: {
        clubs: clubCount,
        players: playerCount,
        playerSeasons: playerSeasonCount,
        seasons: seasonCount,
        gameRuns: gameRunCount,
        users: userCount,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
