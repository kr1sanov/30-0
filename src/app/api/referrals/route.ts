import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sessionUser } from '@/lib/telegramSession';
import { randomBytes } from 'node:crypto';

/**
 * GET /api/referrals
 * Returns referral stats for a user
 */
export async function GET(request: Request) {
  try {
    const userId = sessionUser(request);
    if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });

    let user = await db.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralCount: true,
        referredBy: true,
        displayName: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!user.referralCode) {
      user = await db.user.update({
        where: { id: userId },
        data: { referralCode: `rpl${randomBytes(6).toString('hex')}` },
        select: { referralCode: true, referralCount: true, referredBy: true, displayName: true },
      });
    }

    // Count referred users
    const referredUsers = user.referralCode ? await db.user.findMany({
      where: { referredBy: user.referralCode },
      select: { displayName: true, username: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }) : [];

    return NextResponse.json({
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referredBy: user.referredBy,
      inviteUrl: user.referralCode ? `https://t.me/RPL30_bot/app?startapp=${encodeURIComponent(user.referralCode)}` : null,
      referredUsers,
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json({ error: 'Failed to get referral stats' }, { status: 500 });
  }
}
