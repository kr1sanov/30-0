import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  try {
    const [complete, activeToday, totalUsers, totalRuns, activeRuns, topRuns, recentRuns, campaigns] = await Promise.all([
      db.gameRun.count({ where: { completed: true } }),
      db.user.count({ where: { updatedAt: { gte: new Date(Date.now() - 86400000) } } }),
      db.user.count(),
      db.gameRun.count(),
      db.gameRun.count({ where: { completed: false } }),
      db.gameRun.findMany({ where: { completed: true }, orderBy: { points: 'desc' }, take: 5, select: { points: true, wins: true, position: true, user: { select: { displayName: true, username: true } } } }),
      db.gameRun.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, createdAt: true, completed: true, points: true, position: true, user: { select: { displayName: true, username: true } } } }),
      db.notificationCampaign.findMany({ orderBy: { updatedAt: 'desc' } }),
    ]);
    return NextResponse.json({ metrics: { totalUsers, totalRuns, completedRuns: complete, activeRuns, activeToday, completionRate: totalRuns ? Math.round(complete / totalRuns * 100) : 0 }, topRuns, recentRuns, campaigns });
  } catch { return NextResponse.json({ error: 'Не удалось загрузить аналитику' }, { status: 500 }); }
}
