import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clubs = await db.club.findMany({ orderBy: { nameRu: 'asc' } });
    return NextResponse.json(clubs);
  } catch (error) {
    console.error('Failed to fetch clubs:', error);
    return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
  }
}
