import { db } from "./db";
import { challengeCatalog } from "./challengeCatalog";
export type CustomChallengeTrophy = {
  id: string;
  icon: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
};
/** Read only server-simulated results; client profile JSON cannot award a custom trophy. */
export async function customChallengeAchievements(
  userId: string,
): Promise<CustomChallengeTrophy[]> {
  const runs = await db.gameRun.findMany({
    where: {
      userId,
      completed: true,
      challengeIssueId: { startsWith: "custom-" },
    },
    select: { challengeIssueId: true, seasonResultJson: true },
  });
  if (!runs.length) return [];
  const catalog = new Map((await challengeCatalog()).map((i) => [i.id, i]));
  const earned = new Map<string, CustomChallengeTrophy>();
  for (const run of runs) {
    if (!run.challengeIssueId || earned.has(run.challengeIssueId)) continue;
    try {
      const result = JSON.parse(run.seasonResultJson || "{}");
      const trophy = Array.isArray(result.trophies)
        ? result.trophies.find(
            (t: { id?: string; earned?: boolean }) =>
              t.id === run.challengeIssueId && t.earned === true,
          )
        : null;
      const issue = catalog.get(run.challengeIssueId);
      if (!trophy || !issue) continue;
      earned.set(issue.id, {
        id: issue.id,
        icon: issue.achievementIcon || "🏆",
        name: issue.achievementTitleRu || trophy.name || issue.titleRu,
        nameEn: issue.achievementTitleEn || issue.titleEn,
        desc:
          issue.achievementDescriptionRu ||
          trophy.description ||
          issue.descriptionRu,
        descEn: issue.achievementDescriptionEn || issue.descriptionEn,
      });
    } catch {
      /* A malformed old snapshot cannot award a trophy. */
    }
  }
  return [...earned.values()];
}
