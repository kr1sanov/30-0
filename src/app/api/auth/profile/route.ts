import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, displayName } = body;

    if (!userId || !displayName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { displayName },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
