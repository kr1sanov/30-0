import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegramId, username, firstName, lastName, photoUrl, profileStats } = body;

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
    }

    // Serialize profileStats to JSON string for storage
    const profileStatsJson = profileStats ? JSON.stringify(profileStats) : undefined;

    const user = await db.user.upsert({
      where: { telegramId: String(telegramId) },
      create: {
        telegramId: String(telegramId),
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
        photoUrl: photoUrl || null,
        displayName: firstName || username || 'Игрок',
        profileStatsJson: profileStatsJson ?? null,
      },
      update: {
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
        photoUrl: photoUrl || null,
        ...(profileStatsJson !== undefined ? { profileStatsJson } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        displayName: user.displayName,
        profileStats: user.profileStatsJson ? JSON.parse(user.profileStatsJson) : null,
      },
    });
  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
