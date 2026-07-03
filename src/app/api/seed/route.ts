import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/seed — Check seed status
export async function GET() {
  try {
    const clubs = await db.club.count();
    const seasons = await db.season.count();
    const players = await db.player.count();
    const playerSeasons = await db.playerSeason.count();
    const gameRuns = await db.gameRun.count();

    return NextResponse.json({
      seeded: clubs > 0,
      stats: { clubs, seasons, players, playerSeasons, gameRuns }
    });
  } catch (error: any) {
    return NextResponse.json(
      { seeded: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/seed — Seed the database via Prisma
// Call this once after deployment: curl -X POST https://your-app.vercel.app/api/seed
export async function POST(req: NextRequest) {
  try {
    // Check if already seeded
    const existingClubs = await db.club.count();
    if (existingClubs > 0) {
      const stats = {
        clubs: existingClubs,
        seasons: await db.season.count(),
        clubSeasons: await db.clubSeason.count(),
        players: await db.player.count(),
        playerSeasons: await db.playerSeason.count(),
      };
      return NextResponse.json({
        message: 'Database already seeded',
        stats
      });
    }

    // For production (Vercel), the seed is run via:
    // 1. Set DATABASE_URL to Supabase connection string in Vercel env vars
    // 2. Run `bun run db:seed` from the Vercel build command or
    // 3. Call this API endpoint after deployment

    return NextResponse.json({
      message: 'No seed data available via API. Run `bun run db:seed` CLI command instead.',
      hint: 'For Vercel: add "postbuild": "bun run db:seed" to package.json scripts'
    }, { status: 501 });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Seed failed', details: error.message },
      { status: 500 }
    );
  }
}
