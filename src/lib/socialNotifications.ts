import { currentPreferences } from "./cloudPreferences";
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
      try {
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
      const bot = (process.env.TELEGRAM_BOT_USERNAME || "RPL30_bot").replace(
        /^@/,
        "",
      );
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: item.buttonText || "Open 30-0",
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
      const sent = image
        ? await sendTelegramPhoto(chatId, image.data, item.text, keyboard)
        : await sendTelegramMessage(chatId, item.text, keyboard);
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
