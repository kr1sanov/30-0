import { z } from "zod";
import { db } from "@/lib/db";
import { canAdminWrite, requireAdmin } from "@/lib/adminAuth";
import { sameOrigin } from "@/lib/telegramSession";
import { playerIdentitySchema, playerCardSchema } from "@/lib/adminPlayerData";
import { markManualCard, syncOpenSlots } from "@/lib/adminPlayerService";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  if (!(await requireAdmin(request)))
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  const { playerId } = await params;
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: {
      seasons: {
        include: { clubSeason: { include: { club: true, season: true } } },
        orderBy: { clubSeason: { season: { startYear: "desc" } } },
      },
    },
  });
  return player
    ? Response.json({ player })
    : Response.json({ error: "Игрок не найден" }, { status: 404 });
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const actor = await requireAdmin(request);
  if (!actor || !canAdminWrite(actor.role, "players") || !sameOrigin(request))
    return Response.json({ error: "Нет прав" }, { status: 403 });
  const { playerId } = await params;
  const body = await request.json().catch(() => null);
  // Keep the existing editor API compatible for saved clients.
  if (body?.season && !body.season.data) {
    const { id, ...data } = body.season;
    body.season = { id, data };
  }
  const parsed = z
    .object({
      player: playerIdentitySchema.optional(),
      season: z.object({ id: z.string(), data: playerCardSchema }).optional(),
    })
    .strict()
    .safeParse(body);
  if (!parsed.success || (!parsed.data.player && !parsed.data.season))
    return Response.json(
      {
        error: parsed.success
          ? "Нет изменений"
          : parsed.error.issues[0]?.message,
      },
      { status: 400 },
    );
  const p = await db.player.findUnique({ where: { id: playerId } });
  if (!p || p.mergedIntoId)
    return Response.json(
      { error: "Игрок не найден или объединён" },
      { status: 404 },
    );
  const season = parsed.data.season;
  if (
    season &&
    !(await db.playerSeason.findFirst({ where: { id: season.id, playerId } }))
  )
    return Response.json(
      { error: "Карточка не принадлежит игроку" },
      { status: 400 },
    );
  await db.$transaction(
    async (tx) => {
      if (parsed.data.player) {
        const v = parsed.data.player;
        const data = {
          ...v,
          firstName: v.firstName || null,
          alias: v.alias || null,
          fullName: [v.firstName, v.lastName].filter(Boolean).join(" "),
        };
        await tx.player.update({ where: { id: playerId }, data });
        const key = `player-identity-manual:${playerId}`;
        await tx.appSetting.upsert({
          where: { key },
          create: { key, value: JSON.stringify(data) },
          update: { value: JSON.stringify(data) },
        });
      }
      if (season) {
        await tx.playerSeason.update({
          where: { id: season.id },
          data: season.data,
        });
        await markManualCard(tx, season.id);
      }
      const cards = await tx.playerSeason.findMany({
        where: { playerId },
        select: { id: true },
      });
      for (const card of cards) await syncOpenSlots(tx, card.id);
    },
    { timeout: 30000 },
  );
  return Response.json({ ok: true });
}
