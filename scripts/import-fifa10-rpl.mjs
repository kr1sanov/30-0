/** Replace only roster tables with the complete, user-supplied FIFA 10 edition.
 * Usage: node scripts/import-fifa10-rpl.mjs [--apply --backup=/private/path.json]
 * Without --apply this performs a complete read-only preflight.
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.argv.find(arg => arg.startsWith('--data='))?.slice(7) ?? 'docs/research/verified-fifa10-rpl.json');
const archive = JSON.parse(readFileSync(path, 'utf8'));
const { season, clubs } = archive;
const players = clubs.flatMap(club => club.players);
const unique = values => new Set(values).size === values.length;
const positions = new Set(['ВР', 'ЦЗ', 'ПЗ', 'ЛЗ', 'ПФЗ', 'ЛФЗ', 'ОП', 'ЦП', 'АП', 'ЛП', 'ПП', 'ЛВ', 'ПВ', 'НП', 'ЦН']);

if (season.startYear !== 2009 || season.endYear !== 2009 || season.matchesPerTeam !== 30 ||
    clubs.length !== 16 || players.length !== 469 ||
    !unique(clubs.map(c => c.sourceClubId)) || !unique(clubs.map(c => c.nameOriginal)) ||
    !unique(players.map(p => p.sourcePlayerId)) ||
    clubs.some(c => !c.nameOriginal || c.nameRu !== c.nameOriginal || !c.players.length) ||
    players.some(p => !p.nameOriginal || p.nameRu !== p.nameOriginal ||
      !p.nationality || !positions.has(p.mainPosition) || !Number.isInteger(p.age) ||
      !Number.isInteger(p.rating) || p.rating < 1 || p.rating > 99 ||
      !Number.isInteger(p.primeRating) || p.primeRating < 1 || p.primeRating > 99)) {
  throw new Error('Неполная или изменённая выгрузка FIFA 10; база не изменена');
}
console.log(`FIFA 10: ${clubs.length} clubs, ${players.length} players, source English names and ratings verified.`);
if (!process.argv.includes('--apply')) process.exit(0);

const backupArgument = process.argv.find(arg => arg.startsWith('--backup='));
if (!backupArgument || !process.env.DATABASE_URL) throw new Error('Применение требует --backup=путь и DATABASE_URL');
const backupPath = resolve(backupArgument.slice(9));
if (existsSync(backupPath)) throw new Error('Резервная копия уже существует; выберите новый путь');

const db = new PrismaClient();
try {
  // Subsequent code deployments must not replace the same roster again or
  // interrupt a draft that started after the first successful import.
  const existingSeason = await db.season.findUnique({ where: { id: 'rpl-2009-fifa10' } });
  if (existingSeason && await db.season.count() === 1 && await db.club.count() === 16 &&
      await db.player.count() === 469 && await db.playerSeason.count() === 469) {
    const existingClubs = await db.club.findMany({ select: { id: true, nameRu: true } });
    const clubNames = new Map(existingClubs.map(c => [c.id, c.nameRu]));
    const existingPlayers = await db.playerSeason.findMany({ select: {
      id: true, rating: true, primeRating: true, mainPosition: true,
      player: { select: { fullName: true, nationality: true } },
      clubSeason: { select: { clubId: true } },
    } });
    const expected = new Map(clubs.flatMap(c => c.players.map(p => [
      `fifa10-player-season-${p.sourcePlayerId}`, { p, c },
    ])));
    if (clubs.every(c => clubNames.get(`fifaindex-club-${c.sourceClubId}`) === c.nameOriginal) &&
        existingPlayers.every(row => {
          const item = expected.get(row.id);
          return item && row.rating === item.p.rating && row.primeRating === item.p.primeRating &&
            row.mainPosition === item.p.mainPosition && row.player.fullName === item.p.nameOriginal &&
            row.player.nationality === item.p.nationality &&
            row.clubSeason.clubId === `fifaindex-club-${item.c.sourceClubId}`;
        })) {
      console.log('The complete FIFA 10 roster is already installed; no database changes.');
      await db.$disconnect();
      process.exit(0);
    }
  }
  const recentRuns = await db.gameRun.count({ where: {
    completed: false, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  } });
  if (recentRuns) throw new Error(`${recentRuns} незавершённых драфтов за последние сутки; импорт прерван`);

  const backup = {
    clubs: await db.club.findMany(), seasons: await db.season.findMany(),
    clubSeasons: await db.clubSeason.findMany(), players: await db.player.findMany(),
    playerSeasons: await db.playerSeason.findMany(),
    gameRuns: await db.gameRun.findMany(), gameSlots: await db.gameSlot.findMany(),
  };
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log(`Private roster backup saved: ${backupPath}`);

  await db.$transaction(async tx => {
    await tx.playerSeason.deleteMany();
    await tx.clubSeason.deleteMany();
    await tx.player.deleteMany();
    await tx.club.deleteMany();
    await tx.season.deleteMany();

    const seasonId = 'rpl-2009-fifa10';
    await tx.season.create({ data: { id: seasonId, ...season } });
    await tx.club.createMany({ data: clubs.map(c => ({
      id: `fifaindex-club-${c.sourceClubId}`, nameRu: c.nameOriginal,
      nameEn: c.nameOriginal, logoUrl: c.logoUrl,
    })) });
    await tx.clubSeason.createMany({ data: clubs.map(c => ({
      id: `fifa10-club-season-${c.sourceClubId}`,
      clubId: `fifaindex-club-${c.sourceClubId}`, seasonId,
    })) });
    for (let offset = 0; offset < players.length; offset += 100) {
      const batch = players.slice(offset, offset + 100);
      await tx.player.createMany({ data: batch.map(p => ({
        id: `fifaindex-player-${p.sourcePlayerId}`, fullName: p.nameOriginal,
        lastName: p.nameOriginal, nationality: p.nationality,
      })) });
    }
    const playerSeasons = clubs.flatMap(c => c.players.map(p => ({
      id: `fifa10-player-season-${p.sourcePlayerId}`,
      playerId: `fifaindex-player-${p.sourcePlayerId}`,
      clubSeasonId: `fifa10-club-season-${c.sourceClubId}`,
      mainPosition: p.mainPosition, age: p.age,
      rating: p.rating, primeRating: p.primeRating,
    })));
    for (let offset = 0; offset < playerSeasons.length; offset += 100) {
      await tx.playerSeason.createMany({ data: playerSeasons.slice(offset, offset + 100) });
    }
    if (await tx.season.count() !== 1 || await tx.club.count() !== 16 ||
        await tx.clubSeason.count() !== 16 || await tx.player.count() !== 469 ||
        await tx.playerSeason.count() !== 469) {
      throw new Error('Итоговые количества не совпали; транзакция отменена');
    }
  }, { timeout: 120000, maxWait: 20000 });
  console.log('Imported 1 season, 16 clubs, 469 players, 469 club-season player records.');
} finally {
  await db.$disconnect();
}
