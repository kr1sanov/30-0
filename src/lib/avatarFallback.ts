const COLORS = [
  ['#0f766e', '#064e3b'], ['#2563eb', '#1e3a8a'], ['#7c3aed', '#4c1d95'],
  ['#be123c', '#881337'], ['#c2410c', '#7c2d12'], ['#0369a1', '#0c4a6e'],
] as const;

/** Stable built-in avatar, available immediately without any network request. */
export function avatarFallback(identity: string) {
  let hash = 0;
  for (const char of identity) hash = (Math.imul(hash, 31) + char.codePointAt(0)!) >>> 0;
  const [primary, secondary] = COLORS[hash % COLORS.length];
  return { primary, secondary };
}
