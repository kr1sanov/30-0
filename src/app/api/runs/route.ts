import { db } from '@/lib/db';
import { FORMATIONS } from '@/lib/positions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get('completed');
    const difficulty = searchParams.get('difficulty');
    const sort = searchParams.get('sort') || 'date'; // 'date' | 'points'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const where: Record<string, unknown> = {};
    if (completed === 'true') {
      where.completed = true;
    }
    if (difficulty && ['easy', 'normal', 'hard'].includes(difficulty)) {
      where.difficulty = difficulty;
    }

    const orderBy: Record<string, string>[] =
      sort === 'points'
        ? [{ points: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];

    const runs = await db.gameRun.findMany({
      where,
      include: {
        slots: {
          orderBy: { slotPosition: 'asc' },
        },
      },
      orderBy,
      take: limit,
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error('Failed to fetch runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch runs' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formation, difficulty, draftMode, ratingMode, eraFilter, eraStartYear, eraEndYear, teamName, clubFilter, nationalityFilter, userId } = body;

    // Validate formation exists
    const formationData = FORMATIONS.find((f) => f.id === formation);
    if (!formationData) {
      return NextResponse.json(
        { error: 'Invalid formation' },
        { status: 400 },
      );
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'normal', 'hard'];
    const safeDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'normal';

    // Determine rerolls based on difficulty
    const rerollsMap: Record<string, number> = {
      easy: 3,
      normal: 1,
      hard: 0,
    };
    const rerollsTotal = rerollsMap[safeDifficulty] ?? 1;

    // Resolve userId: try from body first, then from session cookie
    let dbUserId: string | undefined;
    const effectiveUserId = userId || getUserIdFromSession(request);
    if (effectiveUserId && typeof effectiveUserId === 'string') {
      try {
        const existingUser = await db.user.findUnique({ where: { id: effectiveUserId } });
        if (existingUser) {
          dbUserId = effectiveUserId;
        }
      } catch {
        // User lookup failed — continue without userId
      }
    }

    // Create the game run
    const run = await db.gameRun.create({
      data: {
        formation: formation || '4-3-3',
        difficulty: safeDifficulty,
        draftMode: draftMode || 'squad_first',
        ratingMode: ratingMode || 'season',
        eraFilter: eraFilter || 'all',
        eraStartYear: eraStartYear ?? 2000,
        eraEndYear: eraEndYear ?? 2025,
        rerollsTotal,
        rerollsUsed: 0,
        completed: false,
        ...(teamName ? { teamName } : {}),
        ...(clubFilter ? { clubFilter } : {}),
        ...(nationalityFilter ? { nationalityFilter } : {}),
        ...(dbUserId ? { userId: dbUserId } : {}),
      },
    });

    // Create 11 game slots from the formation
    const slotsData = formationData.slots.map((slot, index) => ({
      runId: run.id,
      slotPosition: `${slot.position}_${index}`,
      isCompatible: true,
    }));

    await db.gameSlot.createMany({ data: slotsData });

    // Return the run with slots
    const runWithSlots = await db.gameRun.findUnique({
      where: { id: run.id },
      include: { slots: true },
    });

    return NextResponse.json(runWithSlots, { status: 201 });
  } catch (error) {
    console.error('Failed to create game run:', error);
    return NextResponse.json(
      { error: 'Failed to create game run' },
      { status: 500 },
    );
  }
}

/**
 * Extract userId from the Yandex session cookie.
 */
function getUserIdFromSession(request: NextRequest): string | undefined {
  try {
    const sessionCookie = request.cookies.get('yandex_session')?.value;
    if (!sessionCookie) return undefined;
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    return sessionData?.id;
  } catch {
    return undefined;
  }
}
