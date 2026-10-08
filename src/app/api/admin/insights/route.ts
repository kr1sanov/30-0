import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { adminMode, adminRange, dateWhere, modeWhere, moscowDay, runWhere } from '@/lib/adminInsights';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  let range;
  try { range = adminRange(new URL(request.url).searchParams); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  const mode = adminMode(new URL(request.url).searchParams.get('mode'));
  const date = dateWhere(range.from, range.to);
  const where = runWhere(mode, range.from, range.to);
    const activeWhere = mode !== 'all' ? { runs: { some: where } } : range.from ? {
      OR: [{ lastActiveAt: date }, { runs: { some: { createdAt: date } } }],
    } : { OR: [{ lastActiveAt: { not: null } }, { runs: { some: {} } }] };
  try {
    const [totalUsers, newUsers, activeUsers, runs, completed, perfect, averages, uniqueUsers, rooms, liveRooms, recentRuns, recentRooms, topGroups, modeCounts] = await Promise.all([
      db.user.count(), db.user.count({ where: date ? { createdAt: date } : {} }), db.user.count({ where: activeWhere }),
      db.gameRun.count({ where }), db.gameRun.count({ where: { ...where, completed: true } }),
      db.gameRun.count({ where: { ...where, completed: true, wins: 30, draws: 0, losses: 0 } }),
      db.gameRun.aggregate({ where: { ...where, completed: true }, _avg: { points: true, wins: true } }),
      db.gameRun.groupBy({ by: ['userId'], where: { ...where, userId: { not: null } } }),
      db.multiplayerRoom.count({ where: date ? { createdAt: date } : {} }),
      db.multiplayerRoom.count({ where: { status: { in: ['lobby', 'starting', 'drafting'] } } }),
      db.gameRun.findMany({ where, take: 8, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true, completed: true, wins: true, points: true, clubFilter: true, multiplayerSeat: { select: { roomCode: true } }, user: { select: { id: true, displayName: true, username: true } } } }),
      db.multiplayerRoom.findMany({ where: date ? { createdAt: date } : {}, take: 5, orderBy: { createdAt: 'desc' }, select: { code: true, status: true, createdAt: true, seats: { select: { id: true, name: true, isBot: true } } } }),
      Promise.all(['classic', 'single_club', 'multiplayer'].map(async id => {
        const groups = await db.gameRun.groupBy({ by: ['userId'], where: { ...runWhere(adminMode(id), range.from, range.to), userId: { not: null } }, _count: { id: true }, _sum: { wins: true }, _max: { points: true, createdAt: true } });
        return { id, groups: groups.sort((a, b) => b._count.id - a._count.id).slice(0, 8) };
      })),
      Promise.all(['classic', 'single_club', 'multiplayer'].map(async id => {
        const filter = { ...where, ...modeWhere(adminMode(id)) };
        const [count, done] = await Promise.all([db.gameRun.count({ where: filter }), db.gameRun.count({ where: { ...filter, completed: true } })]);
        return { id, count, completed: done };
      })),
    ]);
    const userIds = [...new Set(topGroups.flatMap(entry => entry.groups.flatMap(group => group.userId ? [group.userId] : [])))];
    const people = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true, username: true, providerId: true, lastActiveAt: true } }) : [];
    const names = new Map(people.map(user => [user.id, user]));
    const end = range.to ?? new Date();
    const lastDay = new Date(`${moscowDay(new Date(end.getTime() - 1))}T00:00:00+03:00`);
    const firstDay = range.from ?? new Date(lastDay.getTime() - 29 * 86_400_000);
    const chartDays = Math.min(90, Math.max(1, Math.round((lastDay.getTime() - firstDay.getTime()) / 86_400_000) + 1));
    const chartStart = new Date(lastDay.getTime() - (chartDays - 1) * 86_400_000);
    const daily = await db.gameRun.findMany({ where: { ...modeWhere(mode), createdAt: { gte: chartStart, ...(range.to ? { lt: range.to } : {}) } }, select: { createdAt: true } });
    const chart = Array.from({ length: chartDays }, (_, index) => {
      const date = moscowDay(new Date(chartStart.getTime() + index * 86_400_000));
      return { date, runs: 0 };
    });
    const index = new Map(chart.map((day, i) => [day.date, i]));
    for (const entry of daily) {
      const i = index.get(moscowDay(entry.createdAt));
      if (i !== undefined) chart[i].runs++;
    }
    return NextResponse.json({
      range: { label: range.label, from: range.from, to: range.to, timezone: 'Москва (UTC+3)' },
      metrics: { totalUsers, newUsers, activeUsers, inactiveUsers: totalUsers - activeUsers, runs, completed,
        inProgress: runs - completed, completionRate: runs ? Math.round(completed / runs * 100) : 0, perfect,
        averagePoints: averages._avg.points === null ? null : Math.round(averages._avg.points * 10) / 10,
        averageWins: averages._avg.wins === null ? null : Math.round(averages._avg.wins * 10) / 10,
        uniquePlayers: uniqueUsers.length, rooms, liveRooms },
      modes: modeCounts, chart, recentRuns, recentRooms,
      leaders: topGroups.map(entry => ({ id: entry.id, users: entry.groups.flatMap(group => {
        const user = group.userId ? names.get(group.userId) : null;
        return user ? [{ user, runs: group._count.id, wins: group._sum.wins ?? 0, bestPoints: group._max.points, lastGameAt: group._max.createdAt }] : [];
      }) })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin insights:', error);
    return NextResponse.json({ error: 'Не удалось загрузить аналитику' }, { status: 500 });
  }
}
