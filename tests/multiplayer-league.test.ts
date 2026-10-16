import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateMultiplayerLeague, type LeagueTeam } from '../src/lib/multiplayerLeague.ts';
const teams = (): LeagueTeam[] => Array.from({ length: 16 }, (_, i) => ({ id: String(i), name: `team ${i}`, strength: 80, participant: i < 3, isHuman: i < 2 }));
test('a shared league has 30 games per team, mirrored home/away fixtures and a balanced full table', () => {
  const league = simulateMultiplayerLeague(teams(), () => ({ homeGoals: 2, awayGoals: 1 }));
  assert.equal(league.table.length, 16);
  for (const [id, matches] of Object.entries(league.matches)) {
    assert.equal(matches.length, 30);
    assert.equal(matches.filter(m => m.home).length, 15);
    assert.equal(new Set(matches.map(m => m.opponentId)).size, 15);
    for (const match of matches) {
      const mirrored = league.matches[match.opponentId].find(m => m.opponentId === id && m.home !== match.home)!;
      assert.equal(mirrored.for, match.against); assert.equal(mirrored.against, match.for);
    }
  }
  for (const row of league.table) { assert.equal(row.points, 45); assert.equal(row.played, 30); assert.equal(row.won, 15); assert.equal(row.lost, 15); }
  assert.equal(league.table.reduce((n,t) => n+t.goalsFor,0), league.table.reduce((n,t) => n+t.goalsAgainst,0));
});
test('a disqualified squad receives thirty 0–3 defeats and cannot earn a series/league place above an active club', () => {
  const roster = teams(); roster[0].forfeited = true;
  const { matches, table } = simulateMultiplayerLeague(roster, () => ({ homeGoals: 0, awayGoals: 0 }));
  assert.ok(matches['0'].every(m => m.for === 0 && m.against === 3 && m.technical));
  const row = table.find(t => t.participantId === '0')!;
  assert.deepEqual([row.position,row.points,row.won,row.drawn,row.lost,row.goalsFor,row.goalsAgainst], [16,0,0,0,30,0,90]);
  assert.ok(matches['1'].filter(m => m.opponentId === '0').every(m => m.for === 3 && m.against === 0));
});
test('double disqualification gives both teams technical defeats without invented wins or draws', () => {
  const roster = teams(); roster[0].forfeited = true; roster[1].forfeited = true;
  const { matches, table } = simulateMultiplayerLeague(roster, () => ({ homeGoals: 1, awayGoals: 1 }));
  for (const id of ['0','1']) { assert.ok(matches[id].every(m => m.for === 0 && m.against === 3)); assert.equal(table.find(t=>t.participantId===id)?.points,0); }
});
