import { db } from '@/lib/db';

export async function purgeExpiredProfiles() {
  const expired = await db.user.findMany({
    where: { deleteAfterAt: { lte: new Date() } },
    select: { id: true, referralCode: true, referredBy: true },
    take: 50,
  });
  for (const user of expired) {
    await db.$transaction(async tx => {
      // A restoration may have happened since the list was read.
      const due = await tx.user.findFirst({ where: { id: user.id, deleteAfterAt: { lte: new Date() } } });
      if (!due) return;
      await tx.gameRun.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
      if (user.referredBy) await tx.user.updateMany({ where: { referralCode: user.referredBy, referralCount: { gt: 0 } }, data: { referralCount: { decrement: 1 } } });
      if (user.referralCode) await tx.user.updateMany({ where: { referredBy: user.referralCode }, data: { referredBy: null } });
    });
  }
  return expired.length;
}
