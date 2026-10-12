import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAdminWrite, requireAdmin } from "@/lib/adminAuth";
import { sameOrigin } from "@/lib/telegramSession";
import { campaignTriggers, validTelegramHtml } from "@/lib/campaignContent";
import { queueCampaign } from "@/lib/notificationScheduler";
export async function GET(request: Request) {
  if (!(await requireAdmin(request)))
    return NextResponse.json({ error: "Access denied" }, { status: 401 });
  const campaigns = await db.notificationCampaign.findMany({
    where: { archivedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  const counts = await db.telegramOutbox.groupBy({
    by: ["campaignId", "status"],
    where: { campaignId: { in: campaigns.map((c) => c.id) } },
    _count: { id: true },
  });
  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      ...c,
      stats: Object.fromEntries(
        counts
          .filter((g) => g.campaignId === c.id)
          .map((g) => [g.status, g._count.id]),
      ),
    })),
  });
}
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin || !canAdminWrite(admin.role, "campaigns") || !sameOrigin(request))
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  try {
    const b = await request.json();
    if (b.action === "retry") {
      if (typeof b.id !== "string")
        return NextResponse.json(
          { error: "Campaign required" },
          { status: 400 },
        );
      await db.telegramOutbox.updateMany({
        where: { campaignId: b.id, status: "failed" },
        data: {
          status: "pending",
          attempts: 0,
          availableAt: new Date(),
          lastError: null,
        },
      });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "send") {
      if (typeof b.id !== "string")
        return NextResponse.json(
          { error: "Campaign required" },
          { status: 400 },
        );
      const c = await db.notificationCampaign.findUnique({
        where: { id: b.id },
      });
      if (!c || c.archivedAt)
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 },
        );
      const key =
        typeof b.requestId === "string" &&
        /^[a-zA-Z0-9-]{16,64}$/.test(b.requestId)
          ? b.requestId
          : null;
      if (!key)
        return NextResponse.json(
          { error: "Request identifier required" },
          { status: 400 },
        );
      await queueCampaign(c, `${c.id}:manual:${key}`);
      return NextResponse.json({ queued: true });
    }
    const title = typeof b.title === "string" ? b.title.trim() : "",
      message = typeof b.message === "string" ? b.message.trim() : "",
      cadence = String(b.cadence || "manual"),
      format = b.format === "html" ? "html" : "text",
      buttonText = String(b.buttonText || "Play").trim(),
      buttonUrl = String(b.buttonUrl || "https://t.me/RPL30_bot?startapp");
    const scheduledAt = b.scheduledAt ? new Date(b.scheduledAt) : null;
    if (
      title.length < 2 ||
      title.length > 120 ||
      message.length < 2 ||
      message.length > (b.imageId ? 800 : 3500) ||
      !campaignTriggers.includes(cadence) ||
      (format === "html" && !validTelegramHtml(message)) ||
      buttonText.length < 1 ||
      buttonText.length > 40 ||
      !/^https:\/\/[^\s<>"']+$/.test(buttonUrl) ||
      (cadence === "scheduled" &&
        (!scheduledAt || !Number.isFinite(scheduledAt.getTime())))
    )
      return NextResponse.json(
        {
          error:
            "Check content, HTTPS link, HTML tags and schedule. Image posts allow 800 characters.",
        },
        { status: 400 },
      );
    if (
      b.imageId &&
      !(await db.mediaAsset.findUnique({ where: { id: String(b.imageId) } }))
    )
      return NextResponse.json({ error: "Image not found" }, { status: 400 });
    const data = {
      title,
      message,
      cadence,
      format,
      buttonText,
      buttonUrl,
      imageId: b.imageId ? String(b.imageId) : null,
      scheduledAt,
      enabled: b.enabled === true,
    };
    const campaign = b.id
      ? await db.notificationCampaign.update({
          where: { id: String(b.id) },
          data,
        })
      : await db.notificationCampaign.create({ data });
    return NextResponse.json({ campaign });
  } catch {
    return NextResponse.json(
      { error: "Could not save campaign" },
      { status: 500 },
    );
  }
}
export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin || !canAdminWrite(admin.role, "campaigns") || !sameOrigin(request))
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  try {
    const { id } = await request.json();
    await db.notificationCampaign.update({
      where: { id: String(id) },
      data: { enabled: false, archivedAt: new Date() },
    });
    await db.campaignJob.updateMany({
      where: { campaignId: String(id), completedAt: null },
      data: { completedAt: new Date() },
    });
    await db.telegramOutbox.updateMany({
      where: { campaignId: String(id), status: "pending" },
      data: { status: "cancelled", sentAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not archive campaign" },
      { status: 500 },
    );
  }
}
