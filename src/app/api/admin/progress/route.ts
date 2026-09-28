import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { sameOrigin } from '@/lib/telegramSession';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  if (actor.role !== 'owner' || !sameOrigin(request)) return NextResponse.json({ error: 'Только владелец может сбросить прогресс' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (body.confirm !== 'СБРОСИТЬ ПРОГРЕСС ВСЕХ') return NextResponse.json({ error: 'Введите фразу подтверждения' }, { status: 400 });
  const epoch = randomUUID();
  const [runs, users] = await db.$transaction([
    db.gameRun.deleteMany(),
    db.user.updateMany({ data: { profileStatsJson: null } }),
    db.appSetting.upsert({ where: { key: 'progressEpoch' }, create: { key: 'progressEpoch', value: epoch }, update: { value: epoch } }),
  ]);
  console.info('Global progress reset:', { actor: actor.username, runs: runs.count, users: users.count });
  return NextResponse.json({ ok: true, runsRemoved: runs.count, usersReset: users.count, epoch }, { headers: { 'Cache-Control': 'no-store' } });
}
