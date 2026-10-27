import { secretsMatch } from '@/lib/secretComparison';
import {
  workerSecret,
  verifyCloudPreferences,
  cloudErrorReason,
} from "@/lib/cloudPreferences";
import { notificationWorker } from "@/lib/notificationWorker";
import { relayAction } from '@/lib/notificationRelay';
export async function POST(request: Request) {
  const secret = workerSecret(),
    supplied = request.headers.get("X-30-0-Worker") || "";
  if (
    !secretsMatch(secret, supplied)
  )
    return Response.json({ error: "Access denied" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action) return Response.json(await relayAction(body));
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
    !secretsMatch(secret, supplied)
  )
    return Response.json({ error: "Access denied" }, { status: 401 });
  try {
    await verifyCloudPreferences();
    return Response.json({ ok: true, preferencesStorage: "available" });
  } catch (error) {
    return Response.json(
      {
        error: "Preference service unavailable",
        reason: cloudErrorReason(error),
      },
      { status: 503 },
    );
  }
}
