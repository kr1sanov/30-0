import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const leaderboard = await db.gameRun.findMany({
      where: {
        completed: true,
        points: { not: null },
      },
      orderBy: [
        { points: 'desc' },
        { position: 'asc' },
      ],
      take: 50,
      include: {
        slots: {
          where: { playerSeasonId: { not: null } },
          orderBy: { slotPosition: 'asc' },
        },
      },
    });

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 },
    );
  }
}
