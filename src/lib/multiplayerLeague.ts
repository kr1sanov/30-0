import type { TableEntry } from './simulation';

export type LeagueTeam = { id: string; name: string; strength: number; participant?: boolean; isHuman?: boolean; forfeited?: boolean };
export type LeagueMatch = { opponent: string; opponentId: string; home: boolean; for: number; against: number; technical?: boolean };
export type LeagueRow = TableEntry & { participantId?: string; isHuman?: boolean; forfeited?: boolean };

/** One shared double round-robin: every score contributes to both teams' table. */
export function simulateMultiplayerLeague(teams: LeagueTeam[], play: (home: number, away: number) => { homeGoals: number; awayGoals: number }) {
  if (teams.length !== 16 || new Set(teams.map(team => team.id)).size !== 16) throw new Error('A league requires 16 unique teams');
  const matches: Record<string, LeagueMatch[]> = Object.fromEntries(teams.map(team => [team.id, []]));
  const rotation = [...teams];
  for (let leg = 0; leg < 2; leg++) {
    for (let round = 0; round < 15; round++) {
      for (let pair = 0; pair < 8; pair++) {
        const left = rotation[pair], right = rotation[15 - pair];
        const [home, away] = (round + pair + leg) % 2 ? [right, left] : [left, right];
        const technical = Boolean(home.forfeited || away.forfeited);
        const score = technical ? { homeGoals: home.forfeited ? 0 : 3, awayGoals: away.forfeited ? 0 : 3 } : play(home.strength, away.strength);
        // Two disqualified teams each receive a technical loss; neither earns a draw.
        matches[home.id].push({ opponent: away.name, opponentId: away.id, home: true, for: score.homeGoals, against: home.forfeited ? 3 : score.awayGoals, ...(technical ? { technical: true } : {}) });
        matches[away.id].push({ opponent: home.name, opponentId: home.id, home: false, for: score.awayGoals, against: away.forfeited ? 3 : score.homeGoals, ...(technical ? { technical: true } : {}) });
      }
      rotation.splice(1, 0, rotation.pop()!);
    }
  }
  const table: LeagueRow[] = teams.map(team => {
    const fixtures = matches[team.id];
    const won = fixtures.filter(m => m.for > m.against).length;
    const drawn = fixtures.filter(m => m.for === m.against).length;
    const goalsFor = fixtures.reduce((total, m) => total + m.for, 0);
    const goalsAgainst = fixtures.reduce((total, m) => total + m.against, 0);
    return { position: 0, name: team.name, ...(team.participant ? { participantId: team.id, isHuman: team.isHuman, forfeited: Boolean(team.forfeited) } : {}), played: fixtures.length, won, drawn, lost: fixtures.length - won - drawn, goalsFor, goalsAgainst, goalDifference: goalsFor - goalsAgainst, points: won * 3 + drawn };
  });
  table.sort((a,b) => Number(a.forfeited || false) - Number(b.forfeited || false) || b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
  table.forEach((team, index) => { team.position = index + 1; });
  return { table, matches };
}
