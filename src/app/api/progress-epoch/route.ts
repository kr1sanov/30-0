import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const epoch = (await db.appSetting.findUnique({ where: { key: 'progressEpoch' } }))?.value ?? '2026-09-27';
  return NextResponse.json({ epoch }, { headers: { 'Cache-Control': 'no-store' } });
}
