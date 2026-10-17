export const retentionDays = [3, 7, 10, 30] as const;
export function retentionDay(cadence: string): number | null {
  const day = Number(/^return_(3|7|10|30)$/.exec(cadence)?.[1]);
  return day || null;
}
/** Only the most recent due stage, once per inactivity period. */
export function retentionDue(cadence: string, activity: Date, now: Date) {
  const day = retentionDay(cadence);
  if (!day) return false;
  const elapsed = (now.getTime() - activity.getTime()) / 86400000;
  const next = retentionDays.find(d => d > day) ?? 37;
  return elapsed >= day && elapsed < next;
}
export function retentionKey(campaignId: string, userId: string, activity: Date) {
  return `${campaignId}:inactive:${userId}:${activity.getTime()}`;
}
