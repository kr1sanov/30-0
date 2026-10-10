import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const simulatedSeasons = await db.gameRun.count({ where: { completed: true } });
    return NextResponse.json({ simulatedSeasons }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Live season count:', error);
    return NextResponse.json({ error: 'Статистика недоступна' }, { status: 500 });
  }
}
