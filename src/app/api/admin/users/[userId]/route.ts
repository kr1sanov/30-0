import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { activeRestriction } from "@/lib/moderation";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!(await requireAdmin(request)))
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  const { userId } = await params;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      username: true,
      createdAt: true,
      lastActiveAt: true,
      moderationStatus: true,
      bannedAt: true,
      bannedUntil: true,
      banReason: true,
      deletionRequestedAt: true,
      deleteAfterAt: true,
      telegramChatStarted: true,
      telegramNotificationsEnabled: true,
      notifyNews: true,
      notifyResults: true,
      notifyInvites: true,
      notifyFriends: true,
      referralCount: true,
      _count: { select: { runs: true } },
      runs: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          gameMode: true,
          createdAt: true,
          completed: true,
          points: true,
          position: true,
          teamName: true,
        },
      },
    },
  });
  if (!user)
    return Response.json({ error: "Пользователь не найден" }, { status: 404 });
  const history = await db.moderationAction.findMany({
    where: { userId },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  return Response.json(
    { user: { ...user, restriction: activeRestriction(user) }, history },
    { headers: { "Cache-Control": "no-store" } },
  );
}
