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
  const kind = params.get('kind') === 'rooms' ? 'rooms' : 'runs';
  const query = (params.get('q') ?? '').trim().replace(/^@/, '').slice(0, 80);
  const status = params.get('status') ?? 'all';
  const sort = params.get('sort') ?? 'newest';
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.get('page') ?? '1', 10) || 1));
  try {
    if (kind === 'rooms') {
      const where: Prisma.MultiplayerRoomWhereInput = {
        ...(dateWhere(range.from, range.to) ? { createdAt: dateWhere(range.from, range.to) } : {}),
        ...(status === 'active' ? { status: { in: ['lobby', 'starting', 'drafting'] } } : status === 'completed' ? { status: 'completed' } : {}),
        ...(query ? { OR: [{ code: { contains: query.toUpperCase() } }, { seats: { some: { name: { contains: query } } } }] } : {}),
      };
      const [total, rooms] = await Promise.all([
        db.multiplayerRoom.count({ where }),
        db.multiplayerRoom.findMany({ where, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE,
          orderBy: [{ createdAt: sort === 'oldest' ? 'asc' : 'desc' }, { code: 'asc' }],
          select: { code: true, status: true, createdAt: true, updatedAt: true, hostUserId: true,
            seriesRound: true, seriesTargetWins: true, maxPlayers: true, seats: { select: { name: true, isBot: true, userId: true, ready: true } } } }),
      ]);
      const ids = [...new Set(rooms.flatMap(room => [room.hostUserId, ...room.seats.flatMap(seat => seat.userId ? [seat.userId] : [])]))];
      const people = ids.length ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, displayName: true } }) : [];
      const byId = new Map(people.map(user => [user.id, user]));
      return NextResponse.json({ kind, total, page, pageSize: PAGE_SIZE, rooms: rooms.map(room => ({
        ...room, host: byId.get(room.hostUserId) ?? null,
        seats: room.seats.map(seat => ({ ...seat, user: seat.userId ? byId.get(seat.userId) ?? null : null })),
      })) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const conditions: Prisma.GameRunWhereInput[] = [runWhere(mode, range.from, range.to)];
    if (status === 'completed') conditions.push({ completed: true });
    if (status === 'active') conditions.push({ completed: false });
    if (status === 'perfect') conditions.push({ completed: true, wins: 30, draws: 0, losses: 0 });
    if (query) conditions.push({ OR: [
      { id: { contains: query } },
      { user: { is: { OR: [{ username: { contains: query } }, { displayName: { contains: query } }, { providerId: { contains: query } }] } } },
      { multiplayerSeat: { is: { roomCode: { contains: query.toUpperCase() } } } },
    ] });
    const where: Prisma.GameRunWhereInput = { AND: conditions };
    const orderBy: Prisma.GameRunOrderByWithRelationInput = sort === 'oldest' ? { createdAt: 'asc' }
      : sort === 'points' ? { points: 'desc' } : sort === 'wins' ? { wins: 'desc' } : { createdAt: 'desc' };
    const [total, runs] = await Promise.all([
      db.gameRun.count({ where }),
      db.gameRun.findMany({ where, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE,
        orderBy: [orderBy, { id: 'asc' }], select: { id: true, createdAt: true, completed: true, gameMode: true,
          clubFilter: true, formation: true, teamName: true, wins: true, draws: true, losses: true, points: true, position: true,
          user: { select: { id: true, displayName: true, username: true, providerId: true } },
          multiplayerSeat: { select: { roomCode: true, isBot: true, name: true, room: { select: { status: true } } } } } }),
    ]);
    return NextResponse.json({ kind, total, page, pageSize: PAGE_SIZE, runs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin games:', error);
    return NextResponse.json({ error: 'Не удалось загрузить игры' }, { status: 500 });
  }
}
