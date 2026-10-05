import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  try {
    const now = new Date();
    const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);
    const activity = (days: number) => ({
      OR: [{ lastActiveAt: { gte: ago(days) } }, { runs: { some: { createdAt: { gte: ago(days) } } } }],
    });
    const perfect = { completed: true, wins: 30, draws: 0, losses: 0 };
    const days = Array.from({ length: 14 }, (_, index) => {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 13 + index));
      return { date: start.toISOString().slice(0, 10), start, end: new Date(start.getTime() + 86_400_000) };
    });
    const [totalUsers, activeToday, activeWeek, activeMonth, totalRuns, completedRuns, activeRuns,
      classicRuns, clubRuns, classicCompleted, clubCompleted, perfectRuns, perfectUsers,
      recentRuns, dailyRuns, totalSeasons, playableSeasons, totalClubs, playableClubs, totalPlayers, playablePlayers, playerCards,
      multiplayerRooms, multiplayerFinished, multiplayerSeats] = await Promise.all([
      db.user.count(), db.user.count({ where: activity(1) }), db.user.count({ where: activity(7) }),
      db.user.count({ where: activity(30) }), db.gameRun.count(),
      db.gameRun.count({ where: { completed: true } }), db.gameRun.count({ where: { completed: false } }),
      db.gameRun.count({ where: { clubFilter: null, multiplayerSeat: null } }), db.gameRun.count({ where: { clubFilter: { not: null } } }),
      db.gameRun.count({ where: { clubFilter: null, multiplayerSeat: null, completed: true } }),
      db.gameRun.count({ where: { clubFilter: { not: null }, completed: true } }),
      db.gameRun.count({ where: perfect }),
      db.gameRun.groupBy({ by: ['userId'], where: { ...perfect, userId: { not: null } },
        _count: { _all: true }, _max: { createdAt: true, points: true } }),
      db.gameRun.findMany({ orderBy: { createdAt: 'desc' }, take: 25,
        select: { id: true, createdAt: true, completed: true, points: true, wins: true, position: true, clubFilter: true,
          user: { select: { id: true, displayName: true, username: true } } } }),
      Promise.all(days.map(day => db.gameRun.count({ where: { createdAt: { gte: day.start, lt: day.end } } }))),
      db.season.count(), db.season.count({ where: { clubSeasons: { some: { players: { some: {} } } } } }),
      db.club.count(), db.club.count({ where: { seasons: { some: { players: { some: {} } } } } }),
      db.player.count(), db.player.count({ where: { seasons: { some: {} } } }), db.playerSeason.count(),
      db.multiplayerRoom.count(), db.multiplayerRoom.count({ where: { status: 'completed' } }),
      db.multiplayerSeat.count({ where: { isBot: false } }),
    ]);
    const winnerIds = perfectUsers.flatMap(row => row.userId ? [row.userId] : []);
    const people = winnerIds.length ? await db.user.findMany({ where: { id: { in: winnerIds } },
      select: { id: true, displayName: true, username: true, provider: true } }) : [];
    const byId = new Map(people.map(person => [person.id, person]));
    const winners = perfectUsers.flatMap(row => {
      const user = row.userId ? byId.get(row.userId) : null;
      return user ? [{ user, runs: row._count._all, bestPoints: row._max.points,
        lastPerfectAt: row._max.createdAt }] : [];
    }).sort((a, b) => (b.lastPerfectAt?.getTime() ?? 0) - (a.lastPerfectAt?.getTime() ?? 0));
    return NextResponse.json({
      role: admin.role, username: admin.username,
      metrics: { totalUsers, activeToday, activeWeek, activeMonth, totalRuns, completedRuns, activeRuns,
        completionRate: totalRuns ? Math.round(completedRuns / totalRuns * 100) : 0,
        perfectRuns, perfectUsers: winners.length,
        totalSeasons, playableSeasons, totalClubs, playableClubs, totalPlayers, playablePlayers, playerCards,
        multiplayerRooms, multiplayerFinished, multiplayerSeats },
      modes: [
        { id: 'classic', label: 'Обычный драфт', runs: classicRuns, completed: classicCompleted },
        { id: 'single_club', label: 'Один клуб', runs: clubRuns, completed: clubCompleted },
        { id: 'multiplayer', label: 'Мультиплеер (комнаты / участники)', runs: multiplayerRooms, completed: multiplayerFinished },
      ],
      activity: days.map((day, index) => ({ date: day.date, runs: dailyRuns[index] })),
      winners, recentRuns,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin dashboard:', error);
    return NextResponse.json({ error: 'Не удалось загрузить аналитику' }, { status: 500 });
  }
}
