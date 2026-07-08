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

// Generate a short unique referral code
function generateReferralCode(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'; // no confusing 0/O/1/l
  let code = 'rpl';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

    // Extract start_param for referral tracking
    const startParam = validatedData.get('start_param') || null;

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
        referralCode: generateReferralCode(),
        ...(startParam ? { referredBy: startParam } : {}),
      },
      update: {
        username,
        firstName,
        lastName,
        photoUrl,
      },
    });

    // If this is a new user with a referral code, increment the referrer's count
    if (startParam) {
      try {
        const referrer = await db.user.findUnique({
          where: { referralCode: startParam },
        });
        if (referrer && referrer.telegramId !== telegramId) {
          // Only count if the referral hasn't already been tracked
          const existingUser = await db.user.findUnique({ where: { telegramId } });
          if (existingUser && !existingUser.referredBy) {
            await db.user.update({
              where: { id: referrer.id },
              data: { referralCount: { increment: 1 } },
            });
            await db.user.update({
              where: { id: existingUser.id },
              data: { referredBy: startParam },
            });
          }
        }
      } catch (refError) {
        console.error('Referral tracking error (non-fatal):', refError);
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        displayName: user.displayName,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
