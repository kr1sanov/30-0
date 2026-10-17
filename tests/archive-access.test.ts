import {test} from 'node:test';
import assert from 'node:assert/strict';
import {archiveProgress} from '../src/lib/archiveProgress.ts';
import {challengeStatus} from '../src/lib/challengeStatus.ts';
import {CLUB_MANAGER_IDS,MANAGERS,getManagersForClub} from '../src/lib/managers.ts';
const now=new Date('2026-10-17T15:00:00Z');
const runs=Array.from({length:5},(_,i)=>({mode:i===4?'single_club':'classic',completedAt:new Date(+now-(4-i)*3600000)}));
test('five seasons across two modes unlock exactly 72 hours, without sliding on reads',()=>{
 assert.equal(archiveProgress(runs,now).unlockedUntil,'2026-10-20T15:00:00.000Z');
 assert.equal(archiveProgress(runs,new Date(+now+72*3600000)).unlockedUntil,null);
 assert.equal(archiveProgress(runs.slice(0,4),now).completedSeasons,4);
 assert.equal(archiveProgress(runs.map(r=>({...r,mode:'classic'})),now).unlockedUntil,null);
 assert.equal(archiveProgress(runs,new Date(+now-1)).unlockedUntil,null);
});
test('new batches renew access and report fresh progress after expiry',()=>{
 const later=new Date(+now+4*86400000);
 const next=[...runs,...runs.map(r=>({...r,completedAt:new Date(+r.completedAt+4*86400000)}))];
 assert.equal(archiveProgress(next,later).unlockedUntil,new Date(+later+3*86400000).toISOString());
 assert.equal(archiveProgress(runs,new Date(+now+4*86400000)).completedSeasons,0);
});
test('expiry overrides open, manual archive overrides future dates',()=>{
 const base={visibility:'open' as const,startsAt:'2026-10-10T09:00:00Z',endsAt:'2026-10-17T09:00:00Z'};
 assert.equal(challengeStatus(base,now),'archived');
 assert.equal(challengeStatus({...base,visibility:'archived',endsAt:'2027-01-01T00:00:00Z'},now),'archived');
 assert.equal(challengeStatus({...base,visibility:'auto',startsAt:'2026-10-24T09:00:00Z',endsAt:'2026-10-31T09:00:00Z'},now),'scheduled');
});
test('expanded coach pools have bilingual names and resolve every unique club member',()=>{
 assert.ok(MANAGERS.length>120);
 assert.equal(new Set(MANAGERS.map(m=>m.id)).size,MANAGERS.length);
 for(const m of MANAGERS){assert.match(m.name,/[А-Яа-яЁё]/);assert.match(m.nameEn,/[A-Za-z]/);}
 for(const [id,ids]of Object.entries(CLUB_MANAGER_IDS)){assert.equal(new Set(ids).size,ids.length);assert.equal(getManagersForClub(id).length,ids.length);}
 assert.ok(getManagersForClub('315').some(m=>m.id==='gazzaev'));
 assert.ok(getManagersForClub('315').some(m=>m.id==='chelestini'));
 assert.ok(!getManagersForClub('315').some(m=>m.id==='carcedo'));
});
