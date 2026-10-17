import test from 'node:test';
import assert from 'node:assert/strict';
import { selectHistoricalSeason } from '../src/lib/historicalSeason.ts';
import { retentionDue, retentionKey } from '../src/lib/retention.ts';
import { runTeamName } from '../src/lib/runTeamName.ts';
import { localizePlayerName, isFootballMononym } from '../src/lib/footballNames.ts';
import { campaignPeriod } from '../src/lib/campaignContent.ts';
test('historical selection preserves the requested season and retries, and covers the full catalog', () => {
 const seasons = [2006,2010,2024,2025].map(startYear => ({startYear}));
 assert.equal(selectHistoricalSeason(seasons,'a',2010)?.startYear,2010);
 assert.equal(selectHistoricalSeason(seasons,'a',2011),undefined);
 assert.deepEqual(selectHistoricalSeason(seasons,'same'),selectHistoricalSeason(seasons.toReversed(),'same'));
 assert.deepEqual(new Set(Array.from({length:100},(_,i)=>selectHistoricalSeason(seasons,`run-${i}`)?.startYear)),new Set(seasons.map(s=>s.startYear)));
});
test('return triggers send one due stage per inactivity period and restart on renewed activity',()=>{
 const activity = new Date('2026-10-01T10:00:00Z');
 const at = (days:number) => new Date(+activity+days*86400000);
 assert.equal(retentionDue('return_3',activity,at(2.99)),false);
 for (const day of [3,7,10,30]) assert.deepEqual([3,7,10,30].filter(d=>retentionDue(`return_${d}`,activity,at(day))),[day]);
 assert.equal(retentionDue('return_30',activity,at(37)),false);
 assert.notEqual(retentionKey('c','u',activity),retentionKey('c','u',at(1)));
 assert.equal(campaignPeriod('return_3',at(4),null),null);
});
test('team identity is isolated by mode and verified Russian spellings keep real surnames',()=>{
 assert.equal(runTeamName('single_club','ПФК ЦСКА','user','Name'),'ПФК ЦСКА');
 assert.equal(runTeamName('classic',null,'user','Name'),'@user');
 assert.equal(runTeamName('challenge_vagner',null,'user','Name'),'Моя команда');
 assert.equal(localizePlayerName('Manfred Ugalde','ru'),'Манфред Угальде');
 assert.equal(localizePlayerName('Giorgiy Shelia','ru'),'Гиорги Шелия');
 assert.equal(isFootballMononym('Гиорги Шелия'),false);
});
