/** Import every supplied 2006–2009 Markdown roster row, without inventing data.
 * Preflight: node scripts/import-rpl-2006-2009.mjs
 * Production: node --env-file=.env scripts/import-rpl-2006-2009.mjs --apply --backup=/private/roster.json
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const directory = resolve(process.argv.find(a => a.startsWith('--data-dir='))?.slice(11) ?? 'docs/research/rpl-2006-2009');
const years = [2006, 2007, 2008, 2009];
const expected = [439, 437, 443, 486];
const clubIds = {
  'Lokomotiv Moscow': '100765', 'CSKA Moscow': '315', 'Krylia Sovetov Samara': '100764',
  'Zenit Saint Petersburg': '100769', 'Torpedo Moscow': '100768',
  'Saturn Ramenskoye': '110225', 'Spartak Moscow': '100767', 'FC Moscow': '110229',
  'Rubin Kazan': '110227', 'Amkar Perm': '110234', 'Rostov': '110231',
  'Dynamo Moscow': '312', 'Alania Vladikavkaz': '110230', 'Terek Grozny': '110109',
  'Tom Tomsk': '110233', 'Spartak Nalchik': '110103', 'Khimki': '110239',
  'Kuban Krasnodar': '110089',
};
const clubNames = {
  '100764': 'Krylya Sovetov Samara', '100765': 'Lokomotiv Moscow', '315': 'CSKA Moscow',
  '100769': 'Zenit St. Petersburg', '100768': 'Torpedo Moskva', '110225': 'Saturn Ramenskoye',
  '100767': 'Spartak Moscow', '110229': 'FC Moskva', '110227': 'Rubin Kazan',
  '110234': 'Amkar Perm', '110231': 'FC Rostov', '312': 'Dynamo Moscow',
  '110230': 'Alania Vladikavkaz', '110109': 'Akhmat Grozny', '110233': 'Tom Tomsk',
  '110103': 'Spartak Nalchik', '110239': 'FC Khimki', '110089': 'Kuban Krasnodar',
};
const positions = {
  GK: ['ВР'], CB: ['ЦЗ'], LCB: ['ЦЗ'], RCB: ['ЦЗ'], SW: ['ЦЗ'],
  LB: ['ЛЗ', 'ЛФЗ'], RB: ['ПЗ', 'ПФЗ'], LWB: ['ЛФЗ', 'ЛЗ'], RWB: ['ПФЗ', 'ПЗ'],
  CDM: ['ОП'], LCDM: ['ОП'], RCDM: ['ОП'], LDM: ['ОП'], RDM: ['ОП'],
  CM: ['ЦП'], LCM: ['ЦП'], RCM: ['ЦП'], CAM: ['АП'], LCAM: ['АП', 'ЛП'], RCAM: ['АП', 'ПП'],
  LM: ['ЛП'], RM: ['ПП'], LWM: ['ЛП', 'ЛВ'], RWM: ['ПП', 'ПВ'],
  LAM: ['АП', 'ЛП'], RAM: ['АП', 'ПП'], LW: ['ЛВ'], RW: ['ПВ'],
  LF: ['ЛВ', 'НП'], RF: ['ПВ', 'НП'], ST: ['НП'], LS: ['НП'], RS: ['НП'], CF: ['ЦН', 'НП'],
};
const digest = value => createHash('sha256').update(value).digest('hex').slice(0, 20);
const unique = values => new Set(values).size === values.length;
const snapshots = years.map((year, index) => {
  const source = readFileSync(resolve(directory, `Russia Premier League ${year}.md`), 'utf8');
  const clubs = [];
  for (const [lineIndex, line] of source.split(/\r?\n/).entries()) {
    if (line.startsWith('## ')) {
      const name = line.slice(3).trim();
      if (!name) throw new Error(`${year}:${lineIndex + 1}: empty club name`);
      clubs.push({ name, id: clubIds[name] ? `fifaindex-club-${clubIds[name]}` : `archive-club-${digest(name)}`, players: [] });
      continue;
    }
    if (!line.startsWith('|')) continue;
    const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
    if (cells.length !== 4) throw new Error(`${year}:${lineIndex + 1}: malformed roster row`);
    if (cells[0] === 'Player' || /^[-: ]+$/.test(cells[0])) continue;
    const [name, sourcePosition, overallText, potentialText] = cells;
    const rating = Number(overallText), potential = Number(potentialText);
    if (!clubs.length || !name || !positions[sourcePosition] ||
        !/^\d+$/.test(overallText) || !/^\d+$/.test(potentialText) ||
        rating < 1 || rating > 99 || potential < 1 || potential > 99) {
      throw new Error(`${year}:${lineIndex + 1}: invalid player, position or rating: ${line}`);
    }
    const club = clubs.at(-1);
    const occurrence = club.players.filter(player => player.name === name).length;
    // The 2008 file contains two different Dmitriy Smirnov cards in one club.
    // Keep both rows and identities rather than dropping one on a unique constraint.
    club.players.push({ name, sourcePosition, rating, potential, mapped: positions[sourcePosition], occurrence,
      id: `rpl-${year}-${digest(club.name)}-row-${lineIndex + 1}` });
  }
  const cards = clubs.flatMap(club => club.players);
  if (clubs.length !== 16 || cards.length !== expected[index] || !unique(clubs.map(club => club.name)) ||
      !unique(cards.map(card => card.id)) || clubs.some(club => !club.players.length)) {
    throw new Error(`${year}: expected 16 clubs and ${expected[index]} source cards; got ${clubs.length}/${cards.length}`);
  }
  return { year, clubs, cards, sha256: createHash('sha256').update(source).digest('hex') };
});
const allCards = snapshots.flatMap(snapshot => snapshot.cards);
for (const snapshot of snapshots) console.log(`${snapshot.year}: ${snapshot.clubs.length} clubs, ${snapshot.cards.length} source rows; sha256 ${snapshot.sha256}`);
console.log(`${allCards.length} source cards; ${new Set(snapshots.flatMap(s => s.clubs.map(c => c.id))).size} distinct clubs.`);
if (!process.argv.includes('--apply')) process.exit(0);

const backupArgument = process.argv.find(a => a.startsWith('--backup='));
if (!backupArgument || !process.env.DATABASE_URL) throw new Error('DATABASE_URL and --backup=path required');
const backupPath = resolve(backupArgument.slice(9));
if (existsSync(backupPath)) throw new Error('Backup path already exists');
const db = new PrismaClient();
try {
  const found = await db.season.findMany({ where: { startYear: { in: years } }, select: { id: true, startYear: true } });
  const byYear = new Map(found.map(season => [season.startYear, season]));
  const alreadyInstalled = await Promise.all(snapshots.map(async snapshot => {
    const seasonId = byYear.get(snapshot.year)?.id;
    if (!seasonId) return false;
    const cards = await db.playerSeason.findMany({ where: { clubSeason: { seasonId } }, select: {
      id: true, rating: true, primeRating: true, mainPosition: true, otherPositions: true,
      sourceName: true, sourcePosition: true, clubSeason: { select: { clubId: true } },
    } });
    const expectedCards = new Map(snapshot.clubs.flatMap(club => club.players.map(p => [p.id, { ...p, clubId: club.id }])));
    return cards.length === snapshot.cards.length && cards.every(card => {
      const source = expectedCards.get(card.id);
      return source && card.clubSeason.clubId === source.clubId && card.sourceName === source.name &&
        card.sourcePosition === source.sourcePosition && card.rating === source.rating &&
        card.primeRating === source.potential && card.mainPosition === source.mapped[0] &&
        (card.otherPositions ?? '') === source.mapped.slice(1).join(',');
    });
  }));
  if (alreadyInstalled.every(Boolean)) { console.log('All four supplied editions already installed.'); process.exit(0); }
  if (snapshots.slice(0, 3).some((snapshot, i) => byYear.has(snapshot.year) && !alreadyInstalled[i])) {
    throw new Error('Existing 2006–2008 season differs from supplied file; manual review required');
  }
  // The original FIFA 10 archive has a 2009 edition. Replace only its roster;
  // GameSlot stores drafted-player snapshots without a PlayerSeason foreign key.
  const legacy2009 = byYear.get(2009);
  if (legacy2009 && !alreadyInstalled[3] && legacy2009.id !== 'rpl-2009-fifa10') {
    throw new Error(`Unknown 2009 season ${legacy2009.id}; refusing replacement`);
  }
  const affectedIds = found.map(season => season.id);
  const oldClubSeasons = await db.clubSeason.findMany({ where: { seasonId: { in: affectedIds } } });
  const backup = {
    seasons: await db.season.findMany({ where: { id: { in: affectedIds } } }),
    clubSeasons: oldClubSeasons,
    playerSeasons: await db.playerSeason.findMany({ where: { clubSeasonId: { in: oldClubSeasons.map(c => c.id) } } }),
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), { flag: 'wx', mode: 0o600 });
  const selected = snapshots.filter((_, i) => !alreadyInstalled[i]);
  const wantedClubs = new Map(selected.flatMap(snapshot => snapshot.clubs.map(club => [club.id, club.name])));
  const knownClubs = new Map((await db.club.findMany({ where: { id: { in: [...wantedClubs.keys()] } } })).map(club => [club.id, club]));
  const names = [...new Set(selected.flatMap(s => s.cards.map(p => p.name)))];
  const knownPlayers = await db.player.findMany({ where: { fullName: { in: names } }, select: { id: true, fullName: true } });
  const playersByName = new Map();
  for (const player of knownPlayers) playersByName.set(player.fullName, [...(playersByName.get(player.fullName) ?? []), player.id]);
  const identity = p => p.occurrence ? `archive-player-${digest(`${p.name}:duplicate:${p.id}`)}` :
    (playersByName.get(p.name)?.length === 1 ? playersByName.get(p.name)[0] : `archive-player-${digest(p.name)}`);
  const newPlayers = new Map(selected.flatMap(s => s.cards.map(p => [identity(p), p.name])));
  for (const player of knownPlayers) newPlayers.delete(player.id);

  await db.$transaction(async tx => {
    for (const snapshot of selected) {
      const seasonId = byYear.get(snapshot.year)?.id;
      if (seasonId) {
        await tx.playerSeason.deleteMany({ where: { clubSeason: { seasonId } } });
        await tx.clubSeason.deleteMany({ where: { seasonId } });
      } else {
        await tx.season.create({ data: { id: `rpl-${snapshot.year}`, startYear: snapshot.year,
          endYear: snapshot.year, label: String(snapshot.year), matchesPerTeam: 30 } });
      }
    }
    await tx.club.createMany({ data: [...wantedClubs].filter(([id]) => !knownClubs.has(id)).map(([id, name]) => ({
      id, nameRu: name, nameEn: name,
    })) });
    await tx.clubSeason.createMany({ data: selected.flatMap(s => s.clubs.map(club => ({
      id: `rpl-${s.year}-club-${digest(club.id)}`, clubId: club.id,
      seasonId: byYear.get(s.year)?.id ?? `rpl-${s.year}`, sourceName: club.name,
    }))) });
    for (let offset = 0; offset < newPlayers.size; offset += 100) {
      await tx.player.createMany({ data: [...newPlayers].slice(offset, offset + 100).map(([id, name]) => ({
        id, fullName: name, lastName: name === 'Vagner Love' ? name : name.split(' ').at(-1),
      })) });
    }
    const records = selected.flatMap(s => s.clubs.flatMap(club => club.players.map(p => ({
      id: p.id, clubSeasonId: `rpl-${s.year}-club-${digest(club.id)}`, playerId: identity(p),
      sourceName: p.name, sourcePosition: p.sourcePosition, mainPosition: p.mapped[0],
      otherPositions: p.mapped.slice(1).join(',') || null, rating: p.rating,
      primeRating: p.potential, primeSeason: String(s.year),
    }))));
    for (let offset = 0; offset < records.length; offset += 100)
      await tx.playerSeason.createMany({ data: records.slice(offset, offset + 100) });
    for (const snapshot of snapshots) {
      const count = await tx.playerSeason.count({ where: { clubSeason: { season: { startYear: snapshot.year } } } });
      if (count !== snapshot.cards.length) throw new Error(`${snapshot.year}: imported ${count}/${snapshot.cards.length} source rows`);
    }
  }, { timeout: 300000, maxWait: 30000 });
  console.log(`Imported ${selected.map(s => s.year).join(', ')}; ${allCards.length} source cards now available in 2006–2009.`);
} finally { await db.$disconnect(); }
