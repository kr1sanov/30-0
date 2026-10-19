export interface CompletedSquad {
  formation: string;
  players: { slot: string; name: string | null; surname: string | null; rating: number | null; season: number | null; position: string | null; otherPositions: string[] }[];
}

/** Only finished rooms reveal opponents' draft snapshots, including legacy rooms. */
export function completedSquad(status: string, ratingMode: string, run: {
  formation: string;
  slots: { slotPosition: string; playerName: string | null; playerLastName: string | null; playerRating: number | null; playerPrimeRating: number | null; playerSeasonYear: number | null; playerPosition: string | null; playerOtherPositions: string | null }[];
} | null): CompletedSquad | null {
  if (status !== 'completed' || !run) return null;
  return { formation: run.formation, players: [...run.slots]
    .sort((a,b) => Number(a.slotPosition.split('_').at(-1)) - Number(b.slotPosition.split('_').at(-1)))
    .map(slot => ({ slot: slot.slotPosition, name: slot.playerName, surname: slot.playerLastName,
      rating: ratingMode === 'prime' ? slot.playerPrimeRating ?? slot.playerRating : slot.playerRating,
      season: slot.playerSeasonYear, position: slot.playerPosition,
      otherPositions: slot.playerOtherPositions?.split(',').map(value => value.trim()).filter(Boolean) ?? [] })) };
}
