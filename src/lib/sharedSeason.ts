import { db } from '@/lib/db';

export async function sharedSeason(runId: string) {
  if (!/^c[a-z0-9]{15,40}$/.test(runId)) return null;
  return db.gameRun.findFirst({
    where: { id: runId, completed: true, userId: { not: null } },
    select: { id: true, formation: true, teamName: true, clubFilter: true, wins: true, draws: true, losses: true, points: true, position: true, goalsFor: true, goalsAgainst: true },
  });
}

export function seasonCaption(run: NonNullable<Awaited<ReturnType<typeof sharedSeason>>>) {
  return `30-0 · ${run.teamName || run.clubFilter || 'РПЛ'} · ${run.formation}: ${run.points ?? 0} очков, ${run.position ?? '—'} место · ${run.wins ?? 0}В ${run.draws ?? 0}Н ${run.losses ?? 0}П · голы ${run.goalsFor ?? 0}:${run.goalsAgainst ?? 0}`;
}
