import { db } from '@/lib/db';
import { authorizeRun } from '@/lib/runAccess';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const denied = authorizeRun(request, runId);
    if (denied) return denied;

    const run = await db.gameRun.findUnique({
      where: { id: runId },
      include: { slots: { orderBy: { slotPosition: 'asc' } } },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error('Failed to fetch run:', error);
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
  }
}
