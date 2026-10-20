import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { adminRange, dateWhere, moscowDay } from "@/lib/adminInsights";
import { gameReturnCohorts } from "@/lib/adminRetention";
import { challengeCatalog } from "@/lib/challengeCatalog";
import { ALL_POSITIONS } from "@/lib/positions";
export async function GET(request: Request) {
  if (!(await requireAdmin(request)))
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  let range;
  try {
    range = adminRange(new URL(request.url).searchParams);
  } catch {
    return Response.json({ error: "Проверь период" }, { status: 400 });
  }
  const now = new Date(),
    daysAgo = (n: number) => new Date(+now - n * 86400000);
  const period = dateWhere(range.from, range.to),
    runDate = period ? { createdAt: period } : {};
  const today = new Date(`${moscowDay(now)}T00:00:00+03:00`);
  const activity = (from: Date) => ({
    OR: [
      { lastActiveAt: { gte: from } },
      { runs: { some: { createdAt: { gte: from } } } },
    ],
  });
  const [
    dau,
    wau,
    mau,
    newUsers,
    activated,
    returningPlayers,
    notifications,
    oldest,
    missingBot,
    banned,
    review,
    deleting,
    staleDrafts,
    staleRooms,
    clubCount,
    playerCount,
    cardCount,
    seasons,
    invalidCards,
    catalog,
    cohorts,
  ] = await Promise.all([
    db.user.count({ where: activity(today) }),
    db.user.count({ where: activity(new Date(+today - 6 * 86400000)) }),
    db.user.count({ where: activity(new Date(+today - 29 * 86400000)) }),
    db.user.count({ where: period ? { createdAt: period } : {} }),
    db.user.count({
      where: {
        ...(period ? { createdAt: period } : {}),
        runs: { some: runDate },
      },
    }),
    range.from
      ? db.user.count({
          where: {
            AND: [
              { runs: { some: { createdAt: { lt: range.from } } } },
              { runs: { some: runDate } },
            ],
          },
        })
      : Promise.resolve(null),
    db.telegramOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
    db.telegramOutbox.findFirst({
      where: { status: "pending", sentAt: null, availableAt: { lte: now } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.user.count({
      where: { telegramChatStarted: false, provider: "telegram" },
    }),
    db.user.count({
      where: {
        bannedAt: { not: null },
        OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }],
      },
    }),
    db.user.count({ where: { moderationStatus: "watch" } }),
    db.user.count({ where: { deletionRequestedAt: { not: null } } }),
    db.gameRun.count({
      where: { completed: false, createdAt: { lt: daysAgo(1) } },
    }),
    db.multiplayerRoom.count({
      where: {
        status: { in: ["lobby", "starting", "drafting"] },
        updatedAt: { lt: new Date(+now - 1800000) },
      },
    }),
    db.club.count(),
    db.player.count({ where: { mergedIntoId: null } }),
    db.playerSeason.count(),
    db.season.findMany({
      orderBy: { startYear: "desc" },
      select: {
        label: true,
        _count: {
          select: { clubSeasons: { where: { players: { some: {} } } } },
        },
      },
    }),
    db.playerSeason.count({
      where: {
        OR: [
          { rating: { lt: 1 } },
          { rating: { gt: 100 } },
          { mainPosition: { notIn: [...ALL_POSITIONS] } },
        ],
      },
    }),
    challengeCatalog(now),
    db.user.findMany({
      where: { createdAt: { gte: daysAgo(90) } },
      select: {
        id: true,
        createdAt: true,
        runs: {
          where: { createdAt: { gte: daysAgo(90) } },
          select: { createdAt: true },
        },
      },
    }),
  ]);
  const queue = Object.fromEntries(
    notifications.map((n) => [n.status, n._count._all]),
  );
  return Response.json(
    {
      asOf: now.toISOString(),
      engagement: {
        dau,
        wau,
        mau,
        newUsers,
        activated,
        activationRate: newUsers
          ? Math.round((activated / newUsers) * 100)
          : null,
        returningPlayers,
        retention: gameReturnCohorts(cohorts, now),
      },
      processes: {
        queue,
        oldestPendingAt: oldest?.createdAt ?? null,
        missingBot,
        banned,
        review,
        deleting,
        staleDrafts,
        staleRooms,
      },
      content: {
        clubs: clubCount,
        players: playerCount,
        cards: cardCount,
        seasons: seasons.length,
        playableSeasons: seasons.filter((s) => s._count.clubSeasons >= 16)
          .length,
        invalidCards,
        latestSeason: seasons[0]?.label ?? null,
        challenges: Object.fromEntries(
          ["active", "scheduled", "hidden", "archived"].map((status) => [
            status,
            catalog.filter((i) => i.status === status).length,
          ]),
        ),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
