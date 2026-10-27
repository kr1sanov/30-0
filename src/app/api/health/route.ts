import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cachedValue } from '@/lib/asyncWork';

const counts = cachedValue(async () => {
  const [clubs, players, seasons, playerSeasons, gameRuns, users] = await Promise.all([
    db.club.count(), db.player.count({ where: { mergedIntoId: null } }), db.season.count(),
    db.playerSeason.count(), db.gameRun.count(), db.user.count(),
  ]);
  return { clubs, players, seasons, playerSeasons, gameRuns, users };
}, 15_000);

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    // Always probe the database, even when aggregate counters are cached.
    await db.$queryRaw`SELECT 1`;
    const stats = await counts();

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      version: process.env.NODE_ENV || 'development',
      revision: process.env.APP_REVISION || 'unversioned',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      stats,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        error: 'Database temporarily unavailable',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
