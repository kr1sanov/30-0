/** Run only against an isolated SQLite database and a local production server. */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
if (!process.env.DATABASE_URL?.includes('30-0-regression')) throw new Error('An isolated regression database is required');
const base = process.env.REGRESSION_BASE_URL || 'http://127.0.0.1:3400';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error('Local server required');
const db = new PrismaClient();
const secret = process.env.TELEGRAM_SESSION_SECRET;
const adminSecret = process.env.ADMIN_SESSION_SECRET;
function signed(claims, key) { const body = Buffer.from(JSON.stringify(claims)).toString('base64url'); return `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`; }
const cookie = 'rpl_telegram_session='+signed({ sub:'qa-host', exp:Math.floor(Date.now()/1000)+3600 },secret);
const adminCookie = 'rpl_admin_session='+signed({ sub:'qa-admin', ver:1, exp:Date.now()+3600000 },adminSecret);
async function api(path, method='GET', body, admin=false, expected=200) {
  const response = await fetch(base+path, { method, headers:{ cookie:admin ? adminCookie : cookie, origin:base, 'Content-Type':'application/json' }, body:body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json(); assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`); return data;
}
async function worker(body, expected=200) {
  const response = await fetch(base+'/api/telegram/worker',{ method:'POST', headers:{'Content-Type':'application/json','X-30-0-Worker':process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET},body:JSON.stringify(body)});
  const data=await response.json(); assert.equal(response.status,expected,JSON.stringify(data)); return data;
}
const positions=['ВР','ЦЗ','ЦЗ','ПЗ','ЛЗ','ОП','ЦП','ЦП','ЛВ','ПВ','НП','ЦН'];
const server = spawn(process.execPath, ['.next/standalone/server.js'], { env: { ...process.env, PORT: new URL(base).port, HOSTNAME: '127.0.0.1', NEXT_PUBLIC_BASE_URL: base, RUN_SESSION_SECRET: 'local-regression-run-signing-key-123', TGCLOUD_TOKEN: 'app123:local-regression-no-network' }, stdio: ['ignore','pipe','pipe'] });
server.stderr.on('data', data => process.stderr.write(data));
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Local server startup timed out')), 30000);
    server.on('exit', code => { clearTimeout(timeout); reject(new Error('Local server exited '+code)); });
    server.stdout.on('data', data => { if (data.toString().includes('Ready')) { clearTimeout(timeout); resolve(); } });
  });
  for (const model of ['telegramOutbox','gameSlot','multiplayerSeat','multiplayerRoom','gameRun','playerSeason','player','clubSeason','season','club','adminCredential','appSetting','user']) await db[model].deleteMany();
  const runImport = suffix => execFileSync(process.execPath, ['scripts/import-rpl-2022-2025.mjs', '--apply', `--backup=/tmp/roster-regression-${process.pid}-${suffix}.json`], { env: process.env, stdio: 'pipe' });
  runImport('initial');
  const sourceCard = await db.playerSeason.findFirstOrThrow();
  await db.player.create({data:{id:'qa-admin-added-player',fullName:'QA Admin Added',lastName:'Added'}});
  await db.playerSeason.create({data:{id:'qa-admin-added-card',playerId:'qa-admin-added-player',clubSeasonId:sourceCard.clubSeasonId,rating:77,primeRating:80,mainPosition:'ВР'}});
  runImport('repeat');
  assert.equal(await db.playerSeason.count(),1681);
  assert.equal((await db.playerSeason.findUnique({where:{id:'qa-admin-added-card'}})).rating,77);
  console.log('PASS repeated roster import preserves additional admin cards');
  for (const model of ['playerSeason','player','clubSeason','season','club']) await db[model].deleteMany();
  await db.user.createMany({data:[{id:'qa-host',provider:'telegram',providerId:'telegram_900001',displayName:'QA host',telegramChatStarted:true},{id:'qa-guest',provider:'telegram',providerId:'telegram_900002',displayName:'QA guest'}]});
  await db.adminCredential.create({data:{username:'qa-admin',role:'admin',passwordHash:'unused-local-fixture',mustChangePassword:false}});
  for(let year=2017;year<=2025;year++) await db.season.create({data:{id:`qa-season-${year}`,startYear:year,endYear:year,label:String(year)}});
  for(let club=0;club<16;club++) {
    await db.club.create({data:{id:`qa-club-${club}`,nameRu:`Клуб ${club}`,nameEn:`Club ${club}`}});
    const years=club===0?Array.from({length:9},(_,i)=>2017+i):club===1?Array.from({length:8},(_,i)=>2018+i):[2025];
    for(const year of years) await db.clubSeason.create({data:{id:`qa-cs-${club}-${year}`,clubId:`qa-club-${club}`,seasonId:`qa-season-${year}`}});
    for(let i=0;i<24;i++) {
      const name=club===0&&i===0?'Maksim Borisko':club===0&&i===6?'Ivan Oblyakov':`QA Player ${club}-${i}`;
      await db.player.create({data:{id:`qa-p-${club}-${i}`,fullName:name,lastName:name}});
      for(const year of years) await db.playerSeason.create({data:{id:`qa-ps-${club}-${year}-${i}`,playerId:`qa-p-${club}-${i}`,clubSeasonId:`qa-cs-${club}-${year}`,rating:75+i%10,primeRating:85+i%5,mainPosition:positions[i%12]}});
    }
  }
  const clubs=await api('/api/clubs');
  // The mode endpoint wraps candidates in {clubs}.
  assert.ok(JSON.stringify(clubs).includes('qa-club-0'));
  const adminClubs=(await api('/api/admin/one-club','GET',undefined,true)).clubs;
  assert.equal(adminClubs.length,16);assert.equal(adminClubs.find(c=>c.id==='qa-club-1').oneClubHidden,true);
  await api('/api/admin/one-club','PATCH',{id:'qa-club-1',hidden:false},true);
  assert.equal((await api('/api/admin/one-club','GET',undefined,true)).clubs.find(c=>c.id==='qa-club-1').oneClubHidden,false);
  console.log('PASS One Club threshold and admin override');

  await db.multiplayerRoom.create({data:{code:'QATEST',hostUserId:'qa-host',seatCount:2,seriesTargetWins:2,draftStartAt:new Date(Date.now()-1000),seats:{create:[{id:'qa-seat-host',userId:'qa-host',name:'Host',ready:true,lastSeenAt:new Date()},{id:'qa-seat-guest',userId:'qa-guest',name:'Guest',ready:true,lastSeenAt:new Date(Date.now()-60000)}]}}});
  const stale=await api('/api/multiplayer/rooms/QATEST'); assert.equal(stale.seats.find(s=>!s.isYou).ready,false);assert.equal(stale.draftStartAt,null);
  await api('/api/multiplayer/rooms/QATEST/start','POST',{},false,409);
  await db.multiplayerSeat.updateMany({where:{roomCode:'QATEST'},data:{ready:true,lastSeenAt:new Date()}});
  await db.multiplayerRoom.update({where:{code:'QATEST'},data:{draftStartAt:new Date(Date.now()+1000)}});
  await api('/api/multiplayer/rooms/QATEST/presence','POST',{});
  assert.equal((await db.multiplayerSeat.findUnique({where:{id:'qa-seat-host'}})).ready,false);
  assert.equal((await db.multiplayerRoom.findUnique({where:{code:'QATEST'}})).draftStartAt,null);
  await db.multiplayerRoom.update({where:{code:'QATEST'},data:{draftStartAt:new Date(Date.now()-1000)}});
  await db.multiplayerSeat.updateMany({where:{roomCode:'QATEST'},data:{ready:true,lastSeenAt:new Date(Date.now()-2000)}});
  await api('/api/multiplayer/rooms/QATEST/start','POST',{},false,409);
  console.log('PASS stale presence, page leave and start guard');

  const roundResult=[{id:'qa-seat-host',name:'Host',rating:85,wins:20,draws:5,losses:5,points:65,goalsFor:60,goalsAgainst:25,matches:[{for:2,against:0}]},{id:'qa-seat-guest',name:'Guest',rating:80,wins:19,draws:5,losses:6,points:62,goalsFor:55,goalsAgainst:28,matches:[{for:0,against:2}]}];
  const r1=await db.gameRun.create({data:{id:'qa-round-1',userId:'qa-host',completed:true,completedAt:new Date(),points:65,position:1}});
  await db.multiplayerSeat.update({where:{id:'qa-seat-host'},data:{runId:r1.id}});
  await db.multiplayerRoom.update({where:{code:'QATEST'},data:{status:'completed',resultJson:JSON.stringify(roundResult),seriesScoreJson:JSON.stringify({'qa-host':{name:'Host',wins:1,seasonWins:20,points:65,isBot:false}})}});
  assert.equal((await api('/api/multiplayer/rooms/QATEST/next','POST',{round:1})).code,'QATEST');
  const continued=await db.multiplayerRoom.findUnique({where:{code:'QATEST'},include:{seats:true}});
  assert.equal(continued.seriesRound,2);assert.equal(continued.status,'lobby');assert.equal(continued.seats.length,2);assert.equal(JSON.parse(continued.roundsJson).length,1);assert.ok(continued.seats.every(s=>!s.ready&&!s.runId));
  await api('/api/multiplayer/rooms/QATEST/next','POST',{round:1},false,409);
  const r2=await db.gameRun.create({data:{id:'qa-round-2',userId:'qa-host',completed:true,completedAt:new Date(),points:67,position:1,multiplayerRoomCode:'QATEST',multiplayerRound:2,gameMode:'multiplayer'}});
  await db.multiplayerSeat.update({where:{id:'qa-seat-host'},data:{runId:r2.id,resultViewedAt:new Date()}});
  await db.multiplayerRoom.update({where:{code:'QATEST'},data:{status:'completed',resultJson:JSON.stringify(roundResult),seriesWinnerKey:'qa-host'}});
  const history=await api('/api/runs?mode=multiplayer');assert.equal(history.length,1);assert.equal(history[0].seriesRounds.length,2);
  const series=await api('/api/multiplayer/rooms/QATEST/series');assert.equal(series.rounds.length,2);
  console.log('PASS same-room continuation, archived rounds and grouped history');

  const issue='2026-10-17-akron_keeper';
  if (Date.now() >= Date.parse('2026-10-17T09:00:00Z')) await api('/api/admin/challenges','PATCH',{id:issue,visibility:'hidden'},true);
  assert.ok(!(await api('/api/challenges')).active.some(i=>i.id===issue));
  const challengeBody={gameMode:'challenge_akron_keeper',challengeIssueId:issue,formation:'4-3-3'};
  await api('/api/runs','POST',challengeBody,false,400);
  await api('/api/admin/challenges','PATCH',{id:issue,visibility:'open'},true);
  assert.ok((await api('/api/challenges')).active.some(i=>i.id===issue));
  const challenge=await api('/api/runs','POST',challengeBody,false,201);
  assert.ok(challenge.slots.some(s=>s.playerName==='Ignat Terekhovskiy'&&s.playerPrimeRating===90));
  await api('/api/admin/challenges','PATCH',{id:issue,visibility:'hidden'},true);
  assert.ok(!(await api('/api/challenges')).active.some(i=>i.id===issue));
  await api('/api/runs','POST',challengeBody,false,400);
  await api('/api/admin/challenges','PATCH',{id:'2026-10-10-vagner',visibility:'hidden'},true);
  assert.ok(!(await api('/api/challenges')).active.some(i=>i.id==='2026-10-10-vagner'));
  console.log('PASS hidden future challenges, manual opening and hidden start guard');
  await api('/api/admin/challenges','PATCH',{id:'2026-10-17-cska_blitz',visibility:'open'},true);
  const blitz=await api('/api/runs','POST',{gameMode:'challenge_cska_blitz',challengeIssueId:'2026-10-17-cska_blitz',formation:'4-3-3'},false,201);
  assert.equal(blitz.slots.filter(slot=>slot.playerSeasonId).length,2);
  assert.ok(blitz.slots.some(slot=>slot.playerName==='Ivan Oblyakov'));
  assert.ok(blitz.slots.some(slot=>slot.playerName==='Maksim Borisko'&&slot.playerPosition==='ВР'));
  const simulation=await db.gameRun.create({data:{id:'qa-simulation',userId:'qa-host',teamName:'QA XI',eraStartYear:2025,eraEndYear:2025,
    slots:{create:positions.slice(0,11).map((position,i)=>({slotPosition:`${position}_${i}`,playerSeasonId:`qa-ps-0-2025-${i}`,playerName:i===0?'Maksim Borisko':i===6?'Ivan Oblyakov':`QA Player 0-${i}`,playerRating:85,playerPrimeRating:90,playerPosition:position}))}}});
  const season=await api(`/api/runs/${simulation.id}/simulate`,'POST',{});
  assert.equal(season.matches.length,30);assert.equal(season.table.length,16);
  for(const team of season.table) assert.equal(season.playerStats.filter(p=>p.team===team.name).reduce((sum,p)=>sum+p.goals,0),team.goalsFor);
  assert.ok(!season.playerStats.some(p=>p.name==='Maksim Borisko'));
  assert.ok((await db.gameRun.findUnique({where:{id:simulation.id}})).seasonResultJson);
  console.log('PASS both CSKA starters and persisted scorer/assist totals for every team');


  const prefs={enabled:true,news:false,invitations:true,results:true,friends:true,friend_updates:true};
  await worker({action:'sync',records:[{tgId:900001,preferences:prefs,revision:2,started:true,language:'en',user:{}}]});
  const notice=await db.telegramOutbox.create({data:{eventKey:'qa:notice',userId:'qa-host',text:'Your friend request was accepted.',startParam:'profile_qa-guest',category:'friend_updates'}});
  const claim=await worker({action:'claim'});const notification=claim.messages.find(message=>message.id===notice.id);assert.ok(notification);assert.equal(notification.chatId,900001);
  assert.equal((await worker({action:'claim'})).messages.length,0);
  await worker({action:'ack',id:notification.id,attempt:99,ok:true});assert.equal((await db.telegramOutbox.findUnique({where:{id:notification.id}})).status,'pending');
  await worker({action:'ack',id:notification.id,attempt:notification.attempt,ok:true});assert.equal((await db.telegramOutbox.findUnique({where:{id:notification.id}})).status,'sent');
  await api('/api/users/notifications','PATCH',{friends:false});
  assert.equal((await worker({action:'patches'})).patches.length,1);
  await worker({action:'sync',records:[{tgId:900001,preferences:prefs,revision:3,started:true,language:'ru',user:{}}]});
  assert.equal((await api('/api/users/notifications')).preferences.friends,false);
  console.log('PASS relay leases, acknowledgement guard and durable opt-out');
  console.log('ALL INTEGRATION SCENARIOS PASSED');
} finally { server.kill(); await db.$disconnect(); }
