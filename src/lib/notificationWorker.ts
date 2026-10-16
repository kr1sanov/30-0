import { db } from "./db";
import { queueSeasonResult } from "./seasonResultNotification";
import { syncCloudPreferences, usesNotificationRelay } from "./cloudPreferences";
import { runNotificationSchedule } from "./notificationScheduler";
import { flushSocialNotifications } from "./socialNotifications";
let busy = false;
export async function notificationWorker() {
  if (busy) return;
  busy = true;
  try {
    if (!await usesNotificationRelay()) await syncCloudPreferences().catch(() => console.error("Preference synchronization deferred"));
    await runNotificationSchedule();
    const runs = await db.gameRun.findMany({
      where: {
        completed: true,
        completedAt: { gte: new Date(Date.now() - 86400000) },
      },
      orderBy: { completedAt: "desc" },
      take: 100,
    });
    for (const run of runs) await queueSeasonResult(run.id).catch(() => console.error("Result image deferred for retry"));
    await flushSocialNotifications();
  } finally {
    busy = false;
  }
}
