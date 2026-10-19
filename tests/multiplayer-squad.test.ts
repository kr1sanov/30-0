import test from 'node:test';
import assert from 'node:assert/strict';
import { completedSquad } from '../src/lib/multiplayerSquad.ts';
const slot = { slotPosition: 'НП_10', playerName: 'Test Player', playerLastName: 'Player', playerRating: 72, playerPrimeRating: 88, playerSeasonYear: 2025, playerPosition: 'НП', playerOtherPositions: 'ЛВ, ПВ' };
const run = { formation: '4-3-3', slots: [slot, { ...slot, slotPosition: 'ВР_0', playerName: null, playerRating: null, playerPrimeRating: null }] };
test('opponents drafts stay private until the room has completed', () => {
  for (const status of ['lobby','drafting','closed']) assert.equal(completedSquad(status,'prime',run),null);
  assert.equal(completedSquad('completed','season',null),null);
});
test('completed snapshots retain slot order, missing players and the selected card level', () => {
  const squad = completedSquad('completed','prime',run)!;
  assert.equal(squad.players[0].slot,'ВР_0');
  assert.equal(squad.players[0].name,null);
  assert.equal(squad.players[1].rating,88);
  assert.equal(squad.players[1].season,2025);
  assert.deepEqual(squad.players[1].otherPositions,['ЛВ','ПВ']);
  assert.equal(completedSquad('completed','season',run)!.players[1].rating,72);
  assert.equal(run.slots[0].slotPosition,'НП_10');
});
