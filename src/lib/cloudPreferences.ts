import { db } from "@/lib/db";
import {
  preferencesFromUser,
  preferenceData,
  type NotificationPreferences,
} from "./notificationPreferences";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { createHash } from "node:crypto";
// Kept outside the standalone bundle so the same audited sources run on Telegram.
function applicationRoot() {
  if (process.env.RPL_APP_ROOT) return process.env.RPL_APP_ROOT;
  return existsSync(join(process.cwd(), "scripts/telegram-cloud-client.mjs"))
    ? process.cwd()
    : join(process.cwd(), "../..");
}
async function client() {
  const file = join(applicationRoot(), "scripts/telegram-cloud-client.mjs");
  const revision = statSync(file).mtimeMs;
  return import(/* webpackIgnore: true */ `${file}?revision=${revision}`);
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
  // Jino cannot reach the cloud endpoint. The authenticated external relay
  // synchronizes this durable mirror in both directions.
  if (patch) {
    await db.$transaction(async tx => {
      const latest = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const pending = JSON.parse(latest.pendingNotificationPatch || '{}');
      await tx.user.update({ where: { id: userId }, data: {
        ...preferenceData({ ...preferencesFromUser(latest), ...patch }),
        pendingNotificationPatch: JSON.stringify({ ...pending, ...patch }),
      } });
    });
  }
  return preferencesFromUser(await db.user.findUniqueOrThrow({ where: { id: userId } }));
}
export async function usesNotificationRelay() { return (await client()).cloudConfigured(); }

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
  let file: Record<string, string | undefined> = {};
  try {
    file = parseEnv(readFileSync(join(applicationRoot(), ".env"), "utf8"));
  } catch {}
  const token = file.TGCLOUD_TOKEN || process.env.TGCLOUD_TOKEN;
  return (
    file.TELEGRAM_SERVERLESS_BRIDGE_SECRET ||
    process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET ||
    (token
      ? createHash("sha256")
          .update("30-0 bridge:" + token)
          .digest("hex")
      : process.env.TELEGRAM_WEBHOOK_SECRET)
  );
}
export function cloudErrorReason(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (
    [
      "configuration",
      "source_unavailable",
      "identity_mismatch",
      "cloud_execution_error",
      "invalid_response",
      "network_unavailable",
    ].includes(code) ||
    /^cloud_http_\d{3}$/.test(code)
  )
    return code;
  if (["ERR_MODULE_NOT_FOUND", "ENOENT"].includes(code))
    return "source_unavailable";
  return "unavailable";
}

export async function verifyCloudPreferences() {
  const cloud = await client();
  if (!cloud.cloudConfigured())
    throw Object.assign(new Error("Serverless credentials unavailable"), {
      code: "configuration",
    });
  const result = await cloud.callCloudPreferences("health");
  if (result?.ok !== true) throw new Error("Preference storage unavailable");
  return true;
}

/** Bot language is independent from either browser interface language. */
export async function currentBotLanguage(userId: string): Promise<'ru' | 'en'> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { botLanguage: true } });
  return user.botLanguage === 'en' ? 'en' : 'ru';
}
