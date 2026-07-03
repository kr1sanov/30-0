import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const club = await db.club.findUnique({
      where: { id: clubId },
      include: {
        seasons: {
          include: { season: true },
          orderBy: { season: { startYear: 'desc' } },
        },
      },
    });
    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }
    return NextResponse.json(club);
  } catch (error) {
    console.error('Failed to fetch club history:', error);
    return NextResponse.json({ error: 'Failed to fetch club history' }, { status: 500 });
  }
}
