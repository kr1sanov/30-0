import type { Prisma } from '@prisma/client';

// Eligibility needs positions and identity, not ratings, source metadata or biographies.
// Load full cards only for the club-season that wins the spin.
export const draftPoolSelect = {
  id: true,
  sourceName: true,
  club: { select: { nameRu: true } },
  season: { select: { label: true, startYear: true } },
  players: { select: {
    id: true, playerId: true, mainPosition: true, otherPositions: true, nationality: true,
    player: { select: { fullName: true, nationality: true } },
  } },
} as const satisfies Prisma.ClubSeasonSelect;
