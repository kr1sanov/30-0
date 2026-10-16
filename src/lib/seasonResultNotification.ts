import { db } from "@/lib/db";
import { seasonResultImage } from "./seasonResultImage";
export { seasonResultImage } from "./seasonResultImage";
export async function queueSeasonResult(runId: string) {
  const eventKey = `result:${runId}`;
  if (await db.telegramOutbox.findUnique({ where: { eventKey } })) return;
  const run = await db.gameRun.findUnique({
    where: { id: runId },
    include: { user: true },
  });
  if (!run?.completed || !run.userId || !run.user) return;
  const image = await seasonResultImage({ ...run, user: run.user }, "en");
  await db.$transaction(async (tx) => {
    if (await tx.telegramOutbox.findUnique({ where: { eventKey } })) return;
    const media = await tx.mediaAsset.create({
      data: { mime: "image/png", data: image, createdBy: run.userId! },
    });
    await tx.telegramOutbox.create({
      data: {
        eventKey,
        userId: run.userId!,
        text: `<b>Season complete! ⚽</b>\n${run.wins || 0} wins · ${run.draws || 0} draws · ${run.losses || 0} losses\n<b>${run.points || 0} points · Place ${run.position || "—"}</b>\nCan you beat your score?`,
        startParam: `result_${runId}`,
        category: "results",
        imageId: media.id,
        buttonText: "View season result",
      },
    });
  });
}
