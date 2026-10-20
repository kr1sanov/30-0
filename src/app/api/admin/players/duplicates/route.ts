import { db } from "@/lib/db";
import { canAdminWrite, requireAdmin } from "@/lib/adminAuth";
import { sameOrigin } from "@/lib/telegramSession";
import { playerDuplicateGroups } from "@/lib/adminPlayerData";
import { mergePlayerIdentities } from "@/lib/adminPlayerService";
export async function GET(request: Request) {
  if (!(await requireAdmin(request)))
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  const players = await db.player.findMany({
    where: { mergedIntoId: null },
    include: {
      seasons: {
        select: {
          clubSeasonId: true,
          sourceUrl: true,
          rating: true,
          mainPosition: true,
          clubSeason: {
            select: { clubId: true, season: { select: { startYear: true } } },
          },
        },
      },
    },
  });
  const groups = playerDuplicateGroups(
    players.map((p) => ({
      ...p,
      seasons: p.seasons.map((s) => ({
        ...s,
        clubId: s.clubSeason.clubId,
        year: s.clubSeason.season.startYear,
      })),
    })),
  );
  return Response.json(
    {
      scanned: players.length,
      safe: groups.filter((g) => g.safe).length,
      groups,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor || !canAdminWrite(actor.role, "rosters") || !sameOrigin(request))
    return Response.json({ error: "Нет прав" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  try {
    if (typeof body.targetId !== "string" || typeof body.sourceId !== "string")
      return Response.json(
        { error: "Выбери основную и дублирующую карточки" },
        { status: 400 },
      );
    return Response.json(
      await mergePlayerIdentities(body.targetId, body.sourceId, actor.username),
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Не удалось объединить" },
      { status: 409 },
    );
  }
}
