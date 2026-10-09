import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canAdminWrite, requireAdmin } from '@/lib/adminAuth';
import { sameOrigin } from '@/lib/telegramSession';
import { selectOneClubCandidates } from '@/lib/rplClubSelection';

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  try {
    const clubs = await db.club.findMany({ select: {
      id: true, nameRu: true, nameEn: true, city: true, oneClubHidden: true,
      seasons: { where: { players: { some: {} } }, select: {
        season: { select: { startYear: true } },
        players: { select: { playerId: true, mainPosition: true } },
      } },
    } });
    return NextResponse.json({ clubs: selectOneClubCandidates(clubs, true) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin one-club list:', error);
    return NextResponse.json({ error: 'Не удалось загрузить клубы' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin || !canAdminWrite(admin.role, 'rosters')) return NextResponse.json({ error: 'Нет прав на изменение клубов' }, { status: 403 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник' }, { status: 403 });
  try {
    const { id, hidden } = await request.json();
    if (typeof id !== 'string' || !id || typeof hidden !== 'boolean') return NextResponse.json({ error: 'Проверь клуб и статус' }, { status: 400 });
    const club = await db.club.update({ where: { id }, data: { oneClubHidden: hidden }, select: { id: true, oneClubHidden: true } });
    return NextResponse.json({ club });
  } catch (error) {
    console.error('Admin one-club visibility:', error);
    return NextResponse.json({ error: 'Не удалось изменить видимость клуба' }, { status: 500 });
  }
}
