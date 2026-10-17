import { db } from './db';
import { challengeWeekIndex, issuesForWeek, currentChallengeWindow } from './weeklyChallenges';
import type { WeeklyChallenge } from './weeklyChallenges';
import { challengeStatus, type ChallengeVisibility } from './challengeStatus';
export type { ChallengeVisibility } from './challengeStatus';
export async function challengeCatalog(now = new Date()) {
  const catalog = Array.from({ length: challengeWeekIndex(now)+2 }, (_, i) => issuesForWeek(i)).flat();
  const settings = await db.appSetting.findMany({ where: { OR:[{key:{startsWith:'challenge-visibility:'}},{key:{startsWith:'challenge-config:'}}] } });
  const values = new Map(settings.map(item=>[item.key,item.value]));
  return catalog.map(original=>{
    let patch: Partial<WeeklyChallenge> = {};
    try { patch=JSON.parse(values.get(`challenge-config:${original.id}`)||'{}'); } catch {}
    const issue={...original,...patch,id:original.id,mode:original.mode,hero:original.hero,
      visibility:(values.get(`challenge-visibility:${original.id}`)||'auto') as ChallengeVisibility};
    for (const key of ['matchLimit','maximumConceded','minimumCleanSheets'] as const) if (issue[key] === null) issue[key] = undefined;
    const status=challengeStatus(issue,now);
    return {...issue,status,forceOpen:issue.visibility==='open'&&status==='active'};
  });
}
export async function visibleChallenges(now = new Date()) {
  const catalog=await challengeCatalog(now);
  return { active:catalog.filter(i=>i.status==='active'),archive:catalog.filter(i=>i.status==='archived').reverse(),nextReleaseAt:currentChallengeWindow(now).endsAt };
}
export async function visibleChallenge(id:string,now=new Date()) {
  const issue=(await challengeCatalog(now)).find(i=>i.id===id);
  return issue&&(issue.status==='active'||issue.status==='archived')?issue:null;
}
