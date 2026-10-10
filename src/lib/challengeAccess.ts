import { db } from '@/lib/db';
import { archiveUnlockedUntil } from '@/lib/weeklyChallenges';

/** Authenticated referrals unlock all past issues for 24 hours from attribution. */
export async function getArchiveAccess(userId: string | null, now: Date = new Date()) {
  if (!userId) return { unlockedUntil: null as string | null, referralCount: 0 };
  const user = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (!user?.referralCode) return { unlockedUntil: null, referralCount: 0 };
  const referrals = await db.user.findMany({
    where: { referredBy: user.referralCode },
    select: { referralJoinedAt: true, createdAt: true },
  });
  return { unlockedUntil: archiveUnlockedUntil(referrals, now), referralCount: referrals.length };
}
