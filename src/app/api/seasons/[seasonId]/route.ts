import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params;
    const season = await db.season.findUnique({
      where: { id: seasonId },
      include: {
        clubSeasons: {
          include: { club: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }
    return NextResponse.json(season);
  } catch (error) {
    console.error('Failed to fetch season:', error);
    return NextResponse.json({ error: 'Failed to fetch season' }, { status: 500 });
  }
}
