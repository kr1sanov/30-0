import { db } from '@/lib/db';
import { selectOneClubCandidates } from '@/lib/rplClubSelection';
import { FORMATIONS } from '@/lib/positions';
import { enforceRateLimit } from '@/lib/rateLimit';
import { ensureRunAccessConfigured, setRunAccessCookie } from '@/lib/runAccess';
import { NextRequest, NextResponse } from 'next/server';
import { sessionUser } from '@/lib/telegramSession';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get('completed');
    const difficulty = searchParams.get('difficulty');
    const sort = searchParams.get('sort') || 'date'; // 'date' | 'points'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const userId = sessionUser(request);
    if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
    const where: Record<string, unknown> = { userId };
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
    const limited = enforceRateLimit(request, 'runs:create', { limit: 20, windowMs: 60_000 });
    if (limited) return limited;
    ensureRunAccessConfigured();

    const body = await request.json();
    const { formation, difficulty, draftMode, ratingMode, eraFilter, eraStartYear, eraEndYear, teamName, clubFilter, nationalityFilter } = body;
    const userId = sessionUser(request);
    if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
    const gameMode = body.gameMode || 'classic';
    if (nationalityFilter || !['classic', 'single_club'].includes(gameMode)) {
      return NextResponse.json({ error: 'Этот режим скоро появится' }, { status: 400 });
    }
    if (gameMode === 'single_club' && !clubFilter) {
      return NextResponse.json({ error: 'Выберите клуб' }, { status: 400 });
    }
    if (clubFilter) {
      const club = await db.club.findUnique({
        where: { id: clubFilter },
        select: {
          id: true, nameRu: true, nameEn: true, city: true,
          seasons: {
            where: { season: { startYear: { gte: 2000, lte: 2025 }, endYear: { lte: 2026 } } },
            select: { players: { select: { playerId: true, mainPosition: true } } },
          },
        },
      });
      if (!club) return NextResponse.json({ error: 'Клуб не найден' }, { status: 400 });
      if (gameMode === 'single_club' && !selectOneClubCandidates([club]).length) {
        return NextResponse.json({ error: 'Выберите клуб с достаточной историей и составом РПЛ за 2000–2026 годы' }, { status: 400 });
      }
    }

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

    // Resolve the user exclusively from the signed Telegram session.
    let dbUserId: string | undefined;
    const effectiveUserId = userId;
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

    await db.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } }).catch(() => undefined);

    // Create the game run
    const run = await db.gameRun.create({
      data: {
        formation: formation || '4-3-3',
        difficulty: safeDifficulty,
        draftMode: draftMode || 'squad_first',
        ratingMode: ratingMode || 'season',
        eraFilter: eraFilter || 'all',
        eraStartYear: eraStartYear ?? 2000,
        eraEndYear: eraEndYear ?? 2026,
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

    const response = NextResponse.json(runWithSlots, { status: 201 });
    setRunAccessCookie(response, run.id);
    return response;
  } catch (error) {
    console.error('Failed to create game run:', error);
    return NextResponse.json(
      { error: 'Failed to create game run' },
      { status: 500 },
    );
  }
}
