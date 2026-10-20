import type { Prisma } from "@prisma/client";
import { canFillSlotStrict, type Position } from "./positions.ts";

export async function markManualCard(tx: Prisma.TransactionClient, id: string) {
  const key = `player-card-manual:${id}`;
  const value = new Date().toISOString();
  await tx.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
export async function syncOpenSlots(tx: Prisma.TransactionClient, id: string) {
  const card = await tx.playerSeason.findUniqueOrThrow({
    where: { id },
    include: { player: true },
  });
  const slots = await tx.gameSlot.findMany({
    where: { playerSeasonId: id, run: { completed: false } },
  });
  for (const slot of slots)
    await tx.gameSlot.update({
      where: { id: slot.id },
      data: {
        playerName: card.player.alias || card.player.fullName,
        playerLastName: card.player.alias || card.player.lastName,
        playerRating: card.rating,
        playerPrimeRating: card.primeRating || card.rating,
        playerPosition: card.mainPosition,
        playerOtherPositions: card.otherPositions,
        playerNationality: card.nationality || card.player.nationality,
        isCompatible: canFillSlotStrict(
          card.mainPosition as Position,
          (card.otherPositions || "").split(",").filter(Boolean) as Position[],
          slot.slotPosition.split("_")[0] as Position,
        ),
      },
    });
}
/** Retire duplicate identities without deleting their recoverable records or completed-game snapshots. */
export async function mergeWithinTransaction(
  tx: Prisma.TransactionClient,
  targetId: string,
  sourceId: string,
  actor: string,
) {
  if (targetId === sourceId) throw new Error("Выбери две разные карточки");

  const target = await tx.player.findUnique({
    where: { id: targetId },
    include: { seasons: true },
  });
  const source = await tx.player.findUnique({
    where: { id: sourceId },
    include: { seasons: true },
  });
  if (!target || !source || target.mergedIntoId || source.mergedIntoId)
    throw new Error("Игрок не найден или уже объединён");
  if (
    target.birthYear &&
    source.birthYear &&
    target.birthYear !== source.birthYear
  )
    throw new Error("Разные годы рождения: проверь, что это один футболист");
  const key = `player-merge:${sourceId}`;
  await tx.appSetting.create({
    data: {
      key,
      value: JSON.stringify({
        targetId,
        actor,
        at: new Date().toISOString(),
        source,
        target,
      }),
    },
  });
  const inherited = {
    firstNameRu: target.firstNameRu || source.firstNameRu,
    lastNameRu: target.lastNameRu || source.lastNameRu,
    aliasRu: target.aliasRu || source.aliasRu,
    alias: target.alias || source.alias,
    birthYear: target.birthYear || source.birthYear,
    nationality: target.nationality || source.nationality,
  };
  await tx.player.update({ where: { id: targetId }, data: inherited });
  for (const card of source.seasons) {
    const existing = target.seasons.find(
      (c) => c.clubSeasonId === card.clubSeasonId,
    );
    if (existing) {
      await tx.gameSlot.updateMany({
        where: { playerSeasonId: card.id },
        data: { playerSeasonId: existing.id },
      });
      const redirectKey = `player-card-redirect:${card.id}`;
      await tx.appSetting.upsert({
        where: { key: redirectKey },
        create: { key: redirectKey, value: existing.id },
        update: { value: existing.id },
      });
      await tx.playerSeason.delete({ where: { id: card.id } });
      await markManualCard(tx, existing.id);
    } else {
      await tx.playerSeason.update({
        where: { id: card.id },
        data: { playerId: targetId },
      });
      await markManualCard(tx, card.id);
    }
  }
  await tx.player.update({
    where: { id: sourceId },
    data: { mergedIntoId: targetId },
  });
  const cards = await tx.playerSeason.findMany({
    where: { playerId: targetId },
    select: { id: true },
  });
  for (const card of cards) await syncOpenSlots(tx, card.id);
  return { targetId, moved: source.seasons.length };
}
