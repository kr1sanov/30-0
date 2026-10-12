import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET;
  const provided = request.headers.get('x-30-0-bridge-secret') || '';
  if (!expected || Buffer.byteLength(provided) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { user, enabled } = await request.json().catch(() => ({}));
  if (!Number.isSafeInteger(user?.id) || user.id <= 0) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  const firstName = typeof user.first_name === 'string' ? user.first_name.slice(0, 100) : null;
  const lastName = typeof user.last_name === 'string' ? user.last_name.slice(0, 100) : null;
  const username = typeof user.username === 'string' ? user.username.slice(0, 32) : null;
  await db.user.upsert({ where: { providerId: `telegram_${user.id}` }, create: { provider: 'telegram', providerId: `telegram_${user.id}`, firstName, lastName, username, displayName: firstName || username || 'Player', telegramChatStarted: true, ...(typeof enabled === 'boolean' ? { telegramNotificationsEnabled: enabled } : {}) },
    update: { firstName, lastName, username, telegramChatStarted: true, lastActiveAt: new Date(), ...(typeof enabled === 'boolean' ? { telegramNotificationsEnabled: enabled } : {}) } });
  return NextResponse.json({ ok: true });
}
