import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  schema: "tgcloud/schema.js",
  "lib/preferences": "tgcloud/lib/preferences.js",
  "endpoints/preferenceService": "tgcloud/endpoints/preferenceService.js",
};
let sources;
export function cloudConfigured() {
  return /^app\d+:[A-Za-z0-9_-]+$/.test(
    process.env.TGCLOUD_TOKEN?.trim() || "",
  );
}
export async function callCloudPreferences(action, args = {}) {
  const token = process.env.TGCLOUD_TOKEN?.trim();
  if (!cloudConfigured())
    throw new Error("Serverless credentials are not configured");
  const app = token.split(":")[0];
  if (app !== `app${process.env.TELEGRAM_CLIENT_ID || "8197702906"}`)
    throw new Error("Serverless bot identity mismatch");
  const secret =
    process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET ||
    createHash("sha256")
      .update("30-0 bridge:" + process.env.TGCLOUD_TOKEN)
      .digest("hex");
  if (!sources)
    sources = Object.fromEntries(
      await Promise.all(
        Object.entries(files).map(async ([name, file]) => [
          name,
          await readFile(join(root, file), "utf8"),
        ]),
      ),
    );
  const response = await fetch(`https://cloud.telegram.org/${app}/manage/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      module: "endpoints/preferenceService",
      sources: {
        ...sources,
        "lib/config": `export const bridgeSecret = ${JSON.stringify(secret)};`,
      },
      args: { ...args, action, secret },
      ctx: {},
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const envelope = await response.json().catch(() => null);
  if (!response.ok || envelope?.ok !== true)
    throw new Error("Serverless preference service unavailable");
  return envelope.result?.result;
}
