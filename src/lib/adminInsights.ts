import type { Prisma } from '@prisma/client';

export type AdminMode = 'all' | 'classic' | 'single_club' | 'challenge' | 'multiplayer';
export type AdminPeriod = 'today' | '3d' | '7d' | '14d' | '30d' | '90d' | 'all' | 'custom';

const DAY = 86_400_000;
const MOSCOW_OFFSET = 3 * 60 * 60 * 1000;
const validPeriods = new Set<AdminPeriod>(['today', '3d', '7d', '14d', '30d', '90d', 'all', 'custom']);

export function adminMode(value: string | null): AdminMode {
  return value === 'classic' || value === 'single_club' || value === 'challenge' || value === 'multiplayer' ? value : 'all';
}

export function adminRange(params: URLSearchParams, now = new Date()) {
  const raw = params.get('period') as AdminPeriod;
  const period = validPeriods.has(raw) ? raw : '14d';
  const today = new Date(now.getTime() + MOSCOW_OFFSET).toISOString().slice(0, 10);
  const dayStart = (day: string) => new Date(`${day}T00:00:00+03:00`);
  const validDay = (day: string | null) => day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(dayStart(day).getTime()) && moscowDay(dayStart(day)) === day;
  if (period === 'all') return { period, from: null, to: null, label: 'За всё время' };
  if (period === 'custom') {
    const from = params.get('from');
    const to = params.get('to');
    if (!validDay(from) || !validDay(to) || from! > to! || dayStart(to!).getTime() + DAY > now.getTime() + DAY || dayStart(to!).getTime() - dayStart(from!).getTime() > 366 * DAY) {
      throw new Error('Выбери корректный период не длиннее 366 дней');
    }
    return { period, from: dayStart(from!), to: new Date(dayStart(to!).getTime() + DAY), label: `${from} — ${to}` };
  }
  const count = period === 'today' ? 1 : Number.parseInt(period, 10);
  const from = new Date(dayStart(today).getTime() - (count - 1) * DAY);
  return { period, from, to: null, label: period === 'today' ? 'Сегодня' : `Последние ${count} дней` };
}

export function dateWhere(from: Date | null, to: Date | null): Prisma.DateTimeFilter | undefined {
  return from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } : undefined;
}

export function modeWhere(mode: AdminMode): Prisma.GameRunWhereInput {
  if (mode === 'multiplayer') return { multiplayerSeat: { isNot: null } };
  if (mode === 'single_club') return { multiplayerSeat: null, gameMode: 'single_club' };
  if (mode === 'challenge') return { multiplayerSeat: null, gameMode: { in: ['challenge_vagner', 'challenge_dzyuba'] } };
  if (mode === 'classic') return { multiplayerSeat: null, gameMode: 'classic' };
  return {};
}

export function runWhere(mode: AdminMode, from: Date | null, to: Date | null): Prisma.GameRunWhereInput {
  return { ...modeWhere(mode), ...(dateWhere(from, to) ? { createdAt: dateWhere(from, to) } : {}) };
}

export function moscowDay(date: Date): string {
  return new Date(date.getTime() + MOSCOW_OFFSET).toISOString().slice(0, 10);
}
