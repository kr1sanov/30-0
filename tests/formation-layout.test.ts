import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMATIONS, FORMATION_DISPLAY_ORDER, getPitchColumn } from '../src/lib/positions.ts';

test('setup offers the same twelve formation choices in the reference order', () => {
  assert.equal(FORMATION_DISPLAY_ORDER.length, 12);
  assert.deepEqual(new Set(FORMATION_DISPLAY_ORDER), new Set(FORMATIONS.map(({ id }) => id)));
  assert.ok(FORMATION_DISPLAY_ORDER.includes('4-1-2-1-2'));
  assert.ok(!FORMATION_DISPLAY_ORDER.includes('4-1-4-1' as never));
});

test('left and right fullbacks render on the matching side of the pitch', () => {
  const formation = FORMATIONS.find(({ id }) => id === '4-3-3');
  assert.ok(formation);

  // Formation slots are recorded right-to-left; pitch coordinates are rendered
  // from the team's perspective, so the right-back belongs on screen-right.
  assert.equal(formation.slots[1].position, 'ПЗ');
  assert.equal(getPitchColumn(18), 82);
  assert.equal(formation.slots[4].position, 'ЛЗ');
  assert.equal(getPitchColumn(82), 18);
});

test('wingbacks in 3-5-2 are mirrored consistently with the draft slot order', () => {
  const formation = FORMATIONS.find(({ id }) => id === '3-5-2');
  assert.ok(formation);
  assert.equal(formation.slots[4].position, 'ПФЗ');
  assert.equal(getPitchColumn(10), 90);
  assert.equal(formation.slots[8].position, 'ЛФЗ');
  assert.equal(getPitchColumn(90), 10);
});

