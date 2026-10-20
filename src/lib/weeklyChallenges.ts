/** Weekly issues switch at 12:00 Saturday in Moscow (09:00 UTC). */
export const FIRST_CHALLENGE_RELEASE = Date.parse('2026-10-10T09:00:00.000Z');
export const CHALLENGE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Hero = 'vagner' | 'dzyuba' | 'cska_blitz' | 'akron_keeper' | 'custom';
export type ChallengeMode = `challenge_${Hero}`;
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
  requireTitle?: boolean;
  matchLimit?: number;
  maximumConceded?: number;
  minimumCleanSheets?: number;
  featuredNames?: string[][];
  sourceUrls?: string[];
  forceOpen?: boolean;
  achievementTitleRu?: string;
  achievementTitleEn?: string;
  achievementDescriptionRu?: string;
  achievementDescriptionEn?: string;
  achievementIcon?: string;
  custom?: boolean;
  visibility?: 'auto' | 'open' | 'hidden' | 'archived';
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
  if (index === 1) return [
    { id: `${date}-cska_blitz`, mode: 'challenge_cska_blitz', hero: 'cska_blitz', startsAt, endsAt,
      titleRu: '⚡ ПФК ЦСКА · Блиц 11 минут', titleEn: '⚡ CSKA · Eleven-minute blitz',
      descriptionRu: 'В Кубке ЦСКА победил Ростов 4:0, забив три безответных мяча к 11-й минуте — рекорд турнира. Прайм Обляков и Бориско уже в составе. За первые 5 матчей забей минимум 11 голов, пропусти не больше 2 и проведи 3 сухих матча.',
      descriptionEn: 'CSKA beat Rostov 4–0 in the cup, setting a record with three unanswered goals by minute 11. Prime Oblyakov and Borisko start in your XI. In the first 5 matches, score at least 11 goals, concede at most 2 and keep 3 clean sheets.',
      minimumGoals: 11, minimumPoints: 0, unbeaten: false, requireTitle: false, matchLimit: 5, maximumConceded: 2, minimumCleanSheets: 3,
      featuredNames: [['Ivan Oblyakov', 'Иван Обляков'], ['Maksim Borisko', 'Maxim Borisko', 'Максим Бориско']],
      sourceUrls: ['https://pfc-cska.com/ru/novosti/vse-novosti/32659-pfk-cska-rostov-40/', 'https://pfc-cska.com/ru/novosti/vse-novosti/32662-pfk-cska-ustanovil-rekord-kubka-rossii-zabiv-tri-bezotvetnih-myacha-za-11-minut/'] },
    { id: `${date}-akron_keeper`, mode: 'challenge_akron_keeper', hero: 'akron_keeper', startsAt, endsAt,
      titleRu: '🧤 Акрон · Стена Тереховского', titleEn: '🧤 Akron · Terekhovskiy’s wall',
      descriptionRu: 'После ничьей 1:1 с Локомотивом Игнат Тереховский отразил три из четырёх пенальти, а Акрон выиграл серию 3:1. Начни с его лучшей доступной прайм-карточкой: за сезон из 30 матчей пропусти не больше 15 голов и сыграй минимум 15 раз на ноль.',
      descriptionEn: 'After a 1–1 draw with Lokomotiv, Ignat Terekhovskiy saved three of four penalties as Akron won the shootout 3–1. Start with his best available prime card: concede at most 15 goals and keep at least 15 clean sheets in a 30-match season.',
      minimumGoals: 0, minimumPoints: 0, unbeaten: false, requireTitle: false, maximumConceded: 15, minimumCleanSheets: 15,
      featuredNames: [['Ignat Terekhovskiy', 'Ignat Terekhovsky', 'Игнат Тереховский', 'Тереховский Игнат']],
      sourceUrls: ['https://fcakron.ru/news/2517', 'https://www.fclm.ru/news/n/lokomotiv-akron-cup-2026-27-match-summary/'] },
  ];
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
  const match = /^(\d{4}-\d{2}-\d{2})-(vagner|dzyuba|cska_blitz|akron_keeper)$/.exec(id);
  if (!match) return null;
  const start = Date.parse(`${match[1]}T09:00:00.000Z`);
  const offset = (start - FIRST_CHALLENGE_RELEASE) / CHALLENGE_WEEK_MS;
  if (!Number.isInteger(offset) || offset < 0 || start > now.getTime()) return null;
  return issuesForWeek(offset).find(issue => issue.id === id) ?? null;
}

export function challengeSucceeded(issue: WeeklyChallenge, result: {
  position: number | null; goalsFor: number | null; losses: number | null; points: number | null;
  goalsAgainst?: number | null; seasonResultJson?: string | null;
  matches?: Array<{ isHome: boolean; homeGoals: number; awayGoals: number }>;
}): boolean {
  let matches = result.matches;
  if (!matches && result.seasonResultJson) { try { matches = JSON.parse(result.seasonResultJson).matches; } catch {} }
  const subset = matches?.slice(0, issue.matchLimit);
  const gf = subset ? subset.reduce((n,m) => n+(m.isHome ? m.homeGoals : m.awayGoals),0) : result.goalsFor ?? 0;
  const ga = subset ? subset.reduce((n,m) => n+(m.isHome ? m.awayGoals : m.homeGoals),0) : result.goalsAgainst;
  const clean = subset?.filter(m => (m.isHome ? m.awayGoals : m.homeGoals) === 0).length;
  if ((issue.matchLimit || issue.minimumCleanSheets) && (!matches || matches.length < (issue.matchLimit || 30))) return false;
  const points = issue.matchLimit && subset ? subset.reduce((n,m) => {const gf=m.isHome?m.homeGoals:m.awayGoals, ga=m.isHome?m.awayGoals:m.homeGoals; return n+(gf>ga?3:gf===ga?1:0);},0) : result.points ?? 0;
  return (issue.requireTitle === false || result.position === 1) && gf >= issue.minimumGoals
    && (issue.maximumConceded === undefined || (ga !== undefined && ga !== null && ga <= issue.maximumConceded))
    && (issue.minimumCleanSheets === undefined || (clean ?? 0) >= issue.minimumCleanSheets)
    && points >= issue.minimumPoints && (!issue.unbeaten || result.losses === 0);
}

/** Stable labels also cover manually opened issues before their scheduled release. */
export function challengeModeTitle(mode: string | null | undefined, language: 'ru' | 'en' = 'ru') {
  const issue = [...issuesForWeek(0), ...issuesForWeek(1)].find(issue => issue.mode === mode);
  return issue ? (language === 'en' ? issue.titleEn : issue.titleRu) : mode === 'challenge_custom' ? (language === 'en' ? 'Challenge' : 'Челлендж') : '';
}
