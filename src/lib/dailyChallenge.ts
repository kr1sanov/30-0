// ============================================================================
// 30-0 RPL — Daily Challenge Generator
// ============================================================================
// Deterministic challenge generator seeded by date so everyone gets the same
// challenge on the same day.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NationalityRequirement {
  nationality: string;   // "Россия"
  count: number;         // 6
  flag: string;          // "🇷🇺"
}

export interface DailyChallenge {
  date: string;                    // "2026-07-05"
  title: string;                   // "Национальный челлендж"
  description: string;             // "Соберите 6 игроков из России и 2 из Бразилии"
  eraRestriction?: { start: number; end: number };
  formationLock?: string;          // forced formation e.g. "4-4-2"
  nationalityRequirements: NationalityRequirement[];
  maxAttempts: number;             // 5
  rerollsAllowed: number;          // 1
  difficulty: 'easy' | 'normal' | 'hard';
  bonusDescription?: string;       // "Доп. игроки из сегодняшних наций улучшают счёт"
  completionOdds: number;          // 0-100 estimated probability
}

// ---------------------------------------------------------------------------
// Seeded Pseudo-Random Number Generator (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const chr = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

// ---------------------------------------------------------------------------
// Nationality pool with flags
// ---------------------------------------------------------------------------

const NATIONALITIES: Array<{ name: string; flag: string }> = [
  { name: 'Россия', flag: '🇷🇺' },
  { name: 'Бразилия', flag: '🇧🇷' },
  { name: 'Аргентина', flag: '🇦🇷' },
  { name: 'Сербия', flag: '🇷🇸' },
  { name: 'Хорватия', flag: '🇭🇷' },
  { name: 'Узбекистан', flag: '🇺🇿' },
  { name: 'Грузия', flag: '🇬🇪' },
  { name: 'Армения', flag: '🇦🇲' },
  { name: 'Беларусь', flag: '🇧🇾' },
  { name: 'Украина', flag: '🇺🇦' },  // Not in DB but may be added; still fun
  { name: 'Казахстан', flag: '🇰🇿' },
  { name: 'Польша', flag: '🇵🇱' },
  { name: 'Чехия', flag: '🇨🇿' },
  { name: 'Швеция', flag: '🇸🇪' },
  { name: 'Норвегия', flag: '🇳🇴' },
  { name: 'Дания', flag: '🇩🇰' },
  { name: 'Финляндия', flag: '🇫🇮' },
  { name: 'Нидерланды', flag: '🇳🇱' },
  { name: 'Испания', flag: '🇪🇸' },
  { name: 'Италия', flag: '🇮🇹' },
  { name: 'Франция', flag: '🇫🇷' },
  { name: 'Португалия', flag: '🇵🇹' },
  { name: 'Турция', flag: '🇹🇷' },
  { name: 'Колумбия', flag: '🇨🇴' },
  { name: 'Эквадор', flag: '🇪🇨' },
  { name: 'Перу', flag: '🇵🇪' },
  { name: 'Чили', flag: '🇨🇱' },
  { name: 'Венесуэла', flag: '🇻🇪' },
  { name: 'Камерун', flag: '🇨🇲' },
  { name: 'Нигерия', flag: '🇳🇬' },
  { name: 'Иран', flag: '🇮🇷' },
  { name: 'Исландия', flag: '🇮🇸' },
  { name: 'Бельгия', flag: '🇧🇪' },
  { name: 'Австрия', flag: '🇦🇹' },
  { name: 'Венгрия', flag: '🇭🇺' },
  { name: 'Словакия', flag: '🇸🇰' },
  { name: 'Молдова', flag: '🇲🇩' },
  { name: 'Латвия', flag: '🇱🇻' },
  { name: 'Литва', flag: '🇱🇹' },
  { name: 'Босния', flag: '🇧🇦' },
  { name: 'Македония', flag: '🇲🇰' },
  { name: 'Израиль', flag: '🇮🇱' },
  { name: 'Конго', flag: '🇨🇬' },
  { name: 'Гвинея', flag: '🇬🇳' },
  { name: 'Кабо-Верде', flag: '🇨🇻' },
  { name: "Кот-д'Ивуар", flag: '🇨🇮' },
  { name: 'Буркина-Фасо', flag: '🇧🇫' },
];

// Nationalities with enough players in the DB to fill a requirement
const RICH_NATIONALITIES = NATIONALITIES.filter(n =>
  ['Россия', 'Бразилия', 'Аргентина', 'Сербия', 'Хорватия', 'Узбекистан',
   'Грузия', 'Армения', 'Беларусь', 'Польша', 'Чехия', 'Швеция', 'Норвегия',
   'Дания', 'Финляндия', 'Нидерланды', 'Испания', 'Италия', 'Франция',
   'Португалия', 'Турция', 'Колумбия', 'Камерун', 'Нигерия'].includes(n.name)
);

const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-5-1', '3-4-3'];

