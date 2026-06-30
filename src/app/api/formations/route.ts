import { FORMATIONS } from '@/lib/positions';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(FORMATIONS);
}
