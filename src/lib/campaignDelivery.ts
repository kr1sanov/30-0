import { db } from './db';
import { retentionDay, retentionDue, retentionKey } from './retention';
export async function campaignStillRelevant(item: { campaignId: string | null; eventKey: string; userId: string }, now = new Date()) {
  if (!item.campaignId) return true;
  const campaign = await db.notificationCampaign.findUnique({ where: { id: item.campaignId } });
  if (!campaign || campaign.archivedAt || (!campaign.enabled && !item.eventKey.includes(':manual:'))) return false;
  if (!retentionDay(campaign.cadence)) return true;
  const user = await db.user.findUnique({ where: { id: item.userId } });
  if (!user) return false;
  const activity = user.lastActiveAt ?? user.createdAt;
  return retentionDue(campaign.cadence, activity, now) && item.eventKey === `campaign:${retentionKey(campaign.id, user.id, activity)}:${user.id}`;
}
