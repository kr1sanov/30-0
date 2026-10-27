import { db } from '@/lib/db';

export async function purgeExpiredProfiles(identity: { id?: string; providerId?: string } = {}) {
  const expired = await db.user.findMany({
    where: { ...identity, deleteAfterAt: { lte: new Date() } },
    select: { id: true, referralCode: true, referredBy: true },
    orderBy: [{ deleteAfterAt: 'asc' }, { id: 'asc' }],
    take: 50,
  });
  let deleted = 0;
  for (const user of expired) {
    const removed = await db.$transaction(async tx => {
      // A restoration may have happened since the list was read.
      const due = await tx.user.findFirst({ where: { id: user.id, deleteAfterAt: { lte: new Date() } } });
      if (!due) return false;
      await tx.gameRun.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
      if (user.referredBy) await tx.user.updateMany({ where: { referralCode: user.referredBy, referralCount: { gt: 0 } }, data: { referralCount: { decrement: 1 } } });
      if (user.referralCode) await tx.user.updateMany({ where: { referredBy: user.referralCode }, data: { referredBy: null } });
      return true;
    });
    if (removed) deleted++;
  }
  return deleted;
}
