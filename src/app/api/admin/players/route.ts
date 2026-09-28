import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  const search = new URL(request.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  const players = await db.player.findMany({
    where: search ? { OR: [{ fullName: { contains: search } }, { lastName: { contains: search } }, { alias: { contains: search } }] } : undefined,
    select: { id: true, fullName: true, lastName: true, alias: true, _count: { select: { seasons: true } } },
    orderBy: { fullName: 'asc' }, take: 50,
  });
  return NextResponse.json({ players }, { headers: { 'Cache-Control': 'no-store' } });
}
