import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionUser } from "@/lib/telegramSession";
import { getClubTheme } from "@/lib/clubThemes";
import { publicAvatarUrl } from "@/lib/avatarUrl";
import { playerPath } from "@/lib/profileLinks";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  if (!id || id.length > 100)
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  const select = {
    id: true,
    displayName: true,
    firstName: true,
    lastName: true,
    username: true,
    photoUrl: true,
    avatarColor: true,
    statusEmoji: true,
    createdAt: true,
    referralCount: true,
    profileStatsJson: true,
  } as const;
  const user =
    (await db.user.findUnique({ where: { id }, select })) ??
    (/^[a-zA-Z0-9_]{5,32}$/.test(id)
      ? await db.user.findFirst({
          where: { provider: "telegram", username: id },
          select,
        })
      : null);
  if (!user)
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  const viewer = sessionUser(request);
  const [runs, outgoing, incoming, friendships] = await Promise.all([
    db.gameRun.findMany({
      where: { userId: user.id, completed: true },
      select: {
        points: true,
        position: true,
        gameMode: true,
        wins: true,
        goalsFor: true,
        formation: true,
        clubFilter: true,
        losses: true,
        goalsAgainst: true,
        multiplayerSeat: { select: { id: true } },
      },
    }),
    viewer && viewer !== user.id
      ? db.friendship.findUnique({
          where: { fromId_toId: { fromId: viewer, toId: user.id } },
          select: { status: true },
        })
      : null,
    viewer && viewer !== user.id
      ? db.friendship.findUnique({
          where: { fromId_toId: { fromId: user.id, toId: viewer } },
          select: { status: true },
        })
      : null,
    db.friendship.findMany({
      where: {
        OR: [{ fromId: user.id }, { toId: user.id }],
        status: "accepted",
      },
      select: { fromId: true, toId: true },
      take: 100,
    }),
  ]);
  const friendIds = [
    ...new Set(
      friendships.map((friendship) =>
        friendship.fromId === user.id ? friendship.toId : friendship.fromId,
      ),
    ),
  ];
  const friends = friendIds.length
    ? await db.user.findMany({
        where: { id: { in: friendIds } },
        select: {
          id: true,
          displayName: true,
          username: true,
          photoUrl: true,
          avatarColor: true,
          statusEmoji: true,
        },
      })
    : [];
  const clubCounts = new Map<string, number>();
  const formationCounts = new Map<string, number>();
  for (const run of runs) {
    if (run.gameMode === "single_club" && run.clubFilter)
      clubCounts.set(run.clubFilter, (clubCounts.get(run.clubFilter) ?? 0) + 1);
    formationCounts.set(
      run.formation,
      (formationCounts.get(run.formation) ?? 0) + 1,
    );
  }
  const favoriteClubId = [...clubCounts].sort((a, b) => b[1] - a[1])[0]?.[0];
  const club = favoriteClubId
    ? await db.club.findUnique({
        where: { id: favoriteClubId },
        select: { nameRu: true, nameEn: true, logoUrl: true },
      })
    : null;
  const favoriteClub = club
    ? {
        ...club,
        games: clubCounts.get(favoriteClubId!) ?? 0,
        colors: getClubTheme(club.nameRu),
      }
    : null;
  let stats: Record<string, unknown> = {};
  try {
    stats = JSON.parse(user.profileStatsJson || "{}");
  } catch {
    /* Old progress may be malformed. */
  }
  const storedAchievements = Array.isArray(stats.achievements)
    ? stats.achievements.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const achievements = new Set(storedAchievements);
  const clubs = runs.filter((run) => run.gameMode === "single_club");
  if (clubs.some((run) => run.position === 1)) achievements.add("club_crown");
  if (clubs.some((run) => run.position === 1 && run.losses === 0))
    achievements.add("club_unbeaten");
  if (clubs.some((run) => run.position === 1 && (run.goalsFor ?? 0) >= 60))
    achievements.add("club_attack");
  if (
    new Set(
      clubs
        .filter((run) => run.position === 1)
        .map((run) => run.clubFilter)
        .filter(Boolean),
    ).size >= 3
  )
    achievements.add("club_collector");
  if (user.referralCount > 0) achievements.add("referral_invite");
  const multiplayerSeats = await db.multiplayerSeat.findMany({
    where: { userId: user.id, run: { completed: true } },
    include: {
      run: { select: { position: true, losses: true } },
      room: {
        select: {
          seats: { select: { isBot: true, userId: true } },
          seriesWinnerKey: true,
        },
      },
    },
  });
  const humanDuels = multiplayerSeats.filter((seat) =>
    seat.room.seats.some(
      (opponent) => !opponent.isBot && opponent.userId !== user.id,
    ),
  );
  if (humanDuels.some((seat) => seat.run?.position === 1))
    achievements.add("duel_winner");
  if (
    humanDuels.some(
      (seat) => seat.run?.position === 1 && seat.run?.losses === 0,
    )
  )
    achievements.add("duel_unbeaten");
  if (humanDuels.filter((seat) => seat.run?.position === 1).length >= 3)
    achievements.add("duel_hat_trick");
  if (
    multiplayerSeats.some(
      (seat) =>
        seat.room.seriesWinnerKey === (seat.seriesMemberKey ?? seat.userId),
    )
  )
    achievements.add("multiplayer_series_champion");
  const totalWins = runs.reduce((sum, run) => sum + (run.wins ?? 0), 0);
  const totalGoals = runs.reduce((sum, run) => sum + (run.goalsFor ?? 0), 0);
  const friendshipStatus =
    outgoing?.status === "accepted" || incoming?.status === "accepted"
      ? "friends"
      : outgoing?.status === "pending"
        ? "outgoing"
        : incoming?.status === "pending"
          ? "incoming"
          : "none";
  return NextResponse.json(
    {
      id: user.id,
      path: playerPath(user),
      displayName: user.displayName,
      photoUrl: publicAvatarUrl(user.photoUrl),
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatarColor: user.avatarColor,
      statusEmoji: user.statusEmoji,
      createdAt: user.createdAt,
      seasons: runs.length,
      titles: runs.filter((run) => run.position === 1).length,
      perfectSeasons: runs.filter((run) => run.wins === 30).length,
      bestPoints: Math.max(0, ...runs.map((run) => run.points ?? 0)),
      totalWins,
      totalGoals,
      winRate: runs.length
        ? Math.round((totalWins / (runs.length * 30)) * 100)
        : 0,
      avgGoals: runs.length ? Math.round(totalGoals / runs.length) : 0,
      favoriteFormation:
        [...formationCounts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      favoriteClub,
      achievements: [...achievements],
      friends: friends.map((friend) => ({
        ...friend,
        photoUrl: publicAvatarUrl(friend.photoUrl),
      })),
      modes: Object.fromEntries(
        ["classic", "single_club", "multiplayer", "challenges"].map((mode) => [
          mode,
          runs.filter((run) =>
            mode === "multiplayer"
              ? Boolean(run.multiplayerSeat)
              : mode === "challenges"
                ? run.gameMode.startsWith("challenge_")
                : !run.multiplayerSeat && run.gameMode === mode,
          ).length,
        ]),
      ),
      friendshipStatus,
      own: viewer === user.id,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
