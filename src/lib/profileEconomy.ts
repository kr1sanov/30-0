import { db } from '@/lib/db';

export const AVATARS = [
  { key: 'ball', emoji: '⚽', ru: 'Мяч', en: 'Ball', price: 0 },
  { key: 'cup', emoji: '🏆', ru: 'Кубок', en: 'Cup', price: 0 },
  { key: 'glove', emoji: '🧤', ru: 'Перчатка', en: 'Glove', price: 0 },
  { key: 'boots', emoji: '🥾', ru: 'Бутсы', en: 'Boots', price: 40 },
  { key: 'stadium', emoji: '🏟️', ru: 'Стадион', en: 'Stadium', price: 40 },
  { key: 'whistle', emoji: '🪈', ru: 'Свисток', en: 'Whistle', price: 40 },
  { key: 'medal', emoji: '🥇', ru: 'Золото', en: 'Gold', price: 60 },
  { key: 'eagle', emoji: '🦅', ru: 'Орёл', en: 'Eagle', price: 60 },
  { key: 'lion', emoji: '🦁', ru: 'Лев', en: 'Lion', price: 60 },
  { key: 'rocket', emoji: '🚀', ru: 'Ракета', en: 'Rocket', price: 80 },
  { key: 'crown', emoji: '👑', ru: 'Корона', en: 'Crown', price: 80 },
  { key: 'fire', emoji: '🔥', ru: 'Огонь', en: 'Fire', price: 80 },
  { key: 'diamond', emoji: '💎', ru: 'Бриллиант', en: 'Diamond', price: 100 },
] as const;
export const STYLES = [
  { key: 'classic', ru: 'Классика', en: 'Classic', price: 0 },
  { key: 'pitch', ru: 'Газон', en: 'Pitch', price: 60 },
  { key: 'night', ru: 'Ночной матч', en: 'Night match', price: 80 },
  { key: 'gold', ru: 'Золотой сезон', en: 'Golden season', price: 100 },
] as const;

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
