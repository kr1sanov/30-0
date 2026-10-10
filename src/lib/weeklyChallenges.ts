/** Weekly issues switch at 12:00 Saturday in Moscow (09:00 UTC). */
export const FIRST_CHALLENGE_RELEASE = Date.parse('2026-10-10T09:00:00.000Z');
export const CHALLENGE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const ARCHIVE_UNLOCK_MS = 24 * 60 * 60 * 1000;

type Hero = 'vagner' | 'dzyuba';
export type ChallengeMode = 'challenge_vagner' | 'challenge_dzyuba';
export interface WeeklyChallenge {
  id: string;
  mode: ChallengeMode;
  hero: Hero;
  startsAt: string;
  endsAt: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  minimumGoals: number;
  minimumPoints: number;
  unbeaten: boolean;
}

type Objective = Omit<WeeklyChallenge, 'id' | 'mode' | 'hero' | 'startsAt' | 'endsAt'>;
const vagner: Objective[] = [
  { titleRu: '❤️ Вагнер Лав · Легенда', titleEn: '❤️ Vagner Love · Legend', descriptionRu: 'Лучшая доступная карточка Вагнера уже в составе. Собери вокруг него команду и стань чемпионом.', descriptionEn: 'Vagner’s best available card starts in your XI. Build around him and win the league.', minimumGoals: 0, minimumPoints: 0, unbeaten: false },
  { titleRu: '❤️ Вагнер · Непобедимые', titleEn: '❤️ Vagner · Invincibles', descriptionRu: 'С Вагнером в атаке стань чемпионом без единого поражения.', descriptionEn: 'Lead Vagner’s attack to the title without a single defeat.', minimumGoals: 0, minimumPoints: 0, unbeaten: true },
  { titleRu: '❤️ Вагнер · Бразильская атака', titleEn: '❤️ Vagner · Brazilian Attack', descriptionRu: 'Собери команду вокруг Вагнера, стань чемпионом и забей не меньше 75 голов.', descriptionEn: 'Build around Vagner, win the league and score at least 75 goals.', minimumGoals: 75, minimumPoints: 0, unbeaten: false },
  { titleRu: '❤️ Вагнер · Золотой сезон', titleEn: '❤️ Vagner · Golden Season', descriptionRu: 'Проведи сезон с Вагнером, возьми титул и набери минимум 85 очков.', descriptionEn: 'Play with Vagner, take the title and earn at least 85 points.', minimumGoals: 0, minimumPoints: 85, unbeaten: false },
];
const dzyuba: Objective[] = [
  { titleRu: '🎯 Голевая эпоха', titleEn: '🎯 Goalscoring Era', descriptionRu: 'Лучшая доступная карточка Дзюбы уже в составе. Стань чемпионом и забей командой 60 голов.', descriptionEn: 'Dzyuba’s best available card starts in your XI. Win the league and score 60 team goals.', minimumGoals: 60, minimumPoints: 0, unbeaten: false },
  { titleRu: '🎯 Дзюба · Семьдесят голов', titleEn: '🎯 Dzyuba · Seventy Goals', descriptionRu: 'Собери атаку вокруг Дзюбы, стань чемпионом и забей 70 голов.', descriptionEn: 'Build an attack around Dzyuba, win the title and score 70 goals.', minimumGoals: 70, minimumPoints: 0, unbeaten: false },
  { titleRu: '🎯 Дзюба · Без поражений', titleEn: '🎯 Dzyuba · Undefeated', descriptionRu: 'С Дзюбой в составе выиграй лигу без поражений и забей минимум 60 голов.', descriptionEn: 'Win the league with Dzyuba, stay unbeaten and score at least 60 goals.', minimumGoals: 60, minimumPoints: 0, unbeaten: true },
  { titleRu: '🎯 Дзюба · Рекордная атака', titleEn: '🎯 Dzyuba · Record Attack', descriptionRu: 'Стань чемпионом с Дзюбой и забей командой 80 голов.', descriptionEn: 'Win the title with Dzyuba and score 80 team goals.', minimumGoals: 80, minimumPoints: 0, unbeaten: false },
];

export function challengeWeekIndex(now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - FIRST_CHALLENGE_RELEASE) / CHALLENGE_WEEK_MS));
}

export function currentChallengeWindow(now: Date = new Date()) {
  const start = FIRST_CHALLENGE_RELEASE + challengeWeekIndex(now) * CHALLENGE_WEEK_MS;
  return { startsAt: new Date(start).toISOString(), endsAt: new Date(start + CHALLENGE_WEEK_MS).toISOString() };
}

export function issuesForWeek(index: number): WeeklyChallenge[] {
  if (!Number.isInteger(index) || index < 0) return [];
  const start = FIRST_CHALLENGE_RELEASE + index * CHALLENGE_WEEK_MS;
  const startsAt = new Date(start).toISOString();
  const endsAt = new Date(start + CHALLENGE_WEEK_MS).toISOString();
  const date = startsAt.slice(0, 10);
  return (['vagner', 'dzyuba'] as const).map(hero => ({
    ...(hero === 'vagner' ? vagner[index % vagner.length] : dzyuba[index % dzyuba.length]),
    id: `${date}-${hero}`, mode: `challenge_${hero}` as ChallengeMode,
    hero, startsAt, endsAt,
  }));
}

export function listWeeklyChallenges(now: Date = new Date()) {
  if (now.getTime() < FIRST_CHALLENGE_RELEASE) return { active: [] as WeeklyChallenge[], archive: [] as WeeklyChallenge[] };
  const current = challengeWeekIndex(now);
  const archive = Array.from({ length: current }, (_, i) => issuesForWeek(current - 1 - i)).flat();
  return { active: issuesForWeek(current), archive };
}

export function findWeeklyChallenge(id: string, now: Date = new Date()): WeeklyChallenge | null {
  const match = /^(\d{4}-\d{2}-\d{2})-(vagner|dzyuba)$/.exec(id);
  if (!match) return null;
  const start = Date.parse(`${match[1]}T09:00:00.000Z`);
  const offset = (start - FIRST_CHALLENGE_RELEASE) / CHALLENGE_WEEK_MS;
  if (!Number.isInteger(offset) || offset < 0 || start > now.getTime()) return null;
  return issuesForWeek(offset).find(issue => issue.id === id) ?? null;
}

export function challengeSucceeded(issue: WeeklyChallenge, result: {
  position: number | null; goalsFor: number | null; losses: number | null; points: number | null;
}): boolean {
  return result.position === 1 && (result.goalsFor ?? 0) >= issue.minimumGoals
    && (result.points ?? 0) >= issue.minimumPoints
    && (!issue.unbeaten || result.losses === 0);
}

export function archiveUnlockedUntil(referrals: Array<{ referralJoinedAt: Date | null; createdAt: Date }>, now: Date = new Date()): string | null {
  const latest = referrals.reduce((max, referral) => Math.max(max, (referral.referralJoinedAt ?? referral.createdAt).getTime()), 0);
  return latest + ARCHIVE_UNLOCK_MS > now.getTime() ? new Date(latest + ARCHIVE_UNLOCK_MS).toISOString() : null;
}
