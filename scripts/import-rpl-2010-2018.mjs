/** Validate and atomically install all nine supplied roster snapshots.
 * Dry run: node scripts/import-rpl-2010-2018.mjs
 * Apply: node --env-file=.env scripts/import-rpl-2010-2018.mjs --apply --backup=/private/roster.json
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dataDir = resolve(process.argv.find(a => a.startsWith('--data-dir='))?.slice(11) ?? 'docs/research/rpl-2010-2018');
const registry = JSON.parse(readFileSync(resolve(dataDir, 'registry.json'), 'utf8'));
const years = Array.from({ length: 9 }, (_, i) => 2010 + i);
const seasons = years.map(year => JSON.parse(readFileSync(resolve(dataDir, `season-${year}.json`), 'utf8')));
const clubEntries = Object.entries(registry.clubs);
const playerEntries = Object.entries(registry.players);
const cards = seasons.flatMap(s => s.clubs.flatMap(c => c.players.map(p => ({ year: s.year, club: c, player: p }))));
const clubSeasonKeys = seasons.flatMap(s => s.clubs.map(c => `${s.year}:${c.sourceClubId}`));
const cardKeys = cards.map(({ year, club, player }) => `${year}:${club.sourceClubId}:${player.sourcePlayerId}`);
const validPositions = new Set(['ВР', 'ЦЗ', 'ПЗ', 'ЛЗ', 'ПФЗ', 'ЛФЗ', 'ОП', 'ЦП', 'АП', 'ЛП', 'ПП', 'ЛВ', 'ПВ', 'НП', 'ЦН']);
const unique = items => new Set(items).size === items.length;
const totalByYear = [469, 480, 564, 578, 577, 566, 579, 605, 573];

if (JSON.stringify(registry.years) !== JSON.stringify(years) ||
    seasons.some((s, i) => s.year !== years[i] || s.clubs.length !== 16 ||
      s.audit.clubs !== 16 || s.audit.playerSeasonRecords !== totalByYear[i] ||
      s.clubs.reduce((n, c) => n + c.players.length, 0) !== totalByYear[i]) ||
    clubEntries.length !== 29 || playerEntries.length !== 1822 || cards.length !== 4991 ||
    registry.audit.playerSeasonRecords !== cards.length ||
    !unique(clubSeasonKeys) || !unique(cardKeys) ||
    seasons.some(s => s.clubs.some(c => !registry.clubs[c.sourceClubId] || !c.sourceName)) ||
    cards.some(({ player: p }) => !registry.players[p.sourcePlayerId] || !p.sourceName ||
      !validPositions.has(p.mainPosition) || !p.sourcePosition || !p.nationality ||
      !Number.isInteger(p.shirtNumber) || !Number.isInteger(p.age) ||
      !Number.isInteger(p.rating) || p.rating < 1 || p.rating > 99 ||
      !Number.isInteger(p.primeRating) || p.primeRating < 1 || p.primeRating > 99)) {
  throw new Error('Неполные или повреждённые данные 2010–2018; импорт не выполнялся');
}
for (const [year, snapshot] of seasons.map(s => [s.year, s])) {
  console.log(`${year}: ${snapshot.clubs.length} clubs, ${snapshot.audit.playerSeasonRecords} player-club-season cards`);
}
console.log(`${clubEntries.length} unique clubs, ${playerEntries.length} unique players, ${cards.length} cards; source OVR/POT retained.`);
if (!process.argv.includes('--apply')) process.exit(0);

const backupArg = process.argv.find(a => a.startsWith('--backup='));
if (!backupArg || !process.env.DATABASE_URL) throw new Error('Требуются DATABASE_URL и --backup=путь');
const backupPath = resolve(backupArg.slice(9));
if (existsSync(backupPath)) throw new Error('Backup already exists');

const db = new PrismaClient();
try {
  // A transitional 2009 archive may remain while existing drafts finish.
  const installedYears = await db.season.findMany({
    where: { startYear: { gte: 2010, lte: 2018 } },
    select: { startYear: true },
  });
  if (installedYears.length) {
    const scopedSeasons = years.map(year => `rpl-${year}`);
    const scopedCards = { clubSeason: { seasonId: { in: scopedSeasons } } };
    const scopedCounts = await Promise.all([
      db.clubSeason.count({ where: { seasonId: { in: scopedSeasons } } }),
      db.playerSeason.count({ where: scopedCards }),
      db.club.count({ where: { seasons: { some: { seasonId: { in: scopedSeasons } } } } }),
      db.player.count({ where: { seasons: { some: scopedCards } } }),
    ]);
    if (installedYears.length === 9 && unique(installedYears.map(s => s.startYear)) &&
        JSON.stringify(scopedCounts) === JSON.stringify([144, 4991, 29, 1822])) {
      console.log('All nine seasons already installed; no database changes.');
      await db.$disconnect();
      process.exit(0);
    }
    throw new Error('Обнаружен неполный исторический импорт; требуется ручная проверка');
  }
  const recentRuns = await db.gameRun.count({ where: {
    completed: false, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  } });
  const preserveLegacy = recentRuns > 0;
  if (preserveLegacy) {
    const legacy = await Promise.all([
      db.season.count(), db.club.count(), db.clubSeason.count(),
      db.player.count(), db.playerSeason.count(),
    ]);
    if (JSON.stringify(legacy) !== JSON.stringify([1, 16, 16, 469, 469])) {
      throw new Error(`Активные драфты с неожиданным составом старой базы: ${legacy.join('/')}`);
    }
    console.log(`Preserving the 2009 archive for ${recentRuns} recent unfinished drafts.`);
  }

  const backup = {
    clubs: await db.club.findMany(), seasons: await db.season.findMany(),
    clubSeasons: await db.clubSeason.findMany(), players: await db.player.findMany(),
    playerSeasons: await db.playerSeason.findMany(),
    gameRuns: await db.gameRun.findMany(), gameSlots: await db.gameSlot.findMany(),
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log(`Private backup saved: ${backupPath}`);

  await db.$transaction(async tx => {
    if (!preserveLegacy) {
      await tx.playerSeason.deleteMany();
      await tx.clubSeason.deleteMany();
      await tx.player.deleteMany();
      await tx.club.deleteMany();
      await tx.season.deleteMany();
    }

    await tx.season.createMany({ data: years.map(year => ({
      id: `rpl-${year}`, startYear: year, endYear: year, label: String(year), matchesPerTeam: 30,
    })) });
    const existingClubs = preserveLegacy
      ? new Map((await tx.club.findMany()).map(c => [c.id, c]))
      : new Map();
    await tx.club.createMany({ data: clubEntries.filter(([id]) => !existingClubs.has(`fifaindex-club-${id}`)).map(([id, c]) => ({
      id: `fifaindex-club-${id}`, nameRu: c.canonicalName, nameEn: c.canonicalName,
    })) });
    for (const [id, club] of clubEntries) {
      const old = existingClubs.get(`fifaindex-club-${id}`);
      if (old && (old.nameRu !== club.canonicalName || old.nameEn !== club.canonicalName || old.logoUrl)) {
        await tx.club.update({ where: { id: old.id }, data: {
          nameRu: club.canonicalName, nameEn: club.canonicalName, logoUrl: null,
        } });
      }
    }
    await tx.clubSeason.createMany({ data: seasons.flatMap(s => s.clubs.map(c => ({
      id: `rpl-${s.year}-club-${c.sourceClubId}`, clubId: `fifaindex-club-${c.sourceClubId}`,
      seasonId: `rpl-${s.year}`, sourceName: c.sourceName,
    }))) });
    const existingPlayers = preserveLegacy
      ? new Map((await tx.player.findMany()).map(p => [p.id, p]))
      : new Map();
    for (let offset = 0; offset < playerEntries.length; offset += 100) {
      await tx.player.createMany({ data: playerEntries.slice(offset, offset + 100)
        .filter(([id]) => !existingPlayers.has(`fifaindex-player-${id}`)).map(([id, p]) => ({
        id: `fifaindex-player-${id}`, fullName: p.canonicalName,
        lastName: p.canonicalName,
        nationality: cards.find(c => c.player.sourcePlayerId === id)?.player.nationality ?? null,
      })) });
    }
    for (const [id, player] of playerEntries) {
      const old = existingPlayers.get(`fifaindex-player-${id}`);
      if (old && (old.fullName !== player.canonicalName || old.lastName !== player.canonicalName)) {
        await tx.player.update({ where: { id: old.id }, data: {
          fullName: player.canonicalName, lastName: player.canonicalName,
        } });
      }
    }
    for (let offset = 0; offset < cards.length; offset += 100) {
      await tx.playerSeason.createMany({ data: cards.slice(offset, offset + 100).map(({ year, club, player: p }) => ({
        id: `rpl-${year}-club-${club.sourceClubId}-player-${p.sourcePlayerId}`,
        playerId: `fifaindex-player-${p.sourcePlayerId}`,
        clubSeasonId: `rpl-${year}-club-${club.sourceClubId}`,
        sourceName: p.sourceName, sourcePosition: p.sourcePosition, shirtNumber: p.shirtNumber,
        nationality: p.nationality,
        mainPosition: p.mainPosition, age: p.age, rating: p.rating, primeRating: p.primeRating,
        primeSeason: String(year),
      })) });
    }
    const scopedSeasons = years.map(year => `rpl-${year}`);
    const scopedCards = { clubSeason: { seasonId: { in: scopedSeasons } } };
    const counts = await Promise.all([
      tx.season.count({ where: { id: { in: scopedSeasons } } }),
      tx.club.count({ where: { seasons: { some: { seasonId: { in: scopedSeasons } } } } }),
      tx.clubSeason.count({ where: { seasonId: { in: scopedSeasons } } }),
      tx.player.count({ where: { seasons: { some: scopedCards } } }),
      tx.playerSeason.count({ where: scopedCards }),
    ]);
    if (JSON.stringify(counts) !== JSON.stringify([9, 29, 144, 1822, 4991])) {
      throw new Error(`Импорт неполный: ${counts.join('/')}`);
    }
  }, { timeout: 300000, maxWait: 30000 });
  console.log('Imported 9 seasons, 29 clubs, 144 club seasons, 1822 players, 4991 cards.');
} finally {
  await db.$disconnect();
}
