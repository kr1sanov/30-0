import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const seasons = await db.season.findMany({
      orderBy: { startYear: 'desc' },
    });
    return NextResponse.json(seasons);
  } catch (error) {
    console.error('Failed to fetch seasons:', error);
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 });
  }
}