// ---------------------------------------------------------------------------
// Challenge Templates
// ---------------------------------------------------------------------------

interface ChallengeTemplate {
  title: string;
  descriptionFn: (reqs: NationalityRequirement[], extra: TemplateExtra) => string;
  reqsFn: (rng: () => number) => { requirements: NationalityRequirement[]; extra: TemplateExtra };
  difficulty: 'easy' | 'normal' | 'hard';
  bonusDescription?: string;
  completionOdds: number;
  formationLock?: string;
  eraRestriction?: { start: number; end: number };
}

interface TemplateExtra {
  [key: string]: unknown;
}

const TEMPLATES: ChallengeTemplate[] = [
  // Template 0: Nations challenge — field N players from specific nations
  {
    title: 'Национальный челлендж',
    descriptionFn: (reqs) => {
      const parts = reqs.map(r => `${r.count} игроков из ${r.flag} ${r.nationality}`);
      return `Соберите ${parts.join(' и ')}`;
    },
    reqsFn: (rng) => {
      // Pick 1-2 nationalities
      const count = rng() < 0.5 ? 1 : 2;
      const picked: NationalityRequirement[] = [];
      const used = new Set<string>();

      // First nationality: Russia often, or other rich nation
      const firstPool = rng() < 0.4
        ? NATIONALITIES.filter(n => n.name === 'Россия')
        : RICH_NATIONALITIES;
      const firstIdx = Math.floor(rng() * firstPool.length);
      const firstNat = firstPool[firstIdx];
      used.add(firstNat.name);

      const firstCount = firstNat.name === 'Россия'
        ? Math.floor(rng() * 4) + 4  // 4-7 Russian players
        : Math.floor(rng() * 3) + 2;  // 2-4 from other nation

      picked.push({
        nationality: firstNat.name,
        count: firstCount,
        flag: firstNat.flag,
      });

      if (count >= 2) {
        // Second nationality: different from first
        const secondPool = RICH_NATIONALITIES.filter(n => !used.has(n.name));
        const secondIdx = Math.floor(rng() * secondPool.length);
        const secondNat = secondPool[secondIdx];
        const secondCount = Math.floor(rng() * 2) + 1; // 1-2
        picked.push({
          nationality: secondNat.name,
          count: secondCount,
          flag: secondNat.flag,
        });
      }

      return { requirements: picked, extra: {} };
    },
    difficulty: 'normal',
    bonusDescription: 'Доп. игроки из сегодняшних наций улучшают счёт челленджа',
    completionOdds: 35,
  },
  // Template 1: Era restriction + some nationality
  {
    title: 'Ретро-сборная',
    descriptionFn: (reqs, extra) => {
      const era = extra.era as string;
      const natPart = reqs.length > 0 ? `. Плюс ${reqs[0].count} игроков из ${reqs[0].flag} ${reqs[0].nationality}` : '';
      return `Соберите состав только из эпохи ${era}${natPart}`;
    },
    reqsFn: (rng) => {
      const eras: Array<{ label: string; start: number; end: number }> = [
        { label: '2000-х', start: 2000, end: 2009 },
        { label: '2010-х', start: 2010, end: 2019 },
      ];
      const era = eras[Math.floor(rng() * eras.length)];

      const requirements: NationalityRequirement[] = [];
      // Sometimes add a nationality requirement
      if (rng() < 0.6) {
        const natIdx = Math.floor(rng() * RICH_NATIONALITIES.length);
        const nat = RICH_NATIONALITIES[natIdx];
        requirements.push({
          nationality: nat.name,
          count: Math.floor(rng() * 2) + 1,
          flag: nat.flag,
        });
      }

      return {
        requirements,
        extra: { era: era.label, eraStart: era.start, eraEnd: era.end },
      };
    },
    difficulty: 'hard',
    bonusDescription: 'Используйте легенд прошлого для максимального счёта',
    completionOdds: 25,
    eraRestriction: undefined as unknown as { start: number; end: number }, // set dynamically
  },
  // Template 2: Formation lock challenge
  {
    title: 'Тактический челлендж',
    descriptionFn: (reqs, extra) => {
      const formation = extra.formation as string;
      const natPart = reqs.length > 0 ? ` + ${reqs[0].count} из ${reqs[0].flag}` : '';
      return `Соберите состав в схеме ${formation}${natPart}`;
    },
    reqsFn: (rng) => {
      const formation = FORMATIONS[Math.floor(rng() * FORMATIONS.length)];
      const requirements: NationalityRequirement[] = [];

      // Sometimes add a nationality requirement
      if (rng() < 0.5) {
        const natIdx = Math.floor(rng() * RICH_NATIONALITIES.length);
        const nat = RICH_NATIONALITIES[natIdx];
        requirements.push({
          nationality: nat.name,
          count: Math.floor(rng() * 3) + 2,
          flag: nat.flag,
        });
      }

      return {
        requirements,
        extra: { formation },
      };
    },
    difficulty: 'normal',
    bonusDescription: 'Соблюдайте тактическую дисциплину!',
    completionOdds: 40,
    formationLock: undefined as unknown as string, // set dynamically
  },
  // Template 3: International mix — many different nationalities
  {
    title: 'Мультинациональный челлендж',
    descriptionFn: (reqs) => {
      const parts = reqs.map(r => `${r.flag}${r.count}`);
      return `Соберите команду из разных стран: ${parts.join(' ')}`;
    },
    reqsFn: (rng) => {
      const numReqs = Math.floor(rng() * 2) + 3; // 3-4 nationalities
      const requirements: NationalityRequirement[] = [];
      const used = new Set<string>();

      for (let i = 0; i < numReqs; i++) {
        const pool = RICH_NATIONALITIES.filter(n => !used.has(n.name));
        if (pool.length === 0) break;
        const nat = pool[Math.floor(rng() * pool.length)];
        used.add(nat.name);
        requirements.push({
          nationality: nat.name,
          count: Math.floor(rng() * 2) + 1, // 1-2
          flag: nat.flag,
        });
      }

      return { requirements, extra: {} };
    },
    difficulty: 'hard',
    bonusDescription: 'Каждая дополнительная нация в составе даёт бонус',
    completionOdds: 20,
  },
  // Template 4: Easy warm-up — just a few players from 1 nation
  {
    title: 'Разминка',
    descriptionFn: (reqs) => {
      return `Соберите ${reqs[0].count} игроков из ${reqs[0].flag} ${reqs[0].nationality}`;
    },
    reqsFn: (rng) => {
      const nat = RICH_NATIONALITIES[Math.floor(rng() * RICH_NATIONALITIES.length)];
      return {
        requirements: [{
          nationality: nat.name,
          count: Math.floor(rng() * 2) + 2, // 2-3
          flag: nat.flag,
        }],
        extra: {},
      };
    },
    difficulty: 'easy',
    bonusDescription: 'Лёгкое начало дня — попробуйте!',
    completionOdds: 65,
  },
];

