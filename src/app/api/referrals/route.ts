import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/referrals?userId=xxx
 * Returns referral stats for a user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
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

    // Count referred users
    const referredUsers = await db.user.findMany({
      where: { referredBy: user.referralCode },
      select: { displayName: true, username: true },
      take: 10,
    });

    return NextResponse.json({
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referredBy: user.referredBy,
      inviteUrl: `https://t.me/RPL30_bot/app?startapp=${user.referralCode}`,
      referredUsers,
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json({ error: 'Failed to get referral stats' }, { status: 500 });
  }
}
