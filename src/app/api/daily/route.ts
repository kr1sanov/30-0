import { NextResponse } from 'next/server';
import { generateDailyChallenge, getTodayMSK, getTimeUntilNextChallenge } from '@/lib/dailyChallenge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = getTodayMSK();
    const challenge = generateDailyChallenge(today);
    const timeUntilNext = getTimeUntilNextChallenge();

    return NextResponse.json({
      challenge,
      timeUntilNext,
      today,
    });
  } catch (error) {
    console.error('Failed to generate daily challenge:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily challenge' },
      { status: 500 },
    );
  }
}
