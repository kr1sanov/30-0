import { db } from '@/lib/db';

import { AVATARS, STYLES } from './profileCatalog';
export { AVATARS, STYLES } from './profileCatalog';

export { seasonReward } from './tokenRules';

export async function awardRun(runId: string, userId: string | null, amount: number) {
  if (!userId || amount <= 0) return;
  try { await db.$transaction(async tx => {
    const existing = await tx.tokenEntry.findUnique({ where: { runId } });
    if (existing) return;
    const run = await tx.gameRun.findUnique({ where: { id: runId }, select: { completed: true, userId: true, position: true } });
    if (!run?.completed || run.userId !== userId || run.position !== 1) return;
    await tx.tokenEntry.create({ data: { userId, runId, amount, reason: 'season_win' } });
    await tx.user.update({ where: { id: userId }, data: { tokenBalance: { increment: amount } } });
  }); } catch (error) {
    // A concurrent request may already have inserted this unique run reward.
    const existing = await db.tokenEntry.findUnique({ where: { runId } });
    if (!existing) throw error;
  }
}
