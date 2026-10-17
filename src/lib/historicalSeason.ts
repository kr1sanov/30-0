/** Stable across retries; every eligible imported league can be selected. */
export function selectHistoricalSeason<T extends { startYear: number }>(seasons: T[], runId: string, requested?: number | null): T | undefined {
  const sorted = [...seasons].sort((a, b) => a.startYear - b.startYear);
  if (requested != null) return sorted.find(s => s.startYear === requested);
  let seed = 2166136261;
  for (const c of runId) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  return sorted.length ? sorted[seed % sorted.length] : undefined;
}
