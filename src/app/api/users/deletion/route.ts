import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { purgeExpiredProfiles } from '@/lib/profileDeletion';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await purgeExpiredProfiles();
  const user = await db.user.findUnique({ where: { id: userId }, select: { deletionRequestedAt: true, deleteAfterAt: true } });
  if (!user) return NextResponse.json({ error: 'Profile deleted' }, { status: 404 });
  return NextResponse.json({ deleteAfterAt: user.deleteAfterAt?.toISOString() ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const now = new Date();
  const after = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const updated = await db.user.updateMany({ where: { id: userId, deleteAfterAt: null }, data: { deletionRequestedAt: now, deleteAfterAt: after } });
  if (!updated.count) return NextResponse.json({ error: 'Already scheduled' }, { status: 409 });
  return NextResponse.json({ deleteAfterAt: after.toISOString() });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const restored = await db.user.updateMany({ where: { id: userId, deleteAfterAt: { gt: new Date() } }, data: { deletionRequestedAt: null, deleteAfterAt: null } });
  if (!restored.count) return NextResponse.json({ error: 'Restoration window expired' }, { status: 410 });
  return NextResponse.json({ restored: true });
}
