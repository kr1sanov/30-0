import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubSeasonId: string }> }
) {
  try {
    const { clubSeasonId } = await params;
    const clubSeason = await db.clubSeason.findUnique({
      where: { id: clubSeasonId },
      include: {
        club: true,
        season: true,
        players: {
          include: { player: true },
          orderBy: { rating: 'desc' },
        },
      },
    });
    if (!clubSeason) {
      return NextResponse.json({ error: 'Club season not found' }, { status: 404 });
    }
    return NextResponse.json(clubSeason);
  } catch (error) {
    console.error('Failed to fetch squad:', error);
    return NextResponse.json({ error: 'Failed to fetch squad' }, { status: 500 });
  }
}
