import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { sameOrigin } from "@/lib/telegramSession";
import { activeRestriction } from "@/lib/moderation";
export async function GET(request: Request) {
  if (!(await requireAdmin(request)))
    return NextResponse.json({ error: "Access denied" }, { status: 401 });
  const q = (new URL(request.url).searchParams.get("q") || "")
    .trim()
    .slice(0, 100);
  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { username: { contains: q.replace(/^@/, "") } },
            { displayName: { contains: q } },
            { id: q },
          ],
        }
      : { OR: [{ bannedAt: { not: null } }, { moderationStatus: { not: 'active' } }] },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      username: true,
      displayName: true,
      moderationStatus: true,
      bannedAt: true,
      bannedUntil: true,
      banReason: true,
    },
  });
  const history = await db.moderationAction.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({
    users: users.map((u) => ({ ...u, moderationStatus: u.moderationStatus === 'blocked' && !activeRestriction(u) ? 'active' : u.moderationStatus, restriction: activeRestriction(u) })),
    history,
  });
}
export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (
    !admin ||
    !["owner", "admin", "moderator"].includes(admin.role) ||
    !sameOrigin(request)
  )
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  let b;
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof b.userId !== "string" || !["ban", "unban", "warn", "note", "watch", "resolve"].includes(b.action))
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: b.userId } });
  if (!user)
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (user.providerId === "telegram_361912433" && ["ban", "warn", "watch"].includes(b.action))
    return NextResponse.json(
      { error: "The project owner cannot be blocked" },
      { status: 403 },
    );
  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  const durations: Record<string, number | null> = {
    "1h": 3600000,
    "6h": 21600000,
    "12h": 43200000,
    "1d": 86400000,
    "3d": 259200000,
    "7d": 604800000,
    "14d": 1209600000,
    "30d": 2592000000,
    "90d": 7776000000,
    permanent: null,
  };
  if (
    reason.length < 3 ||
    reason.length > 1000 ||
    (b.action === "ban" && !Object.hasOwn(durations, b.duration))
  )
    return NextResponse.json(
      { error: "Specify a reason (3–1000 characters) and a valid duration" },
      { status: 400 },
    );
  const now = new Date(),
    until =
      b.action === "ban" && durations[b.duration] !== null
        ? new Date(now.getTime() + durations[b.duration]!)
        : null;
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data:
        b.action === "ban"
          ? { bannedAt: now, bannedUntil: until, banReason: reason, moderationStatus: 'blocked' }
          : b.action === 'unban' ? { bannedAt: null, bannedUntil: null, banReason: null, moderationStatus: 'active' }
          : b.action === 'note' ? {} : { moderationStatus: b.action === 'warn' ? 'warned' : b.action === 'watch' ? 'watch' : 'active' },
    });
    await tx.moderationAction.create({
      data: {
        userId: user.id,
        actor: admin.username,
        action: b.action,
        reason,
        until,
      },
    });
  });
  return NextResponse.json({ ok: true });
}
