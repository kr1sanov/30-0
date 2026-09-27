import { NextResponse } from 'next/server';

// The old endpoint trusted a client-supplied user ID. Retire it so stale
// clients cannot restore progress after the one-time reset.
export async function POST() {
  return NextResponse.json({ error: 'Use /api/users/profile' }, { status: 410 });
}
