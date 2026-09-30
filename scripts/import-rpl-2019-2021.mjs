/** Install the user's 2019–2021 roster snapshots without touching older seasons.
 * Dry run: node scripts/import-rpl-2019-2021.mjs
 * Apply: node --env-file=.env scripts/import-rpl-2019-2021.mjs --apply --backup=/private/new-roster.json
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dataDir = resolve(process.argv.find(a => a.startsWith('--data-dir='))?.slice(11) ?? 'docs/research/rpl-2019-2021');
const snapshots = [2019, 2020, 2021].map(year => JSON.parse(readFileSync(resolve(dataDir, `season-${year}.json`), 'utf8')));
const expectedCards = [411, 391, 363];
const positionSet = new Set(['ВР','ЦЗ','ПЗ','ЛЗ','ПФЗ','ЛФЗ','ОП','ЦП','АП','ЛП','ПП','ЛВ','ПВ','НП','ЦН']);
const clubs = new Map();
const players = new Map();
const playerCards = [];
for (const [index, s] of snapshots.entries()) {
  if (s.year !== 2019 + index || Object.keys(s.clubCounts).length !== 16 || s.players.length !== expectedCards[index] ||
      Object.values(s.clubCounts).reduce((sum, count) => sum + count, 0) !== s.players.length ||
      new Set(s.players.map(p => `${p.clubId}:${p.sourcePlayerId}`)).size !== s.players.length) {
    throw new Error(`Incomplete roster edition ${2019 + index}`);
  }
  const observed = new Map();
  for (const p of s.players) {
    if (!p.name || !p.sourcePlayerId || !p.clubId || !s.clubCounts[p.clubName] ||
        !p.positions?.length || p.positions.some(pos => !positionSet.has(pos)) ||
        !Number.isInteger(p.rating) || p.rating < 1 || p.rating > 100 ||
        !Number.isInteger(p.potential) || p.potential < 1 || p.potential > 100 ||
        !Number.isInteger(p.number)) throw new Error(`Invalid card in ${s.year}: ${p.name}`);
    observed.set(p.clubName, (observed.get(p.clubName) ?? 0) + 1);
    const clubName = p.clubId === '110239' ? 'FC Khimki' : p.clubName;
    const previousClub = clubs.get(p.clubId);
    // Different edition spellings belong to one mapped club; sourceName retains each one.
    if (!previousClub) clubs.set(p.clubId, clubName);
    const previousPlayer = players.get(p.sourcePlayerId);
    if (previousPlayer && previousPlayer !== p.name) {
      // The historical registry is authoritative for FIFA IDs; retain existing spelling.
      if (p.sourcePlayerId.startsWith('name-') || p.sourcePlayerId.startsWith('ambiguous-')) throw new Error(`Player identity collision: ${p.sourcePlayerId}`);
    }
    if (!previousPlayer) players.set(p.sourcePlayerId, p.name);
    playerCards.push({ year: s.year, ...p });
  }
  if (JSON.stringify(Object.fromEntries(observed)) !== JSON.stringify(s.clubCounts)) throw new Error(`Club counts disagree in ${s.year}`);
  console.log(`${s.edition}: 16 clubs, ${s.players.length} player cards; ${s.positionAdjustments.length} position tokens require review`);
}
console.log(`${clubs.size} distinct clubs, ${players.size} distinct source identities, ${playerCards.length} cards.`);
if (!process.argv.includes('--apply')) process.exit(0);

const backupArg = process.argv.find(a => a.startsWith('--backup='));
if (!backupArg || !process.env.DATABASE_URL) throw new Error('DATABASE_URL and --backup=path required');
const backupPath = resolve(backupArg.slice(9));
if (existsSync(backupPath)) throw new Error('Backup path already exists');
const seasonIds = snapshots.map(s => `rpl-${s.year}`);
const db = new PrismaClient();
try {
  const existingSeasons = await db.season.findMany({ where: { OR: [{ id: { in: seasonIds } }, { startYear: { in: snapshots.map(s => s.year) } }] } });
  if (existingSeasons.length) {
    if (existingSeasons.length !== 3 || existingSeasons.some(s => !seasonIds.includes(s.id))) throw new Error('Existing 2019–21 season is not this import; manual review required');
    const stored = await db.playerSeason.findMany({ where: { clubSeason: { seasonId: { in: seasonIds } } }, select: {
      clubSeasonId: true, playerId: true, rating: true, primeRating: true, mainPosition: true, otherPositions: true, shirtNumber: true,
    } });
    const byCard = new Map(stored.map(p => [`${p.clubSeasonId}:${p.playerId}`, p]));
    const exact = stored.length === playerCards.length && playerCards.every(p => {
      const card = byCard.get(`rpl-${p.year}-club-${p.clubId}:fifaindex-player-${p.sourcePlayerId}`);
      return card && card.rating === p.rating && card.primeRating === p.potential &&
        card.mainPosition === p.positions[0] && (card.otherPositions || '') === p.positions.slice(1).join(',') &&
        card.shirtNumber === p.number;
    });
    if (exact) { console.log('All three editions already installed; no changes.'); process.exit(0); }
    throw new Error('Existing 2019–21 data differs from fixture; refusing overwrite');
  }
  const backup = {
    seasons: existingSeasons,
    clubs: await db.club.findMany({ where: { OR: [{ id: { in: [...clubs.keys()].map(id => `fifaindex-club-${id}`) } }, { nameRu: { in: [...clubs.values()] } }] } }),
    players: await db.player.findMany({ where: { id: { in: [...players.keys()].map(id => `fifaindex-player-${id}`) } } }),
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), { flag: 'wx', mode: 0o600 });
  const storedClubs = new Map(backup.clubs.map(c => [c.id, c]));
  const missingClubs = [...clubs].filter(([id]) => !storedClubs.has(`fifaindex-club-${id}`));
  const existingNames = new Set(backup.clubs.map(c => c.nameRu));
  for (const [, name] of missingClubs) if (existingNames.has(name)) throw new Error(`Club name already belongs to another identity: ${name}`);
  const knownPlayers = new Set(backup.players.map(p => p.id));

  await db.$transaction(async tx => {
    await tx.season.createMany({ data: snapshots.map(s => ({ id: `rpl-${s.year}`, startYear: s.year, endYear: s.year,
      label: String(s.year), matchesPerTeam: 30 })) });
    await tx.club.createMany({ data: missingClubs.map(([id, name]) => ({ id: `fifaindex-club-${id}`, nameRu: name, nameEn: name })) });
    await tx.clubSeason.createMany({ data: snapshots.flatMap(s => [...new Set(s.players.map(p => p.clubId))].map(clubId => ({
      id: `rpl-${s.year}-club-${clubId}`, clubId: `fifaindex-club-${clubId}`, seasonId: `rpl-${s.year}`,
      sourceName: s.players.find(p => p.clubId === clubId).clubName,
    }))) });
    const newPlayers = [...players].filter(([id]) => !knownPlayers.has(`fifaindex-player-${id}`));
    for (let offset = 0; offset < newPlayers.length; offset += 100) {
      await tx.player.createMany({ data: newPlayers.slice(offset, offset + 100).map(([id, name]) => ({
        id: `fifaindex-player-${id}`, fullName: name, lastName: name.split(' ').at(-1) || name,
        nationality: playerCards.find(p => p.sourcePlayerId === id)?.nationality ?? null,
      })) });
    }
    for (let offset = 0; offset < playerCards.length; offset += 100) {
      await tx.playerSeason.createMany({ data: playerCards.slice(offset, offset + 100).map(p => ({
        id: `rpl-${p.year}-club-${p.clubId}-player-${p.sourcePlayerId}`,
        playerId: `fifaindex-player-${p.sourcePlayerId}`,
        clubSeasonId: `rpl-${p.year}-club-${p.clubId}`,
        rating: p.rating, primeRating: p.potential, primeSeason: String(p.year),
        mainPosition: p.positions[0], otherPositions: p.positions.slice(1).join(',') || null,
        shirtNumber: p.number, sourceName: p.name, sourcePosition: p.sourcePositions.join(', '),
        nationality: p.nationality ?? null,
      })) });
    }
    const count = await tx.playerSeason.count({ where: { clubSeason: { seasonId: { in: seasonIds } } } });
    if (count !== playerCards.length) throw new Error(`Import incomplete: ${count} cards`);
  }, { timeout: 300000, maxWait: 30000 });
  console.log(`Imported ${playerCards.length} cards across three new editions. Backup: ${backupPath}`);
} finally { await db.$disconnect(); }
