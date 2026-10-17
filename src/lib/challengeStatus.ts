export type ChallengeVisibility = 'auto' | 'open' | 'hidden' | 'archived';
export function challengeStatus(issue: { visibility: ChallengeVisibility; startsAt: string; endsAt: string }, now = new Date()) {
  if (issue.visibility === 'hidden') return 'hidden';
  if (issue.visibility === 'archived' || Date.parse(issue.endsAt) <= +now) return 'archived';
  return issue.visibility === 'open' || Date.parse(issue.startsAt) <= +now ? 'active' : 'scheduled';
}
