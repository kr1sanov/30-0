import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// Validate Telegram WebApp initData
function validateTelegramInitData(initData: string, botToken: string): Map<string, string> | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');

  // Sort params alphabetically
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Compute HMAC-SHA256
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash === hash) {
    return new Map(params.entries());
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { initData } = body;

    if (!initData) {
      return NextResponse.json({ error: 'No initData provided' }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const validatedData = validateTelegramInitData(initData, botToken);
    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 });
    }

    const userJson = validatedData.get('user');
    if (!userJson) {
      return NextResponse.json({ error: 'No user data' }, { status: 400 });
    }

    const tgUser = JSON.parse(userJson);
    const telegramId = String(tgUser.id);
    const username = tgUser.username || null;
    const firstName = tgUser.first_name || null;
    const lastName = tgUser.last_name || null;
    const photoUrl = tgUser.photo_url || null;

    // Upsert user in database
    const user = await db.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username,
        firstName,
        lastName,
        photoUrl,
        displayName: firstName || username || 'Игрок',
      },
      update: {
        username,
        firstName,
        lastName,
        photoUrl,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
