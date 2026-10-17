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
  const runImport = suffix => execFileSync(process.execPath, ['scripts/import-rpl-2022-2025.mjs', '--apply', `--backup=/tmp/roster-regression-${process.pid}-${Date.now()}-${suffix}.json`], { env: process.env, stdio: 'pipe' });
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
      const name=club===0&&i===0?'Maksim Borisko':club===0&&i===6?'Ivan Oblyakov':club===1&&i===0?'Тереховский Игнат':`QA Player ${club}-${i}`;
      await db.player.create({data:{id:`qa-p-${club}-${i}`,fullName:name,lastName:name==='Тереховский Игнат'?'Тереховский':name}});
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
  assert.ok(challenge.slots.some(s=>s.playerName==='Тереховский Игнат'&&s.playerPrimeRating===85));
  await api('/api/admin/challenges','PATCH',{id:issue,visibility:'hidden'},true);
  assert.ok(!(await api('/api/challenges')).active.some(i=>i.id===issue));
  await api('/api/runs','POST',challengeBody,false,400);
  await api('/api/admin/challenges','PATCH',{id:'2026-10-10-vagner',visibility:'hidden'},true);
  assert.ok(!(await api('/api/challenges')).active.some(i=>i.id==='2026-10-10-vagner'));
  await api('/api/admin/challenges','PATCH',{id:issue,visibility:'archived'},true);
  const archived = await api('/api/challenges');
  assert.ok(archived.archive.some(i=>i.id===issue)); assert.ok(!archived.active.some(i=>i.id===issue));
  await api('/api/runs','POST',challengeBody,false,403);
  await api('/api/admin/challenges','PATCH',{id:issue,visibility:'open'},true);
  assert.ok((await api('/api/challenges')).active.some(i=>i.id===issue));
  console.log('PASS challenge archive, restore and access guards');
  await api('/api/admin/challenges','PATCH',{id:'2026-10-17-cska_blitz',visibility:'open'},true);
  const blitz=await api('/api/runs','POST',{gameMode:'challenge_cska_blitz',challengeIssueId:'2026-10-17-cska_blitz',formation:'4-3-3'},false,201);
  assert.equal(blitz.slots.filter(slot=>slot.playerSeasonId).length,2);
  assert.ok(blitz.slots.some(slot=>slot.playerName==='Ivan Oblyakov'));
  assert.ok(blitz.slots.some(slot=>slot.playerName==='Maksim Borisko'&&slot.playerPosition==='ВР'));
  const oneBody = {gameMode:'single_club',clubFilter:'qa-club-0',formation:'4-3-3',ratingMode:'prime',opponentSeasonYear:2025};
  const oldSave = await api('/api/runs','POST',oneBody,false,201);
  const newSave = await api('/api/runs','POST',{...oneBody,clubFilter:'qa-club-1'},false,201);
  assert.equal(newSave.ratingMode,'prime'); assert.equal(newSave.opponentSeasonYear,2025);
  assert.equal((await api('/api/runs/active?mode=single_club')).activeRun.id,newSave.id);
  assert.equal((await api('/api/runs/active?mode=latest')).activeRun.id,newSave.id);
  assert.equal((await api(`/api/runs/active?mode=single_club&runId=${oldSave.id}`)).activeRun.id,oldSave.id);
  assert.equal((await api(`/api/runs/active?mode=single_club&runId=${oldSave.id}&clubId=qa-club-1`)).activeRun,null);
  const classicClean = await api('/api/runs','POST',{gameMode:'classic',formation:'4-3-3',teamName:'Команда Вагнера'},false,201);
  assert.ok(classicClean.teamName !== 'Команда Вагнера');
  console.log('PASS latest empty one-club draft, exact save identity, prime mode and mode name isolation');
  const simulation=await db.gameRun.create({data:{id:'qa-simulation',userId:'qa-host',teamName:'QA XI',eraStartYear:2025,eraEndYear:2025,
    slots:{create:positions.slice(0,11).map((position,i)=>({slotPosition:`${position}_${i}`,playerSeasonId:`qa-ps-0-2025-${i}`,playerName:i===0?'Maksim Borisko':i===6?'Ivan Oblyakov':`QA Player 0-${i}`,playerRating:85,playerPrimeRating:90,playerPosition:position}))}}});
  const season=await api(`/api/runs/${simulation.id}/simulate`,'POST',{});
  assert.equal(season.opponentSeasonYear,2025);
  assert.equal(season.matches.length,30);assert.equal(season.table.length,16);
  for(const team of season.table) assert.equal(season.playerStats.filter(p=>p.team===team.name).reduce((sum,p)=>sum+p.goals,0),team.goalsFor);
  assert.ok(!season.playerStats.some(p=>p.name==='Maksim Borisko'));
  assert.ok((await db.gameRun.findUnique({where:{id:simulation.id}})).seasonResultJson);
  assert.ok(season.table.some(t=>t.isYou && t.name !== 'Моя команда'));
  const historical = await db.gameRun.create({data:{id:'qa-historical',userId:'qa-host',gameMode:'single_club',clubFilter:'qa-club-0',ratingMode:'prime',opponentSeasonYear:2025,
    slots:{create:positions.slice(0,11).map((position,i)=>({slotPosition:`${position}_${i}`,playerSeasonId:`qa-ps-0-2025-${i}`,playerName:`QA Player 0-${i}`,playerRating:60,playerPrimeRating:90,playerPosition:position}))}}});
  const past = await api(`/api/runs/${historical.id}/simulate`,'POST',{});
  assert.equal(past.opponentSeasonYear,2025);assert.equal(past.table.find(t=>t.isYou).name,'Клуб 0');
  assert.ok(past.players.every(p=>p.rating===90));
  assert.ok(past.playerStats.filter(p=>p.team==='Club 1').every(p=>p.name.includes('QA') || p.name==='Тереховский Игнат'));
  console.log('PASS real historical opponents, selected club identity, prime ratings and scorer/assist totals');


  // A real timeout must preserve the unfinished XI and record technical defeats.
  const fullRun = await db.gameRun.create({data:{id:'qa-full-xi',userId:'qa-host',gameMode:'multiplayer',multiplayerRoomCode:'QAFRTL',multiplayerRound:1,formation:'4-3-3',slots:{create:positions.slice(0,11).map((position,i)=>({slotPosition:`${position}_${i}`,playerSeasonId:`qa-ps-0-2025-${i}`,playerName:`QA Player 0-${i}`,playerRating:80,playerPrimeRating:88,isCompatible:true}))}}});
  const incompleteRun = await db.gameRun.create({data:{id:'qa-incomplete-xi',userId:'qa-guest',gameMode:'multiplayer',multiplayerRoomCode:'QAFRTL',multiplayerRound:1,formation:'4-3-3',slots:{create:positions.slice(0,11).map((position,i)=>({slotPosition:`${position}_${i}`}))}}});
  await db.multiplayerRoom.create({data:{code:'QAFRTL',hostUserId:'qa-host',seatCount:2,status:'drafting',eraStartYear:2025,eraEndYear:2025,seats:{create:[{id:'qa-full-seat',userId:'qa-host',runId:fullRun.id,name:'Complete XI',ready:true,pickDeadline:new Date(Date.now()+60000)},{id:'qa-empty-seat',userId:'qa-guest',runId:incompleteRun.id,name:'Incomplete XI',ready:false,pickDeadline:new Date(Date.now()+60000)}]}}});
  assert.equal((await api('/api/multiplayer/rooms/QAFRTL')).status,'drafting');
  await db.multiplayerSeat.updateMany({where:{roomCode:'QAFRTL'},data:{pickDeadline:new Date(Date.now()-1000)}});
  const finishedRoom = await api('/api/multiplayer/rooms/QAFRTL');
  assert.equal(finishedRoom.status,'completed');
  const forfeited = finishedRoom.results.find(result=>result.id==='qa-empty-seat');
  assert.equal(forfeited.forfeited,true);assert.equal(forfeited.position,16);assert.equal(forfeited.points,0);
  assert.deepEqual([forfeited.wins,forfeited.draws,forfeited.losses,forfeited.goalsFor,forfeited.goalsAgainst],[0,0,30,0,90]);
  assert.ok(forfeited.matches.every(match=>match.for===0&&match.against===3));
  assert.equal(forfeited.table.length,16);assert.equal(new Set(forfeited.matches.map(match=>match.opponentId)).size,15);
  assert.equal(await db.gameSlot.count({where:{runId:incompleteRun.id,playerSeasonId:{not:null}}}),0);
  const completed = finishedRoom.results.find(result=>result.id==='qa-full-seat');
  assert.equal(completed.matches.length,30);
  assert.ok(completed.matches.filter(match=>match.opponentId==='qa-empty-seat').every(match=>match.for===3&&match.against===0));
  const persisted = JSON.parse((await db.gameRun.findUnique({where:{id:fullRun.id}})).seasonResultJson);
  assert.equal(persisted.table.length,16);assert.equal(persisted.matches.length,30);
  assert.equal(persisted.playerStats.filter(player=>player.team==='Complete XI').reduce((total,player)=>total+player.goals,0),completed.goalsFor);
  const selectedHistory = await api('/api/runs?limit=1&selected=qa-round-1');
  assert.ok(selectedHistory.some(run => run.id === 'qa-round-1' || run.seriesRounds?.some(round => round.id === 'qa-round-1')));
  const privateHistory = await api('/api/runs?limit=1&selected=qa-incomplete-xi');
  assert.ok(!privateHistory.some(run => run.id === 'qa-incomplete-xi'));
  console.log('PASS full multiplayer league, no early simulation, technical forfeits and persisted history');

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
  const resultMessage = claim.messages.find(message => message.image);
  assert.ok(resultMessage);
  const imageBytes = Buffer.from(resultMessage.image,'base64');
  assert.equal(imageBytes.readUInt32BE(16),1200);assert.equal(imageBytes.readUInt32BE(20),760);
  assert.ok(resultMessage.keyboard.inline_keyboard[0][0].url.includes('startapp=result_'));
  console.log('PASS relay leases, acknowledgement guard and durable opt-out');
  const campaigns = (await api('/api/admin/campaigns','GET',undefined,true)).campaigns;
  assert.equal(campaigns.filter(c=>/^return_(3|7|10|30)$/.test(c.cadence)).length,4);
  await db.telegramOutbox.deleteMany();
  const inactiveAt = new Date(Date.now()-4*86400000);
  await db.user.update({where:{id:'qa-host'},data:{notifyNews:true,lastActiveAt:inactiveAt}});
  const retention = await db.telegramOutbox.create({data:{eventKey:`campaign:return-default-3:inactive:qa-host:${+inactiveAt}:qa-host`,userId:'qa-host',campaignId:'return-default-3',category:'news',text:'Вернись',textEn:'Come back',startParam:''}});
  assert.ok((await worker({action:'claim',tgIds:[900001]})).messages.some(m=>m.id===retention.id));
  await db.telegramOutbox.update({where:{id:retention.id},data:{attempts:0,availableAt:new Date()}});
  await db.user.update({where:{id:'qa-host'},data:{lastActiveAt:new Date()}});
  assert.ok(!(await worker({action:'claim',tgIds:[900001]})).messages.some(m=>m.id===retention.id));
  assert.equal((await db.telegramOutbox.findUnique({where:{id:retention.id}})).status,'skipped');
  console.log('PASS editable retention templates and send-time cancellation after player returns');
  // Full editable identities/cards, ownership validation and immutable finished snapshots.
  const identity={firstName:'Иван',lastName:'Проверкин',alias:null,nationality:'Россия',birthYear:1994};
  const chosen=(await api('/api/admin/players/qa-p-0-6','GET',undefined,true)).player;
  const existingCard=chosen.seasons[0];
  const editedSeason=Object.fromEntries(['id','rating','primeRating','primeSeason','mainPosition','otherPositions','nationality','age','shirtNumber','matches','goals','assists','sourceName','sourcePosition','sourceUrl'].map(k=>[k,existingCard[k]]));
  editedSeason.rating=81;editedSeason.primeRating=90;editedSeason.otherPositions=null;
  await api('/api/admin/players/qa-p-0-6','PATCH',{player:identity,season:editedSeason},true);
  assert.equal((await db.player.findUnique({where:{id:'qa-p-0-6'}})).fullName,'Иван Проверкин');
  assert.equal((await db.playerSeason.findUnique({where:{id:editedSeason.id}})).rating,81);
  assert.ok(await db.appSetting.findUnique({where:{key:`player-card-manual:${editedSeason.id}`}}));
  await api('/api/admin/players/qa-p-0-7','PATCH',{season:editedSeason},true,400);
  console.log('PASS full player/card editor and card ownership guard');

  const grantTime=new Date();
  for(let n=0;n<5;n++) await db.gameRun.create({data:{id:`qa-archive-access-${n}`,userId:'qa-host',completed:true,completedAt:grantTime,wins:10,gameMode:n===4?'single_club':'classic',clubFilter:n===4?'qa-club-0':null,slots:{create:Array.from({length:11},(_,i)=>({slotPosition:`${positions[i]}_${i}`,playerSeasonId:`qa-ps-0-2025-${i}`}))}}});
  const access=(await api('/api/challenges')).archiveProgress;
  assert.equal(access.completedSeasons,5);assert.equal(access.distinctModes,2);
  assert.equal(Date.parse(access.unlockedUntil)-(+grantTime),3*86400000);
  await api('/api/admin/challenges','PATCH',{id:issue,visibility:'archived',patch:{minimumGoals:7,minimumPoints:0,requireTitle:false}},true);
  const archiveCatalog=await api('/api/admin/challenges','GET',undefined,true);
  assert.equal(new Set(archiveCatalog.issues.map(i=>i.id)).size,archiveCatalog.issues.length);
  assert.equal(archiveCatalog.issues.find(i=>i.id===issue).minimumGoals,7);
  await api('/api/runs','POST',challengeBody,false,201);
  await api('/api/admin/challenges','PATCH',{id:issue,visibility:'open',patch:{startsAt:new Date(Date.now()-2*86400000).toISOString(),endsAt:new Date(Date.now()-86400000).toISOString()}},true);
  // Opening an expired challenge creates a fresh explicit window, not an expiry bypass.
  assert.ok(Date.parse((await api('/api/admin/challenges','GET',undefined,true)).issues.find(i=>i.id===issue).endsAt)>Date.now());
  await api('/api/admin/challenges','PATCH',{id:issue,patch:{endsAt:new Date(Date.now()-1).toISOString(),startsAt:new Date(Date.now()-100000).toISOString()}},true);
  assert.ok((await api('/api/challenges')).archive.some(i=>i.id===issue));
  console.log('PASS five-season archive grant, 72h duration, editable objectives and expiry');
  console.log('ALL INTEGRATION SCENARIOS PASSED');
} finally { server.kill(); await db.$disconnect(); }
