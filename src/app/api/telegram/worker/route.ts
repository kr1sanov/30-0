import { timingSafeEqual } from "node:crypto";
import { workerSecret, verifyCloudPreferences } from "@/lib/cloudPreferences";
import { notificationWorker } from "@/lib/notificationWorker";
export async function POST(request: Request) {
  const secret = workerSecret(),
    supplied = request.headers.get("X-30-0-Worker") || "";
  if (
    !secret ||
    secret.length !== supplied.length ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
  )
    return Response.json({ error: "Access denied" }, { status: 401 });
  try {
    await notificationWorker();
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Worker temporarily unavailable" },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  const secret = workerSecret(),
    supplied = request.headers.get("X-30-0-Worker") || "";
  if (
    !secret ||
    secret.length !== supplied.length ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
  )
    return Response.json({ error: "Access denied" }, { status: 401 });
  try {
    await verifyCloudPreferences();
    return Response.json({ ok: true, preferencesStorage: "available" });
  } catch {
    return Response.json(
      { error: "Preference service unavailable" },
      { status: 503 },
    );
  }
}
