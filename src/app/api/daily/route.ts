import { NextResponse } from 'next/server';
import { generateDailyChallenge, getTodayMSK, getTimeUntilNextChallenge } from '@/lib/dailyChallenge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = getTodayMSK();
    const challenge = generateDailyChallenge(today);
    const timeUntilNext = getTimeUntilNextChallenge();

    // Simulated completion stats (in production, this would come from a DB)
    // Since we don't have a real tracking system yet, we generate deterministic
    // values based on the date so they look consistent
    const seed = today.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);
    const completionCount = Math.floor((seed % 127) + 10);
    const attemptCount = Math.floor((seed % 347) + 50);

    return NextResponse.json({
      challenge,
      timeUntilNext,
      today,
      stats: {
        completions: completionCount,
        attempts: attemptCount,
      },
    });
  } catch (error) {
    console.error('Failed to generate daily challenge:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily challenge' },
      { status: 500 },
    );
  }
}
