import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rateLimit";
import sharp from "sharp";
import { after } from "next/server";
import { currentPreferences } from "@/lib/cloudPreferences";
import { flushSocialNotifications } from "@/lib/socialNotifications";
import { telegramChatId } from "@/lib/telegramBot";
import { sessionUser } from "@/lib/telegramSession";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "telegram:result", {
    limit: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;
  const userId = sessionUser(request);
  if (!userId)
    return NextResponse.json(
      { error: "Войди через Telegram" },
      { status: 401 },
    );

  try {
    const body = (await request.json()) as { runId?: unknown; image?: unknown };
    if (typeof body.runId !== "string" || typeof body.image !== "string") {
      return NextResponse.json(
        { error: "Некорректный запрос" },
        { status: 400 },
      );
    }
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(body.image);
    if (!match)
      return NextResponse.json({ error: "Требуется PNG" }, { status: 400 });
    const image = Buffer.from(match[1], "base64");
    if (image.length < 256 || image.length > 3_000_000) {
      return NextResponse.json(
        { error: "Некорректный размер изображения" },
        { status: 400 },
      );
    }

    try {
      const metadata = await sharp(image, {
        limitInputPixels: 16000000,
      }).metadata();
      if (metadata.format !== "png")
        return NextResponse.json({ error: "PNG required" }, { status: 400 });
    } catch {
      return NextResponse.json({ error: "Invalid PNG" }, { status: 400 });
    }
    const run = await db.gameRun.findFirst({
      where: { id: body.runId, userId, completed: true },
      include: { user: true },
    });
    if (!run?.user)
      return NextResponse.json(
        { error: "Результат не найден" },
        { status: 404 },
      );
    const prefs = await currentPreferences(userId);
    if (!prefs.results || !prefs.enabled || !run.user.telegramChatStarted)
      return NextResponse.json({ ok: true, skipped: true });
    const chatId = telegramChatId(run.user.providerId);
    if (!chatId)
      return NextResponse.json(
        { error: "Telegram не подключён" },
        { status: 409 },
      );

    const caption = [
      "<b>Season complete!</b> ⚽",
      `${run.wins ?? 0} wins · ${run.draws ?? 0} draws · ${run.losses ?? 0} losses`,
      `<b>${run.points ?? 0} points · ${run.position ?? "—"} place</b>`,
      "",
      "Can you beat your score? Open 30-0 and play again.",
    ].join("\n");
    const existing = await db.telegramOutbox.findUnique({
      where: { eventKey: `result:${run.id}` },
    });
    if (!existing) {
      const png = await sharp(image, { limitInputPixels: 16000000 })
        .resize({
          width: 1280,
          height: 1280,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      await db.$transaction(async (tx) => {
        const media = await tx.mediaAsset.create({
          data: { mime: "image/png", data: png, createdBy: userId },
        });
        await tx.telegramOutbox.upsert({
          where: { eventKey: `result:${run.id}` },
          create: {
            eventKey: `result:${run.id}`,
            userId,
            text: caption,
            startParam: `result_${run.id}`,
            category: "results",
            imageId: media.id,
            buttonText: "View season result",
          },
          update: {},
        });
      });
    }
    after(() => flushSocialNotifications());
    return NextResponse.json({ ok: true, queued: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось отправить результат" },
      { status: 500 },
    );
  }
}
