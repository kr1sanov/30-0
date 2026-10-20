import test from 'node:test';
import assert from 'node:assert/strict';
import { playerCardSchema, playerIdentitySchema } from '../src/lib/adminPlayerData.ts';
import { normalizePlayerSearch, playerDuplicateGroups } from '../src/lib/playerDuplicates.ts';
import { registerFootballNames, localizePlayerName } from '../src/lib/footballNames.ts';
const card={rating:80,primeRating:90,mainPosition:'ЦП',otherPositions:'АП,ОП'};
test('season card validates primary and multiple positions and allows missing prime',()=>{
 assert.ok(playerCardSchema.safeParse(card).success);
 assert.ok(playerCardSchema.safeParse({...card,primeRating:0}).success);
 for(const bad of [{...card,primeRating:79},{...card,otherPositions:'ЦП,АП'},{...card,otherPositions:'АП,АП'},{...card,otherPositions:'INVALID'},{...card,rating:101}]) assert.equal(playerCardSchema.safeParse(bad).success,false);
});
test('bilingual identity is bounded and rejects markup and invalid birth year',()=>{
 const p={firstName:'Ivan',lastName:'Oblyakov',firstNameRu:'Иван',lastNameRu:'Обляков',alias:null,aliasRu:null,nationality:'Россия',birthYear:1998};
 assert.ok(playerIdentitySchema.safeParse(p).success);
 assert.equal(playerIdentitySchema.safeParse({...p,lastNameRu:'<script>'}).success,false);
 assert.equal(playerIdentitySchema.safeParse({...p,birthYear:2200}).success,false);
});
test('search normalizes known English variants, Cyrillic and reversed names',()=>{
 assert.equal(normalizePlayerSearch('Aleksey'),normalizePlayerSearch('Алексей'));
 const base={lastName:'Smirnov',nationality:null,mergedIntoId:null,seasons:[{clubSeasonId:'one'}]};
 const groups=playerDuplicateGroups([{...base,id:'a',fullName:'Dmitriy Smirnov',birthYear:1980},{...base,id:'b',fullName:'Smirnov Dmitriy',birthYear:1980}]);
 assert.equal(groups.length,1);assert.equal(groups[0].safe,true);
});
test('duplicate audit never automatically merges unknown or conflicting identities',()=>{
 const make=(id:string,birthYear:number|null,nationality:string|null=null)=>({id,fullName:'Dmitriy Smirnov',lastName:'Smirnov',birthYear,nationality,seasons:[{clubSeasonId:'same'}]});
 for(const pair of [[make('a',null),make('b',null)],[make('a',1980),make('b',1982)],[make('a',1980,'Россия'),make('b',1980,'Бразилия')]]) assert.equal(playerDuplicateGroups(pair)[0].safe,false);
 assert.equal(playerDuplicateGroups([{...make('a',1980),mergedIntoId:'b'},make('b',1980)]).length,0);
});
test('duplicate target favours the identity present in more seasons',()=>{
 const group=playerDuplicateGroups([{id:'short',fullName:'Ivan Oblyakov',lastName:'Oblyakov',birthYear:1998,seasons:[]},{id:'common',fullName:'Ivan Oblyakov',lastName:'Oblyakov',birthYear:1998,seasons:[{clubSeasonId:'1'},{clubSeasonId:'2'}]}])[0];
 assert.equal(group.targetId,'common');assert.equal(group.safe,true);
});
test('manual name corrections override automatic transliteration in both languages',()=>{
 registerFootballNames([['Custom Player','Правильное Имя']]);
 assert.equal(localizePlayerName('Custom Player','ru'),'Правильное Имя');
 assert.equal(localizePlayerName('Правильное Имя','en'),'Custom Player');
 registerFootballNames([]);
});
test('archive duplicates require a continuous same-club career, playing line and non-conflicting source identity',()=>{
 const make=(id:string,year:number,clubId='club',mainPosition='ЦЗ')=>({id,fullName:'Sergey Ignashevich',lastName:'Ignashevich',birthYear:null,seasons:[{clubSeasonId:`${clubId}-${year}`,clubId,year,mainPosition,rating:75}]});
 assert.equal(playerDuplicateGroups([make('archive-a',2009),make('fifaindex-player-1',2010)])[0].safe,true);
 assert.equal(playerDuplicateGroups([make('archive-a',2009),make('fifaindex-player-1',2010,'other')])[0].safe,false);
 assert.equal(playerDuplicateGroups([make('archive-a',2009),make('fifaindex-player-1',2010,'club','ВР')])[0].safe,false);
 assert.equal(playerDuplicateGroups([make('fifaindex-player-1',2009),make('fifaindex-player-2',2010)])[0].safe,false);
 assert.equal(playerDuplicateGroups([make('archive-a',2010),make('fifaindex-player-1',2010)])[0].safe,false);
});
