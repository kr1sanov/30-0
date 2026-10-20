import { z } from "zod";
import { db } from "@/lib/db";
import { canAdminWrite, requireAdmin } from "@/lib/adminAuth";
import { sameOrigin } from "@/lib/telegramSession";
import { playerCardSchema } from "@/lib/adminPlayerData";
import { markManualCard } from "@/lib/adminPlayerService";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const actor = await requireAdmin(request);
  if (!actor || !canAdminWrite(actor.role, "players") || !sameOrigin(request))
    return Response.json({ error: "Нет прав" }, { status: 403 });
  const { playerId } = await params;
  const parsed = z
    .object({ clubSeasonId: z.string().min(1), card: playerCardSchema })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Проверь данные карточки" },
      { status: 400 },
    );
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player || player.mergedIntoId)
    return Response.json({ error: "Игрок не найден" }, { status: 404 });
  if (
    !(await db.clubSeason.findUnique({
      where: { id: parsed.data.clubSeasonId },
    }))
  )
    return Response.json({ error: "Выбери клуб и сезон" }, { status: 400 });
  try {
    const card = await db.$transaction(async (tx) => {
      const result = await tx.playerSeason.create({
        data: {
          playerId,
          clubSeasonId: parsed.data.clubSeasonId,
          ...parsed.data.card,
        },
      });
      await markManualCard(tx, result.id);
      return result;
    });
    return Response.json({ card }, { status: 201 });
  } catch {
    return Response.json(
      {
        error:
          "У игрока уже есть карточка в этом клубе и сезоне. Открой её для редактирования.",
      },
      { status: 409 },
    );
  }
}
