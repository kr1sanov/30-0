import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canAdminWrite, requireAdmin } from '@/lib/adminAuth';
import { sameOrigin } from '@/lib/telegramSession';

export async function PATCH(request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const actor = await requireAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  if (!canAdminWrite(actor.role, 'players') || !sameOrigin(request)) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.alias !== 'string' && body.alias !== null) return NextResponse.json({ error: 'Неверный псевдоним' }, { status: 400 });
  const alias = typeof body.alias === 'string' ? body.alias.trim().replace(/\s+/g, ' ') : '';
  if (alias.length > 50 || /[\x00-\x1f\x7f<>]/.test(alias)) return NextResponse.json({ error: 'Псевдоним: до 50 символов без спецзнаков' }, { status: 400 });
  const { playerId } = await params;
  const original = await db.player.findUnique({ where: { id: playerId }, select: { id: true, fullName: true, lastName: true } });
  if (!original) return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
  const player = await db.player.update({ where: { id: playerId }, data: { alias: alias || null }, select: { id: true, fullName: true, lastName: true, alias: true } });
  const seasons = await db.playerSeason.findMany({ where: { playerId }, select: { id: true } });
  if (seasons.length) await db.gameSlot.updateMany({
    where: { playerSeasonId: { in: seasons.map(season => season.id) }, run: { completed: false } },
    data: { playerName: alias || original.fullName, playerLastName: alias || original.lastName },
  });
  return NextResponse.json({ player });
}
