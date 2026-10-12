import { db } from "@/lib/db";
import {
  preferencesFromUser,
  preferenceData,
  type NotificationPreferences,
} from "./notificationPreferences";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
// Kept outside the standalone bundle so the same audited sources run on Telegram.
async function client() {
  const root = existsSync(
    join(process.cwd(), "scripts/telegram-cloud-client.mjs"),
  )
    ? process.cwd()
    : join(process.cwd(), "../..");
  return import(
    /* webpackIgnore: true */ `${root}/scripts/telegram-cloud-client.mjs`
  );
}
type CloudRecord = {
  tgId: number;
  preferences: NotificationPreferences;
  revision: number;
  started: boolean;
  user: { first_name?: string; last_name?: string; username?: string };
};
export async function currentPreferences(
  userId: string,
  patch?: Partial<NotificationPreferences>,
) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const cloud = await client();
  if (!cloud.cloudConfigured()) {
    const prefs = { ...preferencesFromUser(user), ...patch };
    if (patch)
      await db.user.update({
        where: { id: userId },
        data: preferenceData(prefs),
      });
    return prefs;
  }
  const tgId = Number(user.providerId.replace("telegram_", ""));
  const initial = (await cloud.callCloudPreferences("get", {
    tgId,
    seed: preferencesFromUser(user),
  })) as CloudRecord;
  const record = patch
    ? ((await cloud.callCloudPreferences("set", {
        tgId,
        patch,
      })) as CloudRecord)
    : initial;
  if (!record?.preferences || !Number.isInteger(record.revision))
    throw new Error("Invalid preference service response");
  await db.user.updateMany({
    where: { id: userId, notificationsRevision: { lte: record.revision } },
    data: {
      ...preferenceData(record.preferences),
      notificationsRevision: record.revision,
      ...(record.started ? { telegramChatStarted: true } : {}),
    },
  });
  if (patch)
    await cloud.callCloudPreferences("ack", {
      tgId,
      revision: record.revision,
    });
  return record.preferences;
}
export async function syncCloudPreferences() {
  const cloud = await client();
  if (!cloud.cloudConfigured()) return;
  const records = (await cloud.callCloudPreferences(
    "pending",
  )) as CloudRecord[];
  if (!Array.isArray(records)) throw new Error("Invalid preference batch");
  for (const item of records) {
    if (!Number.isSafeInteger(item.tgId) || item.tgId <= 0 || !item.preferences)
      continue;
    const providerId = `telegram_${item.tgId}`;
    await db.user.upsert({
      where: { providerId },
      create: {
        provider: "telegram",
        providerId,
        displayName:
          [item.user.first_name, item.user.last_name]
            .filter(Boolean)
            .join(" ") || "Telegram player",
        username: item.user.username || null,
        ...preferenceData(item.preferences),
        telegramChatStarted: item.started,
        notificationsRevision: item.revision,
      },
      update: {},
    });
    await db.user.updateMany({
      where: { providerId, notificationsRevision: { lte: item.revision } },
      data: {
        ...preferenceData(item.preferences),
        ...(item.started ? { telegramChatStarted: true } : {}),
        notificationsRevision: item.revision,
      },
    });
  }
  await cloud.callCloudPreferences("ackMany", {
    items: records.map((item) => ({
      tgId: item.tgId,
      revision: item.revision,
    })),
  });
}
export function workerSecret() {
  return (
    process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET ||
    (process.env.TGCLOUD_TOKEN
      ? createHash("sha256")
          .update("30-0 bridge:" + process.env.TGCLOUD_TOKEN)
          .digest("hex")
      : process.env.TELEGRAM_WEBHOOK_SECRET)
  );
}

export async function verifyCloudPreferences() {
  const cloud = await client();
  if (!cloud.cloudConfigured())
    throw new Error("Serverless credentials unavailable");
  const result = await cloud.callCloudPreferences("health");
  if (result?.ok !== true) throw new Error("Preference storage unavailable");
  return true;
}
