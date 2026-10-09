import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { selectOneClubCandidates } from '@/lib/rplClubSelection';

export async function GET() {
  try {
    const clubs = await db.club.findMany({
      select: {
        id: true, nameRu: true, nameEn: true, city: true, oneClubHidden: true,
        seasons: {
          where: { players: { some: {} } },
          select: { season: { select: { startYear: true } }, players: { select: { playerId: true, mainPosition: true } } },
        },
      },
    });
    const eligible = selectOneClubCandidates(clubs);
    return NextResponse.json(eligible, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to fetch clubs:', error);
    return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
  }
}
