import test from 'node:test';
import assert from 'node:assert/strict';
import { gameReturnCohorts } from '../src/lib/adminRetention.ts';
test('game return is measured on Moscow calendar days with mature cohorts only',()=>{
 const users=[
  {id:'old',createdAt:new Date('2026-10-01T20:59:00Z'),runs:[{createdAt:new Date('2026-10-01T21:01:00Z')},{createdAt:new Date('2026-10-07T21:00:00Z')}]},
  {id:'new',createdAt:new Date('2026-10-10T09:00:00Z'),runs:[]},
 ];
 const [d1,d7]=gameReturnCohorts(users,new Date('2026-10-10T12:00:00Z'));
 assert.deepEqual(d1,{day:1,eligible:1,returned:1,rate:100});
 assert.deepEqual(d7,{day:7,eligible:1,returned:1,rate:100});
 assert.equal(gameReturnCohorts([],new Date())[0].rate,null);
});
