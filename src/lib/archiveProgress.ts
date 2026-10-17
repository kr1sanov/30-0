export const ARCHIVE_SEASONS = 5;
export const ARCHIVE_MODES = 2;
export const ARCHIVE_DURATION_MS = 3 * 86400000;
export function archiveProgress(runs: Array<{ mode: string; completedAt: Date }>, now = new Date()) {
  let batch = 0, modes = new Set<string>(), grant = 0;
  for (const run of [...runs].sort((a,b)=>+a.completedAt-+b.completedAt)) {
    if (+run.completedAt > +now) continue;
    batch++; modes.add(run.mode);
    if (batch >= ARCHIVE_SEASONS && modes.size >= ARCHIVE_MODES) { grant = +run.completedAt; batch=0; modes=new Set(); }
  }
  const unlockedUntil = grant && grant+ARCHIVE_DURATION_MS > +now ? new Date(grant+ARCHIVE_DURATION_MS).toISOString() : null;
  return { unlockedUntil, completedSeasons: unlockedUntil ? ARCHIVE_SEASONS : Math.min(batch,ARCHIVE_SEASONS), distinctModes: unlockedUntil ? ARCHIVE_MODES : modes.size, requiredSeasons: ARCHIVE_SEASONS, requiredModes: ARCHIVE_MODES };
}
