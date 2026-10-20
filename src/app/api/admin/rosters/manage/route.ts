import { z } from "zod";
import { db } from "@/lib/db";
import { canAdminWrite, requireAdmin } from "@/lib/adminAuth";
import { sameOrigin } from "@/lib/telegramSession";
import { markManualCard } from "@/lib/adminPlayerService";
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("addClub"),
      seasonId: z.string().min(1),
      clubId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      action: z.literal("copyRoster"),
      sourceId: z.string().min(1),
      targetId: z.string().min(1),
    })
    .strict(),
]);
export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor || !canAdminWrite(actor.role, "rosters") || !sameOrigin(request))
    return Response.json({ error: "Нет прав" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Выбери клуб и сезон" }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "addClub") {
      if (
        !(await db.season.findUnique({ where: { id: b.seasonId } })) ||
        !(await db.club.findUnique({ where: { id: b.clubId } }))
      )
        return Response.json(
          { error: "Клуб или сезон не найден" },
          { status: 404 },
        );
      return Response.json({
        clubSeason: await db.clubSeason.upsert({
          where: {
            clubId_seasonId: { clubId: b.clubId, seasonId: b.seasonId },
          },
          create: { clubId: b.clubId, seasonId: b.seasonId },
          update: {},
        }),
      });
    }
    if (b.sourceId === b.targetId)
      return Response.json(
        { error: "Выбери другой состав для копирования" },
        { status: 400 },
      );
    const result = await db.$transaction(
      async (tx) => {
        const target = await tx.clubSeason.findUnique({
          where: { id: b.targetId },
          include: { players: { select: { playerId: true } } },
        });
        const source = await tx.clubSeason.findUnique({
          where: { id: b.sourceId },
          include: { players: { include: { player: true } } },
        });
        if (!source || !target) throw new Error("Состав не найден");
        const existing = new Set(target.players.map((p) => p.playerId));
        let added = 0;
        for (const card of source.players) {
          const playerId = card.player.mergedIntoId || card.playerId;
          if (existing.has(playerId)) continue;
          const { id: _id, player: _player, ...data } = card;
          const row = await tx.playerSeason.create({
            data: { ...data, playerId, clubSeasonId: target.id },
          });
          await markManualCard(tx, row.id);
          existing.add(playerId);
          added++;
        }
        return { added, skipped: source.players.length - added };
      },
      { timeout: 30000 },
    );
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Не удалось изменить состав" },
      { status: 409 },
    );
  }
}
