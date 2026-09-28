import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canAdminWrite, requireAdmin } from '@/lib/adminAuth';
import { sameOrigin } from '@/lib/telegramSession';
import { ALL_POSITIONS } from '@/lib/positions';
export async function GET(request: Request) {
 if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
 try {
  const [seasons, clubs] = await Promise.all([
    db.season.findMany({ orderBy: { startYear: 'desc' }, include: { clubSeasons: { include: { club: true, _count: { select: { players: true } } }, orderBy: { position: 'asc' } } } }),
    db.club.findMany({ orderBy: { nameRu: 'asc' }, select: { id: true, nameRu: true, nameEn: true } }),
  ]);
  return NextResponse.json({ seasons: seasons.map(s => ({ id: s.id, label: s.label, startYear: s.startYear, endYear: s.endYear, matchesPerTeam: s.matchesPerTeam,
    clubs: s.clubSeasons.map(c => ({ id: c.id, name: c.club.nameRu, players: c._count.players })) })), clubs });
 } catch { return NextResponse.json({ error: 'Не удалось загрузить составы' }, { status: 500 }); }
}
export async function POST(request: Request) {
 const admin = await requireAdmin(request);
 if (!admin || !canAdminWrite(admin.role, 'rosters')) return NextResponse.json({ error: 'Нет прав на создание сезона' }, { status: 403 });
 if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник' }, { status: 403 });
 try {
  const body = await request.json();
  const startYear = Number(body.startYear); const endYear = Number(body.endYear);
  const matchesPerTeam = Number(body.matchesPerTeam);
  const label = String(body.label ?? '').trim();
  if (!Number.isInteger(startYear) || startYear < 2000 || startYear > 2100 ||
    !Number.isInteger(endYear) || ![startYear, startYear + 1].includes(endYear) ||
    !Number.isInteger(matchesPerTeam) || matchesPerTeam < 1 || matchesPerTeam > 60 ||
    label.length < 4 || label.length > 100) return NextResponse.json({ error: 'Проверьте годы, название и число матчей' }, { status: 400 });
  const existing = await db.season.findUnique({ where: { startYear_endYear: { startYear, endYear } } });
  if (existing) return NextResponse.json({ error: 'Сезон с этими годами уже существует' }, { status: 409 });
  const season = await db.season.create({ data: { startYear, endYear, label, matchesPerTeam } });
  return NextResponse.json({ season }, { status: 201 });
 } catch (error) {
  console.error('Admin season creation:', error);
  return NextResponse.json({ error: 'Не удалось создать сезон' }, { status: 500 });
 }
}
export async function PATCH(request: Request) {
 const admin = await requireAdmin(request);
 if (!admin || !canAdminWrite(admin.role, 'rosters')) return NextResponse.json({ error: 'Нет прав на изменение составов' }, { status: 403 });
 if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник' }, { status: 403 });
 try {
  const b = await request.json(); const id = String(b.id ?? '');
  const rating = Number(b.rating); const primeRating = Number(b.primeRating); const mainPosition = String(b.mainPosition ?? '').trim(); const otherPositions = String(b.otherPositions ?? '').trim();
  if (!id || !Number.isInteger(rating) || rating < 1 || rating > 100 || !Number.isInteger(primeRating) || primeRating < rating || primeRating > 100 ||
    !ALL_POSITIONS.includes(mainPosition as typeof ALL_POSITIONS[number]) || otherPositions.length > 255 ||
    (otherPositions && otherPositions.split(',').some((pos: string) => !ALL_POSITIONS.includes(pos.trim() as typeof ALL_POSITIONS[number])))) return NextResponse.json({ error: 'Проверьте рейтинги и позиции игрока' }, { status: 400 });
  const row = await db.playerSeason.update({ where: { id }, data: { rating, primeRating, mainPosition, otherPositions: otherPositions || null } });
  return NextResponse.json({ ok: true, id: row.id });
 } catch { return NextResponse.json({ error: 'Не удалось обновить запись игрока' }, { status: 500 }); }
}
