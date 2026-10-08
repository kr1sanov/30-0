import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { adminMode, adminRange, dateWhere, runWhere } from '@/lib/adminInsights';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 25;

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  let range;
  try { range = adminRange(params); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  const mode = adminMode(params.get('mode'));
  const query = (params.get('q') ?? '').trim().replace(/^@/, '').slice(0, 80);
  const status = params.get('status') ?? 'all';
  const sort = params.get('sort') ?? 'recent';
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.get('page') ?? '1', 10) || 1));
  const periodRun = runWhere(mode, range.from, range.to);
  const active: Prisma.UserWhereInput = { OR: [
    { lastActiveAt: range.from || range.to ? dateWhere(range.from, range.to) : { not: null } },
    { runs: { some: periodRun } },
  ] };
  const conditions: Prisma.UserWhereInput[] = [];
  if (query) conditions.push({ OR: [
    { displayName: { contains: query } }, { username: { contains: query } },
    { firstName: { contains: query } }, { lastName: { contains: query } }, { providerId: { contains: query } },
  ] });
  if (status === 'active') conditions.push(active);
  if (status === 'inactive') conditions.push({ NOT: active });
  if (status === 'new' && dateWhere(range.from, range.to)) conditions.push({ createdAt: dateWhere(range.from, range.to) });
  if (mode !== 'all') conditions.push({ runs: { some: periodRun } });
  const where: Prisma.UserWhereInput = conditions.length ? { AND: conditions } : {};
  const orderBy: Prisma.UserOrderByWithRelationInput = sort === 'created' ? { createdAt: 'desc' }
    : sort === 'oldest' ? { createdAt: 'asc' }
      : sort === 'games' ? { runs: { _count: 'desc' } }
        : sort === 'name' ? { displayName: 'asc' } : { lastActiveAt: 'desc' };
  try {
    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({ where, orderBy: [orderBy, { id: 'asc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        select: { id: true, provider: true, providerId: true, username: true, displayName: true, firstName: true, lastName: true,
          createdAt: true, lastActiveAt: true, referralCount: true, _count: { select: { runs: true } },
          runs: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } } } }),
    ]);
    const ids = users.map(user => user.id);
    const [counts, completed, perfect] = ids.length ? await Promise.all([
      db.gameRun.groupBy({ by: ['userId'], where: { ...periodRun, userId: { in: ids } }, _count: { id: true }, _max: { points: true } }),
      db.gameRun.groupBy({ by: ['userId'], where: { ...periodRun, userId: { in: ids }, completed: true }, _count: { id: true } }),
      db.gameRun.groupBy({ by: ['userId'], where: { ...periodRun, userId: { in: ids }, completed: true, wins: 30, draws: 0, losses: 0 }, _count: { id: true } }),
    ]) : [[], [], []];
    const byId = new Map(counts.map(row => [row.userId, row]));
    const doneById = new Map(completed.map(row => [row.userId, row._count.id]));
    const perfectById = new Map(perfect.map(row => [row.userId, row._count.id]));
    return NextResponse.json({ total, page, pageSize: PAGE_SIZE, users: users.map(user => ({
      id: user.id, provider: user.provider, telegramId: user.provider === 'telegram' ? user.providerId.replace(/^telegram_/, '') : null,
      username: user.username, displayName: user.displayName, firstName: user.firstName, lastName: user.lastName,
      createdAt: user.createdAt, lastActiveAt: user.lastActiveAt, lastGameAt: user.runs[0]?.createdAt ?? null,
      referralCount: user.referralCount, totalRuns: user._count.runs,
      periodRuns: byId.get(user.id)?._count.id ?? 0, completed: doneById.get(user.id) ?? 0,
      perfect: perfectById.get(user.id) ?? 0, bestPoints: byId.get(user.id)?._max.points ?? null,
    })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin users:', error);
    return NextResponse.json({ error: 'Не удалось загрузить пользователей' }, { status: 500 });
  }
}
