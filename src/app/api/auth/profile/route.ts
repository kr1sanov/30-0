import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';

export async function PATCH(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
    const body = await request.json();
    const userId = sessionUser(request);
    if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : undefined;
    const telegramNotificationsEnabled = typeof body.telegramNotificationsEnabled === 'boolean'
      ? body.telegramNotificationsEnabled
      : undefined;
    const notificationCadence = ['daily', 'weekly', 'monthly'].includes(body.notificationCadence) ? body.notificationCadence as string : undefined;
    if (displayName === undefined && telegramNotificationsEnabled === undefined && notificationCadence === undefined) {
      return NextResponse.json({ error: 'Нет изменений' }, { status: 400 });
    }
    if (displayName !== undefined && (displayName.length < 2 || displayName.length > 30)) {
      return NextResponse.json({ error: 'Имя должно содержать от 2 до 30 символов' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(telegramNotificationsEnabled !== undefined ? { telegramNotificationsEnabled } : {}),
        ...(notificationCadence !== undefined ? { notificationCadence } : {}),
      },
    });

    return NextResponse.json({ user: {
      id: user.id,
      provider: 'telegram',
      displayName: user.displayName,
      createdAt: user.createdAt.getTime(),
      telegramNotificationsEnabled: user.telegramNotificationsEnabled,
      notificationCadence: user.notificationCadence,
    } });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
