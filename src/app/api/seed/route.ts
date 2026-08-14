import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { execFile } from 'child_process';
import path from 'path';

// GET /api/seed — Check seed status
export async function GET() {
  try {
    const clubs = await db.club.count();
    const seasons = await db.season.count();
    const players = await db.player.count();
    const playerSeasons = await db.playerSeason.count();
    const gameRuns = await db.gameRun.count();
    const clubSeasons = await db.clubSeason.count();

    return NextResponse.json({
      seeded: clubs > 0,
      stats: { clubs, seasons, clubSeasons, players, playerSeasons, gameRuns }
    });
  } catch (error: any) {
    return NextResponse.json(
      { seeded: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/seed — Seed the database
// Runs the prisma/seed.ts script if the database is empty.
// Call via: curl -X POST http://localhost:3000/api/seed
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

    // Run the seed script as a subprocess
    const seedScript = path.join(process.cwd(), 'prisma', 'seed.ts');
    
    return new Promise<NextResponse>((resolve) => {
      execFile('bun', ['run', seedScript], {
        cwd: process.cwd(),
        timeout: 120000, // 2 minutes timeout
        env: { ...process.env },
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('Seed subprocess error:', error);
          console.error('Seed stderr:', stderr);
          resolve(NextResponse.json(
            { error: 'Seed script failed', details: error.message, stderr: stderr.slice(0, 500) },
            { status: 500 }
          ));
          return;
        }

        console.log('Seed stdout:', stdout.slice(-500));
        resolve(NextResponse.json({
          message: 'Database seeded successfully',
          output: stdout.slice(-500)
        }));
      });
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Seed failed', details: error.message },
      { status: 500 }
    );
  }
}
