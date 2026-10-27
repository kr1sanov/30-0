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
        { id: 'asc' },
      ],
      take: 50,
      select: {
        id: true, formation: true, difficulty: true, overallRating: true,
        points: true, position: true, createdAt: true,
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
