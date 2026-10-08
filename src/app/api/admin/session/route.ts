import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  return NextResponse.json(admin, { headers: { 'Cache-Control': 'no-store' } });
}
