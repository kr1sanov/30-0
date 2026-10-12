export function playerPath(player: { id: string; username?: string | null }) {
  return `/players/${encodeURIComponent(player.username?.replace(/^@/, '') || player.id)}`;
}

export const AVATAR_COLORS = ['#00C896', '#2563EB', '#7C3AED', '#E11D48', '#F97316', '#D4A017', '#0F766E', '#334155'] as const;
export const STATUS_EMOJIS = ['🏆', '⚽', '🔥', '💚', '⭐', '🧤', '🎯', '👑'] as const;
