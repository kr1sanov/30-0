import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id.length > 100) return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
  const user = await db.user.findUnique({ where: { id }, select: { id: true, displayName: true, username: true, photoUrl: true, createdAt: true,
    runs: { where: { completed: true }, select: { points: true, position: true, gameMode: true }, orderBy: { createdAt: 'desc' }, take: 100 } } });
  if (!user) return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
  const viewer = sessionUser(request);
  const following = viewer && viewer !== id ? !!await db.friendship.findUnique({ where: { fromId_toId: { fromId: viewer, toId: id } }, select: { id: true } }) : false;
  return NextResponse.json({ id: user.id, displayName: user.displayName, username: user.username, photoUrl: user.photoUrl, createdAt: user.createdAt,
    seasons: user.runs.length, titles: user.runs.filter(run => run.position === 1).length,
    bestPoints: Math.max(0, ...user.runs.map(run => run.points ?? 0)),
    modes: Object.fromEntries(['classic', 'single_club', 'multiplayer', 'challenges'].map(mode => [mode, user.runs.filter(run => mode === 'challenges' ? run.gameMode.startsWith('challenge_') : run.gameMode === mode).length])),
    following, own: viewer === id });
}
