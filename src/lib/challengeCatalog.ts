import { db } from './db';
import { challengeWeekIndex, issuesForWeek, findWeeklyChallenge, currentChallengeWindow } from './weeklyChallenges';
export type ChallengeVisibility = 'auto' | 'open' | 'hidden';
export async function challengeCatalog(now = new Date()) {
  const catalog = Array.from({ length: challengeWeekIndex(now)+2 }, (_, i) => issuesForWeek(i)).flat();
  const settings = await db.appSetting.findMany({ where: { key: { startsWith: 'challenge-visibility:' } } });
  const overrides = new Map(settings.map(item => [item.key.slice(21), item.value]));
  return catalog.map(issue => ({ ...issue, visibility: (overrides.get(issue.id) || 'auto') as ChallengeVisibility,
    forceOpen: overrides.get(issue.id) === 'open' }));
}
export async function visibleChallenges(now = new Date()) {
  const catalog = await challengeCatalog(now);
  const visible = catalog.filter(issue => issue.visibility !== 'hidden' && (issue.forceOpen || Date.parse(issue.startsAt) <= +now));
  return { active: visible.filter(issue => issue.forceOpen || Date.parse(issue.endsAt) > +now),
    archive: visible.filter(issue => !issue.forceOpen && Date.parse(issue.endsAt) <= +now).reverse(), nextReleaseAt: currentChallengeWindow(now).endsAt };
}
export async function visibleChallenge(id: string, now = new Date()) {
  const issue = (await challengeCatalog(now)).find(item => item.id === id);
  return issue && issue.visibility !== 'hidden' && (issue.forceOpen || findWeeklyChallenge(id, now)) ? issue : null;
}
