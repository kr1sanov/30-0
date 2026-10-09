import test from 'node:test';
import assert from 'node:assert/strict';
import { squadAchievementIds } from '../src/lib/squadAchievements.ts';
import type { DraftSlot, GameConfig } from '../src/lib/types.ts';

const squad = (nationalities: string[]): DraftSlot[] => nationalities.map((nationality, i) => ({
  position: `position-${i}`, positionLabel: '', category: 'mid', playerId: `player-${i}`, playerNationality: nationality,
}));
const config = { gameMode: 'classic', formation: '4-3-3' } as GameConfig;

test('Brazilian squad achievement uses recorded nationality and team goals', () => {
  const slots = squad(['Brazilian', 'Бразилия', 'Brazil', ...Array(8).fill('Россия')]);
  assert.deepEqual(squadAchievementIds(slots, config, { goalsFor: 50, wins: 10, position: 2 }), ['samba_attack']);
  assert.deepEqual(squadAchievementIds(slots, config, { goalsFor: 49, wins: 10, position: 2 }), []);
  assert.deepEqual(squadAchievementIds(slots.slice(1), config, { goalsFor: 90, wins: 30, position: 1 }), []);
});

test('club achievements require the selected one-club mode', () => {
  const slots = squad(Array(11).fill('Россия'));
  const result = { goalsFor: 60, wins: 20, position: 1 };
  assert.deepEqual(squadAchievementIds(slots, { ...config, gameMode: 'single_club', clubFilter: '315', clubName: 'CSKA Moscow' }, result), ['russian_core', 'army_season']);
  assert.deepEqual(squadAchievementIds(slots, { ...config, gameMode: 'single_club', clubFilter: '100769', clubName: 'Зенит' }, result), ['russian_core', 'neva_attack']);
  assert.deepEqual(squadAchievementIds(slots, config, result), ['russian_core']);
});
