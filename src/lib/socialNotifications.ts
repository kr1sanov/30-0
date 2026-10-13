import { localizeBotMessage, localizeBotButton } from "./botLanguage";
import { seasonResultImage } from "./seasonResultNotification";
import { currentBotLanguage, currentPreferences } from "./cloudPreferences";
import {
  notificationAllowed,
  type NotificationCategory,
} from "./notificationPreferences";
import { activeRestriction } from "./moderation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  telegramChatId,
} from "./telegramBot";

export async function queueSocialNotification(
  eventKey: string,
  userId: string,
  text: string,
  startParam: string,
  client: Prisma.TransactionClient = db,
) {
  await client.telegramOutbox.upsert({
    where: { eventKey },
    create: {
      eventKey,
      userId,
      text,
      startParam,
      buttonText: "Open 30-0",
      category: eventKey.startsWith("invite:")
        ? "invitations"
        : eventKey.startsWith("accepted:")
          ? "friend_updates"
          : "friends",
    },
    update: {},
  });
}

export async function flushSocialNotifications() {
  const now = new Date();
  await db.telegramOutbox.updateMany({
    where: {
      status: "pending",
      attempts: { gte: 5 },
      availableAt: { lte: now },
    },
    data: { status: "failed", lastError: "Delivery attempts exhausted" },
  });
  const pending = await db.telegramOutbox.findMany({
    where: {
      sentAt: null,
      status: "pending",
      attempts: { lt: 5 },
      availableAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  await Promise.all(
    pending.map(async (item) => {
      // Lease prevents concurrent Passenger workers from sending the same event.
      const claim = await db.telegramOutbox.updateMany({
        where: {
          id: item.id,
          status: "pending",
          sentAt: null,
          attempts: item.attempts,
          availableAt: { lte: now },
        },
        data: {
          attempts: { increment: 1 },
          availableAt: new Date(now.getTime() + 60_000),
        },
      });
      if (!claim.count) return;
      const user = await db.user.findUnique({
        where: { id: item.userId },
        select: {
          providerId: true,
          telegramNotificationsEnabled: true,
          deleteAfterAt: true,
          telegramChatStarted: true,
          bannedAt: true,
          bannedUntil: true,
          banReason: true,
        },
      });
      const chatId = user && telegramChatId(user.providerId);
      let allowed = false;
      let language: 'ru' | 'en' = 'ru';
      try {
        language = await currentBotLanguage(item.userId);
        allowed = Boolean(
          user &&
          notificationAllowed(
            await currentPreferences(item.userId),
            (item.eventKey.startsWith("invite:")
              ? "invitations"
              : item.eventKey.startsWith("accepted:")
                ? "friend_updates"
                : item.category) as NotificationCategory,
          ),
        );
      } catch {
        await db.telegramOutbox.update({
          where: { id: item.id },
          data: {
            attempts: { decrement: 1 },
            availableAt: new Date(Date.now() + 60000),
            lastError: "Preference service unavailable",
          },
        });
        return;
      }
      const started =
        user?.telegramChatStarted ||
        (user &&
          (
            await db.user.findUnique({
              where: { id: item.userId },
              select: { telegramChatStarted: true },
            })
          )?.telegramChatStarted);
      if (
        !chatId ||
        !allowed ||
        !started ||
        user.deleteAfterAt ||
        activeRestriction(user)
      ) {
        await db.telegramOutbox.update({
          where: { id: item.id },
          data: { sentAt: now, status: "skipped" },
        });
        return;
      }
      if (item.category === "news" && language === "en" && !item.textEn) {
        await db.telegramOutbox.update({ where: { id: item.id }, data: { sentAt: now, status: "skipped", lastError: "English campaign version missing" } });
        return;
      }
      const bot = (process.env.TELEGRAM_BOT_USERNAME || "RPL30_bot").replace(
        /^@/,
        "",
      );
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: item.category === "news" ? (language === "en" ? item.buttonTextEn || item.buttonText : item.buttonText) : localizeBotButton(item.buttonText || "Open 30-0", language),
              url:
                item.buttonUrl ||
                `https://t.me/${bot}?startapp=${encodeURIComponent(item.startParam)}`,
            },
          ],
        ],
      };
      const image = item.imageId
        ? await db.mediaAsset.findUnique({ where: { id: item.imageId } })
        : null;
      let imageData = image?.data;
      if (item.category === "results" && item.eventKey.startsWith("result:")) {
        const run = await db.gameRun.findUnique({ where: { id: item.eventKey.slice(7) }, include: { user: true } });
        if (run?.user) imageData = await seasonResultImage({ ...run, user: run.user }, language);
      }
      const message = item.category === "news" ? (language === "en" ? item.textEn || item.text : item.text) : localizeBotMessage(item.text, language);
      const sent = imageData
        ? await sendTelegramPhoto(chatId, imageData, message, keyboard)
        : await sendTelegramMessage(chatId, message, keyboard);
      await db.telegramOutbox.update({
        where: { id: item.id },
        data: sent
          ? { sentAt: new Date(), status: "sent", lastError: null }
          : {
              status: item.attempts >= 4 ? "failed" : "pending",
              lastError: "Telegram delivery failed",
              availableAt: new Date(Date.now() + 60000 * 2 ** item.attempts),
            },
      });
    }),
  );
}

export const escapeTelegramHtml = (text: string) =>
  text.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!,
  );
