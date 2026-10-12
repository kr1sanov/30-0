import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
export async function GET(request: Request) {
  if (!(await requireAdmin(request)))
    return NextResponse.json({ error: "Access denied" }, { status: 401 });
  const period = new URL(request.url).searchParams.get("period") || "1";
  if (!["1", "3", "7", "30", "365"].includes(period))
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  const now = new Date(),
    from = new Date(now.getTime() - Number(period) * 86400000);
  const grouped = await db.gameRun.groupBy({
    by: ["userId"],
    where: {
      userId: { not: null },
      OR: [
        { completedAt: { gte: from, lte: now } },
        { completedAt: null, createdAt: { gte: from, lte: now } },
      ],
      completed: true,
    },
    _count: { id: true },
    _sum: { points: true },
    orderBy: [{ _count: { id: "desc" } }, { userId: "asc" }],
    take: 50,
  });
  const users = await db.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId!) } },
    select: { id: true, username: true, displayName: true },
  });
  const names = new Map(users.map((u) => [u.id, u]));
  return NextResponse.json({
    from: from.toISOString(),
    to: now.toISOString(),
    rows: grouped.map((g, index) => ({
      ...names.get(g.userId!),
      rank: index + 1,
      seasons: g._count.id,
      points: g._sum.points || 0,
    })),
  });
}
