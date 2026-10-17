import { runTeamName } from '@/lib/runTeamName';
import { db } from '@/lib/db';
import { selectOneClubCandidates } from '@/lib/rplClubSelection';
import { FORMATIONS } from '@/lib/positions';
import { enforceRateLimit } from '@/lib/rateLimit';
import { ensureRunAccessConfigured, setRunAccessCookie } from '@/lib/runAccess';
import { NextRequest, NextResponse } from 'next/server';
import { sessionUser } from '@/lib/telegramSession';
import { challengeSucceeded, findWeeklyChallenge } from '@/lib/weeklyChallenges';
import { visibleChallenge } from '@/lib/challengeCatalog';
import { getArchiveAccess } from '@/lib/challengeAccess';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get('completed');
    const difficulty = searchParams.get('difficulty');
    const mode = searchParams.get('mode');
    const sort = searchParams.get('sort') || 'date'; // 'date' | 'points'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const userId = sessionUser(request);
    if (!userId) return NextResponse.json({ error: 'Войди через Telegram' }, { status: 401 });
    const where: Record<string, unknown> = { userId };
    if (completed === 'true') {
      where.completed = true;
    }
    if (difficulty && ['easy', 'normal', 'hard'].includes(difficulty)) {
      where.difficulty = difficulty;
    }
    if (mode === 'multiplayer') where.OR = [{ multiplayerSeat: { isNot: null } }, { multiplayerRoomCode: { not: null } }];
    if (mode === 'single_club') { where.multiplayerRoomCode = null; where.multiplayerSeat = { is: null }; where.gameMode = 'single_club'; }
    if (mode === 'classic') { where.multiplayerRoomCode = null; where.multiplayerSeat = { is: null }; where.gameMode = 'classic'; }
    if (mode === 'challenge') { where.multiplayerRoomCode = null; where.multiplayerSeat = { is: null }; where.gameMode = { in: ['challenge_vagner', 'challenge_dzyuba', 'challenge_cska_blitz', 'challenge_akron_keeper'] }; }

    const orderBy: Record<string, string>[] =
      sort === 'points'
        ? [{ points: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];

    const include = {
        slots: {
          orderBy: { slotPosition: 'asc' },
        },
        multiplayerSeat: { select: { roomCode: true, room: { select: { seriesRootCode: true, seriesTargetWins: true, seats: {
          select: { userId: true, name: true, isBot: true, user: { select: { username: true } } },
        } } } } },
      } as const;
    const runs = await db.gameRun.findMany({ where, include, orderBy, take: limit });
    const selected = searchParams.get('selected');
    if (selected && /^[A-Za-z0-9_-]{1,100}$/.test(selected) && !runs.some(run => run.id === selected)) {
      const requested = await db.gameRun.findFirst({ where: { id: selected, userId, completed: true }, include });
      if (requested) runs.push(requested);
    }

    const clubIds = [...new Set(runs.flatMap((run) => run.clubFilter ? [run.clubFilter] : []))];
    const clubs = clubIds.length
      ? await db.club.findMany({ where: { id: { in: clubIds } }, select: { id: true, nameRu: true } })
      : [];
    const clubNames = new Map(clubs.map((club) => [club.id, club.nameRu]));

    const historyKey = (run: typeof runs[number]) => run.multiplayerSeat?.room.seriesRootCode || run.multiplayerRoomCode || run.multiplayerSeat?.roomCode;
    const grouped = runs.filter((run, index) => !historyKey(run) || runs.findIndex(other => historyKey(other) === historyKey(run)) === index);
    return NextResponse.json(grouped.map((run) => ({
      ...run,
      multiplayerSeat: historyKey(run) ? { roomCode: run.multiplayerSeat?.roomCode || run.multiplayerRoomCode } : null,
      seriesRounds: historyKey(run) ? runs.filter(other => historyKey(other) === historyKey(run)).map(other => ({ id: other.id, round: other.multiplayerRound, points: other.points, position: other.position, slots: other.slots })) : [],
      opponents: run.multiplayerSeat?.room.seats
        .filter(seat => seat.userId !== userId)
        .map(seat => seat.isBot ? seat.name : seat.user?.username ? `@${seat.user.username}` : seat.name) ?? [],
      gameMode: historyKey(run) ? 'multiplayer' : run.gameMode.startsWith('challenge_') ? 'challenge' : run.clubFilter ? 'single_club' : 'classic',
      challengeId: run.gameMode.startsWith('challenge_') ? run.gameMode : null,
      challengeIssueId: run.challengeIssueId,
      challengeSucceeded: run.challengeIssueId && run.completed
        ? (() => { const issue = findWeeklyChallenge(run.challengeIssueId); return issue ? challengeSucceeded(issue, run) : false; })()
        : null,
      clubName: run.clubFilter ? clubNames.get(run.clubFilter) ?? null : null,
    })));
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
    const { formation, difficulty, draftMode, ratingMode, eraFilter, eraStartYear, eraEndYear, clubFilter: requestedClubFilter, nationalityFilter } = body;
    const userId = sessionUser(request);
    if (!userId) return NextResponse.json({ error: 'Войди через Telegram' }, { status: 401 });
    const gameMode = body.gameMode || 'classic';
    const clubFilter = gameMode === 'single_club' ? requestedClubFilter : undefined;
    if (nationalityFilter || !['classic', 'single_club', 'challenge_vagner', 'challenge_dzyuba', 'challenge_cska_blitz', 'challenge_akron_keeper'].includes(gameMode)) {
      return NextResponse.json({ error: 'Этот режим скоро появится' }, { status: 400 });
    }
    const opponentSeasonYear = body.opponentSeasonYear;
    if (opponentSeasonYear !== undefined && opponentSeasonYear !== null && (!Number.isInteger(opponentSeasonYear) || opponentSeasonYear < 2006 || opponentSeasonYear > 2026)) return NextResponse.json({ error: 'Выбери сезон из списка' }, { status: 400 });
    const isWeeklyChallenge = gameMode.startsWith('challenge_');
    const issue = isWeeklyChallenge && typeof body.challengeIssueId === 'string'
      ? await visibleChallenge(body.challengeIssueId) : null;
    if (isWeeklyChallenge && (!issue || issue.mode !== gameMode)) {
      return NextResponse.json({ error: 'Выбери действующий челлендж' }, { status: 400 });
    }
    if (issue && (issue.visibility === 'archived' || (!issue.forceOpen && new Date(issue.endsAt).getTime() <= Date.now()))) {
      const access = await getArchiveAccess(userId);
      if (!access.unlockedUntil) return NextResponse.json({ error: 'Архив закрыт. Пригласи одного игрока, чтобы открыть его на 24 часа.' }, { status: 403 });
    }
    if (gameMode === 'single_club' && !clubFilter) {
      return NextResponse.json({ error: 'Выбери клуб' }, { status: 400 });
    }
    if (clubFilter) {
      const club = await db.club.findUnique({
        where: { id: clubFilter },
        select: {
          id: true, nameRu: true, nameEn: true, city: true, oneClubHidden: true, oneClubShown: true,
          seasons: {
            where: { players: { some: {} } },
            select: { season: { select: { startYear: true } }, players: { select: { playerId: true, mainPosition: true } } },
          },
        },
      });
      if (!club) return NextResponse.json({ error: 'Клуб не найден' }, { status: 400 });
      if (gameMode === 'single_club' && !selectOneClubCandidates([club]).length) {
        return NextResponse.json({ error: 'Выбери клуб с достаточным составом и игроками на всех линиях' }, { status: 400 });
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

    const names = issue?.featuredNames || (gameMode === 'challenge_vagner' ? [['Vagner Love', 'Вагнер Лав']]
      : gameMode === 'challenge_dzyuba' ? [['Artem Dzyuba', 'Артём Дзюба', 'Артем Дзюба']] : []);
    const cards = await Promise.all(names.map(async fullNames => {
      const card = await db.playerSeason.findFirst({
      where: { player: { fullName: { in: fullNames } } }, orderBy: [{ primeRating: 'desc' }, { rating: 'desc' }, { id: 'asc' }],
      include: { player: true, clubSeason: { include: { season: true } } },
    });
      if (card) return card;
      if (issue?.hero === 'akron_keeper') return {
        id: 'challenge-card:terekhovskiy:2026-10-13', rating: 90, primeRating: 90, mainPosition: 'ВР', otherPositions: '', nationality: 'Россия',
        player: { fullName: 'Ignat Terekhovskiy', lastName: 'Terekhovskiy', alias: null, nationality: 'Россия' },
        clubSeason: { season: { startYear: 2026 } },
      };
      return null;
    }));
    if (cards.some(card => !card)) return NextResponse.json({ error: 'Карточка игрока отсутствует в базе' }, { status: 503 });
    const featuredBySlot = new Map<number, NonNullable<typeof cards[number]>>();
    for (const card of cards) if (card) {
      const positions = [card.mainPosition, ...(card.otherPositions || '').split(',').map(p => p.trim())];
      const index = formationData.slots.findIndex((slot, i) => !featuredBySlot.has(i) && positions.includes(slot.position));
      if (index < 0) return NextResponse.json({ error: 'Для карточек челленджа нужна другая схема' }, { status: 400 });
      featuredBySlot.set(index, card);
    }

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

    const [owner, selectedClub] = await Promise.all([db.user.findUnique({ where: { id: userId } }), clubFilter ? db.club.findUnique({ where: { id: clubFilter } }) : null]);
    // Create the game run
    const run = await db.gameRun.create({
      data: {
        opponentSeasonYear: gameMode === 'single_club' ? opponentSeasonYear ?? null : null,
        formation: formation || '4-3-3',
        difficulty: safeDifficulty,
        draftMode: draftMode || 'squad_first',
        gameMode,
        ...(issue ? { challengeIssueId: issue.id } : {}),
        // Weekly challenges always draft and simulate with each player's verified prime rating.
        ratingMode: isWeeklyChallenge ? 'prime' : ratingMode || 'season',
        eraFilter: gameMode === 'single_club' ? 'all' : eraFilter || 'all',
        eraStartYear: gameMode === 'single_club' ? 2000 : eraStartYear ?? 2006,
        eraEndYear: gameMode === 'single_club' ? 2100 : eraEndYear ?? 2026,
        rerollsTotal,
        rerollsUsed: 0,
        completed: false,
        teamName: runTeamName(gameMode, selectedClub?.nameRu, owner?.username, owner?.displayName),
        ...(clubFilter ? { clubFilter } : {}),
        ...(nationalityFilter ? { nationalityFilter } : {}),
        ...(dbUserId ? { userId: dbUserId } : {}),
      },
    });

    // Create 11 game slots from the formation
    const slotsData = formationData.slots.map((slot, index) => {
      const featured = featuredBySlot.get(index);
      return ({
      runId: run.id,
      slotPosition: `${slot.position}_${index}`,
      isCompatible: true,
      ...(featured ? {
        playerSeasonId: featured.id,
        playerSeasonYear: featured.clubSeason.season.startYear,
        playerName: featured.player.alias || featured.player.fullName,
        playerLastName: featured.player.alias || featured.player.lastName,
        playerRating: featured.rating,
        playerPrimeRating: featured.primeRating || featured.rating,
        playerPosition: featured.mainPosition,
        playerOtherPositions: featured.otherPositions,
        playerNationality: featured.nationality || featured.player.nationality,
      } : {}),
    }); });

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
