import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';
import { getArchiveAccess } from '@/lib/challengeAccess';
import { challengeSucceeded, listWeeklyChallenges } from '@/lib/weeklyChallenges';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const now = new Date();
    const { active, archive } = listWeeklyChallenges(now);
    const userId = sessionUser(request);
    const [access, runs, totals] = await Promise.all([
      getArchiveAccess(userId, now),
      userId ? db.gameRun.findMany({
        where: { userId, challengeIssueId: { not: null } },
        select: { id: true, challengeIssueId: true, completed: true, position: true, goalsFor: true, losses: true, points: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: 200,
      }) : Promise.resolve([]),
      db.gameRun.groupBy({ by: ['challengeIssueId'],
        where: { challengeIssueId: { in: active.map(issue => issue.id) }, completed: true },
        _count: { _all: true },
      }),
    ]);
    const issueMap = new Map([...active, ...archive].map(issue => [issue.id, issue]));
    const personal = runs.map(run => ({
      id: run.id, issueId: run.challengeIssueId, completed: run.completed,
      succeeded: run.completed && !!run.challengeIssueId && !!issueMap.get(run.challengeIssueId)
        && challengeSucceeded(issueMap.get(run.challengeIssueId)!, run),
      position: run.position, points: run.points, goalsFor: run.goalsFor,
      createdAt: run.createdAt.toISOString(),
    }));
    return NextResponse.json({ active, archive, nextReleaseAt: active[0]?.endsAt ?? null,
      archiveUnlockedUntil: access.unlockedUntil, referralCount: access.referralCount,
      personal, totalCompleted: Object.fromEntries(totals.map(item => [item.challengeIssueId, item._count._all])),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Challenge overview:', error);
    return NextResponse.json({ error: 'Не удалось загрузить челленджи' }, { status: 500 });
  }
}
