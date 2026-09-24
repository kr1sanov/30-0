import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { selectOneClubCandidates } from '@/lib/rplClubSelection';

export async function GET() {
  try {
    const clubs = await db.club.findMany({
      select: {
        id: true, nameRu: true, nameEn: true, city: true,
        seasons: {
          where: { season: { startYear: { gte: 2000, lte: 2025 }, endYear: { lte: 2026 } } },
          select: { players: { select: { playerId: true, mainPosition: true } } },
        },
      },
    });
    const eligible = selectOneClubCandidates(clubs);
    return NextResponse.json(eligible, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
  } catch (error) {
    console.error('Failed to fetch clubs:', error);
    return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
  }
}
