export function activeRestriction(
  user: {
    bannedAt?: Date | null;
    bannedUntil?: Date | null;
    banReason?: string | null;
  },
  now = new Date(),
) {
  return user.bannedAt && (!user.bannedUntil || user.bannedUntil > now)
    ? {
        reason: user.banReason || "Violation of project rules",
        until: user.bannedUntil?.toISOString() || null,
      }
    : null;
}
