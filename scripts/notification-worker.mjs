import { createHash } from "node:crypto";
const secret =
  process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET ||
  (process.env.TGCLOUD_TOKEN
    ? createHash("sha256")
        .update("30-0 bridge:" + process.env.TGCLOUD_TOKEN)
        .digest("hex")
    : process.env.TELEGRAM_WEBHOOK_SECRET);
if (secret) {
  try {
    const res = await fetch(
      new URL(
        "/api/telegram/worker",
        process.env.NEXT_PUBLIC_BASE_URL || "https://30-0.xn--p1ai",
      ),
      {
        method: "POST",
        headers: { "X-30-0-Worker": secret },
        signal: AbortSignal.timeout(50000),
      },
    );
    if (!res.ok) process.exitCode = 1;
  } catch {
    process.exitCode = 1;
  }
}
