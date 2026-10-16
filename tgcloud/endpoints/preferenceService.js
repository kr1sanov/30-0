import { db, fetch } from "sdk";
import { botPreferences } from "../schema.js";
import {
  normalize,
  ensurePreferences,
  changePreferences,
} from "../lib/preferences.js";
import { bridgeSecret } from "../lib/config.js";
import { eq, and, gt, asc } from "sdk/db";
export default async function preferenceService(input) {
  if (!bridgeSecret || input.secret !== bridgeSecret)
    throw new Error("Unauthorized");
  // Authenticated, fixed-destination bridge for the existing notification queue.
  // No caller-controlled URL or header is accepted.
  if (input.action === 'worker') {
    const body = input.body && typeof input.body === 'object' && !Array.isArray(input.body) ? input.body : {};
    if (body.action && !['patches','sync','recipients','claim','ack'].includes(body.action)) throw new Error('Invalid worker action');
    const response = await fetch('https://30-0.xn--p1ai/api/telegram/worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-30-0-Worker': bridgeSecret },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Worker bridge HTTP ' + response.status);
    return response.json();
  }
  const record = (row) =>
    row
      ? {
          tgId: row.tgId,
          user: JSON.parse(row.userJson),
          preferences: normalize(row.prefsJson),
          language: JSON.parse(row.prefsJson || "{}").language || "ru",
          revision: row.revision,
          started: Boolean(row.started),
        }
      : null;
  if (input.action === "health")
    return { ok: true, count: await db.$count(botPreferences) };
  if (input.action === "pending")
    return (
      await db
        .select()
        .from(botPreferences)
        .where(gt(botPreferences.revision, botPreferences.syncedRevision))
        .orderBy(asc(botPreferences.tgId))
        .limit(100)
        .all()
    ).map(record);
  if (input.action === "ackMany") {
    if (!Array.isArray(input.items) || input.items.length > 100)
      throw new Error("Invalid batch");
    for (const item of input.items) {
      await db
        .update(botPreferences)
        .set({ syncedRevision: item.revision })
        .where(
          and(
            eq(botPreferences.tgId, item.tgId),
            eq(botPreferences.revision, item.revision),
          ),
        )
        .run();
    }
    return { ok: true };
  }
  const tgId = Number(input.tgId);
  if (!Number.isSafeInteger(tgId) || tgId <= 0) throw new Error("Invalid user");
  if (input.action === "get")
    return record(await ensurePreferences(tgId, input.seed));
  if (input.action === "set")
    return record(await changePreferences(tgId, input.patch));
  if (input.action === "ack") {
    await db
      .update(botPreferences)
      .set({ syncedRevision: input.revision })
      .where(
        and(
          eq(botPreferences.tgId, tgId),
          eq(botPreferences.revision, input.revision),
        ),
      )
      .run();
    return { ok: true };
  }
  throw new Error("Invalid action");
}
