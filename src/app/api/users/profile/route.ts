import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId query parameter is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { telegramId: String(telegramId) },
      include: {
        runs: {
          where: { completed: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate aggregate stats from completed runs
    const completedRuns = user.runs;
    const totalGames = completedRuns.length;
    const totalWins = completedRuns.reduce((sum, r) => sum + (r.wins || 0), 0);
    const totalDraws = completedRuns.reduce((sum, r) => sum + (r.draws || 0), 0);
    const totalLosses = completedRuns.reduce((sum, r) => sum + (r.losses || 0), 0);
    const totalPoints = completedRuns.reduce((sum, r) => sum + (r.points || 0), 0);
    const bestPosition = completedRuns
      .map((r) => r.position)
      .filter((p): p is number => p !== null)
      .sort((a, b) => a - b)[0] ?? null;
    const bestOverallRating = completedRuns
      .map((r) => r.overallRating)
      .filter((r): r is number => r !== null)
      .sort((a, b) => b - a)[0] ?? null;

    return NextResponse.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        displayName: user.displayName,
        profileStats: user.profileStatsJson ? JSON.parse(user.profileStatsJson) : null,
      },
      stats: {
        totalGames,
        totalWins,
        totalDraws,
        totalLosses,
        totalPoints,
        bestPosition,
        bestOverallRating,
      },
      recentRuns: completedRuns.map((r) => ({
        id: r.id,
        formation: r.formation,
        difficulty: r.difficulty,
        wins: r.wins,
        draws: r.draws,
        losses: r.losses,
        points: r.points,
        position: r.position,
        overallRating: r.overallRating,
        teamName: r.teamName,
        managerName: r.managerName,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
