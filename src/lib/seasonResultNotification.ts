import sharp from "sharp";
import { db } from "@/lib/db";
import { escapeHtml } from "./campaignContent";
export async function queueSeasonResult(runId: string) {
  const eventKey = `result:${runId}`;
  if (await db.telegramOutbox.findUnique({ where: { eventKey } })) return;
  const run = await db.gameRun.findUnique({
    where: { id: runId },
    include: { user: true },
  });
  if (!run?.completed || !run.userId || !run.user) return;
  const title = escapeHtml(
    (run.teamName || run.user.username || run.user.displayName).slice(0, 40),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500"><rect width="900" height="500" fill="#0a1511"/><rect x="28" y="28" width="844" height="444" rx="24" fill="#14281f" stroke="#00c896"/><g font-family="sans-serif" fill="white"><text x="64" y="100" font-size="28" fill="#00c896">30-0 · RPL DRAFT</text><text x="64" y="162" font-size="34">${title}</text><text x="64" y="235" font-size="24" fill="#a4bcb0">SEASON COMPLETE</text><text x="64" y="328" font-size="65" font-weight="bold">${run.points || 0} POINTS</text><text x="64" y="402" font-size="24">${run.wins || 0} WINS · ${run.draws || 0} DRAWS · ${run.losses || 0} LOSSES</text><text x="710" y="238" font-size="24" fill="#a4bcb0">PLACE</text><text x="730" y="330" font-size="68">${run.position || "—"}</text></g></svg>`;
  const image = await sharp(Buffer.from(svg)).png().toBuffer();
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
