import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
export async function GET(request: Request) {
 if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
 try {
  const seasons = await db.season.findMany({ orderBy: { startYear: 'desc' }, include: { clubSeasons: { include: { club: true }, orderBy: { position: 'asc' } } } });
  return NextResponse.json({ seasons: seasons.map(s => ({ id: s.id, label: s.label, clubs: s.clubSeasons.map(c => ({ id: c.id, name: c.club.nameRu })) })) });
 } catch { return NextResponse.json({ error: 'Не удалось загрузить составы' }, { status: 500 }); }
}
export async function PATCH(request: Request) {
 if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
 try {
  const b = await request.json(); const id = String(b.id ?? '');
  const rating = Number(b.rating); const mainPosition = String(b.mainPosition ?? '').trim(); const otherPositions = String(b.otherPositions ?? '').trim();
  if (!id || !Number.isInteger(rating) || rating < 1 || rating > 100 || mainPosition.length > 50 || otherPositions.length > 255) return NextResponse.json({ error: 'Проверьте данные игрока' }, { status: 400 });
  const row = await db.playerSeason.update({ where: { id }, data: { rating, mainPosition, otherPositions: otherPositions || null } });
  return NextResponse.json({ ok: true, id: row.id });
 } catch { return NextResponse.json({ error: 'Не удалось обновить запись игрока' }, { status: 500 }); }
}
