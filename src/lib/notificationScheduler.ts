import { retentionDay, retentionDue, retentionKey } from './retention';
import { ensureRetentionCampaigns } from './retentionCampaigns';
import { db } from "@/lib/db";
import { campaignPeriod, escapeHtml } from "./campaignContent";
import type { NotificationCampaign } from "@prisma/client";
export async function queueCampaign(
  campaign: NotificationCampaign,
  key: string,
  userId?: string,
) {
  await db.campaignJob.upsert({
    where: { id: key },
    create: {
      id: key,
      campaignId: campaign.id,
      payloadJson: JSON.stringify({ ...campaign, userId }),
    },
    update: {},
  });
}
export async function runNotificationSchedule(now = new Date()) {
  await ensureRetentionCampaigns();
  const campaigns = await db.notificationCampaign.findMany({
    where: { enabled: true, archivedAt: null },
  });
  for (const c of campaigns) {
    const day = retentionDay(c.cadence);
    if (day && now.getUTCHours() >= 9 && now.getUTCHours() < 18) {
      const users = await db.user.findMany({ where: { telegramChatStarted: true, telegramNotificationsEnabled: true, notifyNews: true, deleteAfterAt: null,
        OR: [{ lastActiveAt: { lte: new Date(+now - day * 86400000), gt: new Date(+now - (day === 3 ? 7 : day === 7 ? 10 : day === 10 ? 30 : 37) * 86400000) } },
          { lastActiveAt: null, createdAt: { lte: new Date(+now - day * 86400000), gt: new Date(+now - (day === 3 ? 7 : day === 7 ? 10 : day === 10 ? 30 : 37) * 86400000) } }] },
        select: { id: true, lastActiveAt: true, createdAt: true } });
      for (const user of users) await queueCampaign(c, retentionKey(c.id, user.id, user.lastActiveAt ?? user.createdAt), user.id);
    }
    const period = campaignPeriod(c.cadence, now, c.scheduledAt);
    if (period) await queueCampaign(c, `${c.id}:${period}`);
    if (["new_user", "season_complete", "perfect_season"].includes(c.cadence)) {
      if (c.cadence === "new_user") {
        const users = await db.user.findMany({
          where: { createdAt: { gte: c.updatedAt }, telegramChatStarted: true },
          orderBy: { createdAt: "desc" },
          take: 1000,
        });
        const existing = new Set(
          (
            await db.campaignJob.findMany({
              where: { id: { in: users.map((u) => `${c.id}:user:${u.id}`) } },
              select: { id: true },
            })
          ).map((j) => j.id),
        );
        for (const u of users)
          if (!existing.has(`${c.id}:user:${u.id}`))
            await queueCampaign(c, `${c.id}:user:${u.id}`, u.id);
      } else {
        const runs = await db.gameRun.findMany({
          where: {
            OR: [
              { completedAt: { gte: c.updatedAt } },
              { completedAt: null, createdAt: { gte: c.updatedAt } },
            ],
            completed: true,
            userId: { not: null },
            ...(c.cadence === "perfect_season" ? { wins: 30 } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 1000,
        });
        const existing = new Set(
          (
            await db.campaignJob.findMany({
              where: { id: { in: runs.map((run) => `${c.id}:run:${run.id}`) } },
              select: { id: true },
            })
          ).map((j) => j.id),
        );
        for (const run of runs)
          if (!existing.has(`${c.id}:run:${run.id}`))
            await queueCampaign(c, `${c.id}:run:${run.id}`, run.userId!);
      }
    }
  }
  const jobs = await db.campaignJob.findMany({
    where: { completedAt: null },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  for (const job of jobs) {
    const c = JSON.parse(job.payloadJson) as NotificationCampaign & {
      userId?: string;
    };
    const current = await db.notificationCampaign.findUnique({ where: { id: c.id } });
    if (!current || current.archivedAt || (!current.enabled && !job.id.includes(':manual:'))) {
      await db.campaignJob.update({ where: { id: job.id }, data: { completedAt: now } }); continue;
    }
    const users = await db.user.findMany({
      where: {
        provider: "telegram",
        telegramNotificationsEnabled: true,
        telegramChatStarted: true,
        notifyNews: true,
        deleteAfterAt: null,
        createdAt: { lte: job.createdAt },
        ...(c.userId
          ? { id: c.userId }
          : job.cursor
            ? { id: { gt: job.cursor } }
            : {}),
        ...(c.cadence === "return"
          ? { lastActiveAt: { lt: new Date(now.getTime() - 7 * 86400000) } }
          : {}),
      },
      orderBy: { id: "asc" },
      take: 50,
    });
    await db.$transaction(async (tx) => {
      for (const user of users) {
        if (retentionDay(c.cadence) && (!retentionDue(c.cadence, user.lastActiveAt ?? user.createdAt, now) || job.id !== retentionKey(c.id, user.id, user.lastActiveAt ?? user.createdAt))) continue;
        const vars: Record<string, string> = {
          name: user.displayName,
          username: user.username ? `@${user.username}` : user.displayName,
        };
        const message = c.message.replace(
          /\{\{(name|username)\}\}/g,
          (_, key) => escapeHtml(vars[key]),
        );
        const text = `<b>${escapeHtml(c.title)}</b>\n\n${c.format === "html" ? message : escapeHtml(c.message).replace(/\{\{(name|username)\}\}/g, (_, key) => escapeHtml(vars[key]))}`;
        const textEn = c.titleEn && c.messageEn
          ? `<b>${escapeHtml(c.titleEn)}</b>\n\n${(c.format === "html" ? c.messageEn : escapeHtml(c.messageEn)).replace(/\{\{(name|username)\}\}/g, (_, key) => escapeHtml(vars[key]))}`
          : null;
        const eventKey = `campaign:${job.id}:${user.id}`;
        await tx.telegramOutbox.upsert({
          where: { eventKey },
          create: {
            eventKey,
            userId: user.id,
            text,
            textEn,
            buttonTextEn: c.buttonTextEn,
            startParam: "",
            category: "news",
            campaignId: c.id,
            imageId: c.imageId,
            buttonText: c.buttonText,
            buttonUrl: c.buttonUrl,
          },
          update: {},
        });
      }
      await tx.campaignJob.update({
        where: { id: job.id },
        data:
          users.length === 50 && !c.userId
            ? { cursor: users.at(-1)!.id }
            : { completedAt: now },
      });
    });
  }
}

export async function queueTriggeredCampaigns(
  event: "new_user" | "season_complete",
  userId: string,
  eventId: string,
  eventAt: Date,
  wins = 0,
) {
  const campaigns = await db.notificationCampaign.findMany({
    where: {
      enabled: true,
      archivedAt: null,
      updatedAt: { lte: eventAt },
      cadence: {
        in:
          event === "new_user"
            ? ["new_user"]
            : ["season_complete", ...(wins === 30 ? ["perfect_season"] : [])],
      },
    },
  });
  for (const c of campaigns)
    await queueCampaign(
      c,
      `${c.id}:${event === "new_user" ? "user" : "run"}:${eventId}`,
      userId,
    );
}
