import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cachedValue } from '@/lib/asyncWork';

const completedCount = cachedValue(() => db.gameRun.count({ where: { completed: true } }), 2_000);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const simulatedSeasons = await completedCount();
    return NextResponse.json({ simulatedSeasons }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Live season count:', error);
    return NextResponse.json({ error: 'Статистика недоступна' }, { status: 500 });
  }
}
