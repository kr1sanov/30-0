import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
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
export function selectCloudConfig(file = {}, env = process.env) {
  return {
    token: file.TGCLOUD_TOKEN || env.TGCLOUD_TOKEN || "",
    clientId: file.TELEGRAM_CLIENT_ID || env.TELEGRAM_CLIENT_ID || "8197702906",
    bridge:
      file.TELEGRAM_SERVERLESS_BRIDGE_SECRET ||
      env.TELEGRAM_SERVERLESS_BRIDGE_SECRET ||
      "",
  };
}
function config() {
  let file = {};
  try {
    file = parseEnv(readFileSync(join(root, ".env"), "utf8"));
  } catch {}
  return selectCloudConfig(file);
}
export function cloudConfigured() {
  return /^app\d+:[A-Za-z0-9_-]+$/.test(config().token.trim());
}
function unavailable(code) {
  const error = new Error("Serverless preference service unavailable");
  error.code = code;
  return error;
}
export async function callCloudPreferences(action, args = {}) {
  const settings = config(),
    token = settings.token.trim();
  if (!/^app\d+:[A-Za-z0-9_-]+$/.test(token))
    throw unavailable("configuration");
  const app = token.split(":")[0];
  if (app !== `app${settings.clientId}`) throw unavailable("identity_mismatch");
  const secret =
    settings.bridge ||
    createHash("sha256")
      .update("30-0 bridge:" + settings.token)
      .digest("hex");
  if (!sources) {
    try {
      sources = Object.fromEntries(
        await Promise.all(
          Object.entries(files).map(async ([name, file]) => [
            name,
            await readFile(join(root, file), "utf8"),
          ]),
        ),
      );
    } catch {
      throw unavailable("source_unavailable");
    }
  }
  let response;
  try {
    response = await fetch(`https://cloud.telegram.org/${app}/manage/run`, {
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
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw unavailable("network_unavailable");
  }
  const envelope = await response.json().catch(() => null);
  if (!response.ok) throw unavailable(`cloud_http_${response.status}`);
  if (envelope?.ok !== true) throw unavailable("cloud_execution_error");
  if (!envelope.result || !Object.hasOwn(envelope.result, "result"))
    throw unavailable("invalid_response");
  return envelope.result.result;
}