// ---------------------------------------------------------------------------
// Main Generator
// ---------------------------------------------------------------------------

export function generateDailyChallenge(dateStr?: string): DailyChallenge {
  const today = dateStr || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = dateToSeed(today);
  const rng = mulberry32(seed);

  // Pick a template
  const templateIdx = Math.floor(rng() * TEMPLATES.length);
  const template = TEMPLATES[templateIdx];

  // Generate requirements
  const { requirements, extra } = template.reqsFn(rng);

  // Build description
  const description = template.descriptionFn(requirements, extra);

  // Apply dynamic fields
  let eraRestriction: { start: number; end: number } | undefined;
  let formationLock: string | undefined;

  if (extra.eraStart && extra.eraEnd) {
    eraRestriction = { start: extra.eraStart as number, end: extra.eraEnd as number };
  }
  if (extra.formation) {
    formationLock = extra.formation as string;
  }

  // Adjust completion odds based on requirements
  let odds = template.completionOdds;
  const totalRequired = requirements.reduce((sum, r) => sum + r.count, 0);
  if (totalRequired > 8) odds = Math.max(10, odds - 15);
  if (totalRequired <= 3) odds = Math.min(80, odds + 15);
  if (eraRestriction) odds = Math.max(10, odds - 10);
  if (formationLock) odds = Math.max(10, odds - 5);

  return {
    date: today,
    title: template.title,
    description,
    eraRestriction,
    formationLock,
    nationalityRequirements: requirements,
    maxAttempts: 5,
    rerollsAllowed: 1,
    difficulty: template.difficulty,
    bonusDescription: template.bonusDescription,
    completionOdds: Math.round(odds),
  };
}

/**
 * Calculate time remaining until the next daily challenge (midnight MSK / UTC+3)
 */
export function getTimeUntilNextChallenge(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  // Next midnight MSK (UTC+3)
  const utcHour = now.getUTCHours();
  const mskHour = (utcHour + 3) % 24;
  let hoursLeft = 24 - mskHour;
  if (hoursLeft === 24) hoursLeft = 0;
  const minutesLeft = 60 - now.getUTCMinutes();
  const secondsLeft = 60 - now.getUTCSeconds();

  // Adjust if minutes overflow
  let hours = hoursLeft;
  let minutes = minutesLeft === 60 ? 0 : minutesLeft;
  const seconds = secondsLeft === 60 ? 0 : secondsLeft;

  if (minutesLeft === 60) {
    hours = hours - 1 >= 0 ? hours - 1 : 23;
    minutes = 0;
  }

  return { hours, minutes, seconds };
}

/**
 * Get the current date string in MSK timezone (UTC+3)
 */
export function getTodayMSK(): string {
  const now = new Date();
  const mskOffset = 3 * 60; // MSK is UTC+3
  const mskTime = new Date(now.getTime() + (mskOffset + now.getTimezoneOffset()) * 60000);
  return mskTime.toISOString().split('T')[0];
}
