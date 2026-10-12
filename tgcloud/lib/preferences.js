import { db } from "sdk";
import { botPreferences } from "../schema.js";
import { eq, and } from "sdk/db";
export const defaults = {
  enabled: true,
  news: false,
  invitations: true,
  results: true,
  friends: true,
  friend_updates: true,
};
export function normalize(text) {
  let parsed = {};
  try {
    parsed = JSON.parse(text || "{}") || {};
  } catch {}
  return Object.fromEntries(
    Object.entries(defaults).map(([key, val]) => [
      key,
      typeof parsed[key] === "boolean" ? parsed[key] : val,
    ]),
  );
}
export async function ensurePreferences(tgId, seed = defaults) {
  await db
    .insert(botPreferences)
    .values({
      tgId,
      prefsJson: JSON.stringify(
        Object.fromEntries(
          Object.entries(defaults).map(([key, value]) => [
            key,
            typeof seed?.[key] === "boolean" ? seed[key] : value,
          ]),
        ),
      ),
    })
    .onConflictDoNothing()
    .run();
  return db
    .select()
    .from(botPreferences)
    .where(eq(botPreferences.tgId, tgId))
    .get();
}
export async function changePreferences(tgId, patch, user = null) {
  if (!Number.isSafeInteger(tgId) || tgId <= 0)
    throw new Error("Invalid Telegram user");
  for (let attempt = 0; attempt < 5; attempt++) {
    const previous = await ensurePreferences(tgId);
    const prefs = normalize(previous.prefsJson);
    for (const [key, value] of Object.entries(patch || {})) {
      if (
        !Object.hasOwn(defaults, key) ||
        ![true, false, "toggle"].includes(value)
      )
        throw new Error("Invalid preference");
      prefs[key] = value === "toggle" ? !prefs[key] : value;
    }
    const rows = await db
      .update(botPreferences)
      .set({
        prefsJson: JSON.stringify(prefs),
        revision: previous.revision + 1,
        ...(user
          ? {
              userJson: JSON.stringify({
                id: tgId,
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                username: user.username || "",
                language_code: user.language_code || "ru",
              }),
              started: 1,
            }
          : {}),
      })
      .where(
        and(
          eq(botPreferences.tgId, tgId),
          eq(botPreferences.revision, previous.revision),
        ),
      )
      .returning()
      .run();
    if (rows.length) return rows[0];
  }
  throw new Error("Preferences changed concurrently. Try again.");
}
