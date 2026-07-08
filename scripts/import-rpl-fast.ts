/**
 * 30-0 RPL — Fast Data Import Script for Supabase PostgreSQL
 * Uses raw SQL for bulk inserts (much faster than Prisma ORM over network)
 * 
 * Usage: DATABASE_URL=... bun run scripts/import-rpl-fast.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const db = new PrismaClient({
  log: ['error'],
});

function cuid(): string {
  return randomUUID();
}

interface PlayerRecord {
  fullName: string;
  lastName: string;
  nationality: string;
  club: string;
  season: string;
  mainPosition: string;
  otherPositions: string[];
  rating: number;
  primeRating: number;
  primeSeason: string;
}

const CLUB_NAME_MAP: Record<string, string> = {
  'ЦСКА': 'ЦСКА Москва',
  'Спартак': 'Спартак Москва',
  'Локомотив': 'Локомотив Москва',
  'Зенит': 'Зенит',
  'Динамо': 'Динамо Москва',
  'Рубин': 'Рубин Казань',
  'Краснодар': 'Краснодар',
  'Ростов': 'Ростов',
  'Ахмат': 'Ахмат',
  'Терек': 'Ахмат',
  'Крылья Советов': 'Крылья Советов',
  'Урал': 'Урал',
  'Амкар': 'Амкар',
  'Торпедо': 'Торпедо Москва',
  'Алания': 'Алания',
  'Кубань': 'Кубань',
  'Сатурн': 'Сатурн',
  'Сатурн Раменское': 'Сатурн',
  'Томь': 'Томь',
  'Томь Томск': 'Томь',
  'Луч-Энергия': 'Луч-Энергия',
  'Спартак Нальчик': 'Спартак Нальчик',
  'Химки': 'Химки',
  'Факел': 'Факел',
  'Факел Воронеж': 'Факел',
  'Ротор': 'Ротор',
  'Ротор Волгоград': 'Ротор',
  'Локомотив НН': 'Локомотив НН',
  'Анжи': 'Анжи',
  'Сибирь': 'Сибирь',
  'Сибирь Новосибирск': 'Сибирь',
  'Мордовия': 'Мордовия',
  'Уфа': 'Уфа',
  'Арсенал': 'Арсенал Тула',
  'Арсенал Тула': 'Арсенал Тула',
  'Оренбург': 'Оренбург',
  'Тамбов': 'Тамбов',
  'Пари НН': 'Пари НН',
  'Нижний Новгород': 'Пари НН',
  'Балтика': 'Балтика',
  'Балтика Калининград': 'Балтика',
  'Енисей': 'Енисей',
  'Енисей Красноярск': 'Енисей',
  'СКА-Хабаровск': 'СКА-Хабаровск',
  'Тюмень': 'Тюмень',
  'Шинник': 'Шинник',
  'Черноморец': 'Черноморец',
  'Жемчужина': 'Жемчужина',
  'Волга': 'Волга',
  'Волга НН': 'Волга',
  'Салют': 'Салют',
  'Газовик': 'Оренбург',
  'Сочи': 'Сочи',
  'Акрон': 'Акрон',
  'Динамо Махачкала': 'Динамо Махачкала',
};

function normalizeClubName(name: string): string {
  return CLUB_NAME_MAP[name] || name;
}

function pgEscape(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

async function main() {
  console.log('🚀 Starting FAST RPL data import to Supabase...\n');

  // Load JSON data
  const dataDir = path.join(import.meta.dir, 'data');
  const files = ['rpl-2000-2010.json', 'rpl-2011-2026.json'];

  let allPlayers: PlayerRecord[] = [];
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PlayerRecord[];
      console.log(`📁 Loaded ${data.length} records from ${file}`);
      allPlayers = allPlayers.concat(data);
    } else {
      console.warn(`⚠️  File not found: ${filePath}`);
    }
  }

  console.log(`\n📊 Total player-season records: ${allPlayers.length}`);

  // Normalize club names
  allPlayers = allPlayers.map(p => ({
    ...p,
    club: normalizeClubName(p.club),
  }));

  // Step 1: Clear existing data (using raw SQL for speed)
  console.log('\n🗑️  Clearing existing data...');
  await db.$executeRawUnsafe(`TRUNCATE TABLE "GameSlot" CASCADE`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "GameRun" CASCADE`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "PlayerSeason" CASCADE`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "ClubSeason" CASCADE`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "Player" CASCADE`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "Season" CASCADE`);
  await db.$executeRawUnsafe(`TRUNCATE TABLE "Club" CASCADE`);
  console.log('  ✅ Cleared all existing data');

  // Step 2: Insert Clubs (bulk)
  const uniqueClubs = [...new Set(allPlayers.map(p => p.club))].sort();
  console.log(`\n🏟️  Creating ${uniqueClubs.length} clubs...`);

  const clubIds = new Map<string, string>();
  const clubValues = uniqueClubs.map(name => {
    const id = cuid();
    clubIds.set(name, id);
    return `(${pgEscape(id)}, ${pgEscape(name)})`;
  }).join(',\n');
  await db.$executeRawUnsafe(`INSERT INTO "Club" ("id", "nameRu") VALUES ${clubValues}`);
  
  // Use pre-generated IDs
  const clubMap = clubIds;
  console.log('  ✅ Clubs created');

  // Step 3: Insert Seasons (bulk)
  const uniqueSeasonLabels = [...new Set(allPlayers.map(p => p.season))].sort();
  console.log(`\n📅 Creating ${uniqueSeasonLabels.length} seasons...`);

  const seasonIds = new Map<string, string>();
  const seasonValues = uniqueSeasonLabels.map(label => {
    const id = cuid();
    seasonIds.set(label, id);
    const year = parseInt(label);
    const startYear = isNaN(year) ? 2000 : year;
    const endYear = startYear + 1;
    return `(${pgEscape(id)}, ${startYear}, ${endYear}, ${pgEscape(label)})`;
  }).join(',\n');
  await db.$executeRawUnsafe(`INSERT INTO "Season" ("id", "startYear", "endYear", "label") VALUES ${seasonValues}`);

  // Use pre-generated IDs
  const seasonMap = seasonIds;
  console.log('  ✅ Seasons created');

  // Step 4: Insert ClubSeasons (bulk)
  const clubSeasonKeys = [...new Set(allPlayers.map(p => `${p.club}|||${p.season}`))];
  console.log(`\n📋 Creating ${clubSeasonKeys.length} club-season entries...`);

  const csIds = new Map<string, string>();
  const csValues = clubSeasonKeys.map(key => {
    const [clubName, seasonLabel] = key.split('|||');
    const clubId = clubMap.get(clubName);
    const seasonId = seasonMap.get(seasonLabel);
    if (!clubId || !seasonId) return null;
    const id = cuid();
    csIds.set(key, id);
    return `(${pgEscape(id)}, ${pgEscape(clubId)}, ${pgEscape(seasonId)})`;
  }).filter(Boolean).join(',\n');
  await db.$executeRawUnsafe(`INSERT INTO "ClubSeason" ("id", "clubId", "seasonId") VALUES ${csValues}`);

  // Use pre-generated IDs
  const clubSeasonMap = csIds;
  console.log('  ✅ Club-seasons created');

  // Step 5: Insert Players (bulk)
  const playerInfoMap = new Map<string, { lastName: string; nationality: string }>();
  for (const p of allPlayers) {
    if (!playerInfoMap.has(p.fullName)) {
      playerInfoMap.set(p.fullName, { lastName: p.lastName, nationality: p.nationality });
    }
  }
  const uniquePlayers = [...playerInfoMap.entries()];
  console.log(`\n👤 Creating ${uniquePlayers.length} unique players...`);

  // Pre-generate player IDs
  const playerIds = new Map<string, string>();
  for (const [fullName] of uniquePlayers) {
    playerIds.set(fullName, cuid());
  }

  // Insert in chunks of 500
  const PLAYER_CHUNK = 500;
  for (let i = 0; i < uniquePlayers.length; i += PLAYER_CHUNK) {
    const chunk = uniquePlayers.slice(i, i + PLAYER_CHUNK);
    const playerValues = chunk.map(([fullName, info]) => {
      const id = playerIds.get(fullName)!;
      const firstName = fullName.replace(info.lastName, '').trim();
      return `(${pgEscape(id)}, ${pgEscape(info.lastName)}, ${firstName ? pgEscape(firstName) : 'NULL'}, ${pgEscape(fullName)}, ${pgEscape(info.nationality)})`;
    }).join(',\n');
    await db.$executeRawUnsafe(`INSERT INTO "Player" ("id", "lastName", "firstName", "fullName", "nationality") VALUES ${playerValues}`);
    process.stdout.write(`  📈 Players: ${Math.min(i + PLAYER_CHUNK, uniquePlayers.length)}/${uniquePlayers.length}\n`);
  }

  // Use pre-generated IDs
  const playerMap = playerIds;
  console.log('  ✅ Players created');

  // Step 6: Insert PlayerSeasons (bulk) — the biggest table
  // Deduplicate by (playerId, clubSeasonId) — keep the one with higher rating
  const seenPS = new Map<string, PlayerRecord>();
  for (const p of allPlayers) {
    const key = `${p.fullName}|||${p.club}|||${p.season}`;
    const existing = seenPS.get(key);
    if (!existing || p.rating > existing.rating) {
      seenPS.set(key, p);
    }
  }
  const dedupedPlayers = [...seenPS.values()];
  console.log(`\n⚽ Creating ${dedupedPlayers.length} player-season records (deduped from ${allPlayers.length})...`);

  let successCount = 0;
  let skipCount = 0;

  const PS_CHUNK = 200; // Smaller chunks for PlayerSeason due to more columns
  for (let i = 0; i < dedupedPlayers.length; i += PS_CHUNK) {
    const chunk = dedupedPlayers.slice(i, i + PS_CHUNK);
    const values: string[] = [];

    for (const record of chunk) {
      const playerId = playerMap.get(record.fullName);
      const clubSeasonKey = `${record.club}|||${record.season}`;
      const clubSeasonId = clubSeasonMap.get(clubSeasonKey);

      if (!playerId || !clubSeasonId) {
        skipCount++;
        continue;
      }

      const otherPos = record.otherPositions.length > 0 
        ? pgEscape(record.otherPositions.join(',')) 
        : 'NULL';
      const primeSeason = record.primeSeason ? pgEscape(record.primeSeason) : 'NULL';

      const psId = cuid();
      values.push(`(${pgEscape(psId)}, ${pgEscape(playerId)}, ${pgEscape(clubSeasonId)}, ${record.rating}, ${record.primeRating}, ${primeSeason}, ${pgEscape(record.mainPosition)}, ${otherPos})`);
      successCount++;
    }

    if (values.length > 0) {
      const sql = `INSERT INTO "PlayerSeason" ("id", "playerId", "clubSeasonId", "rating", "primeRating", "primeSeason", "mainPosition", "otherPositions") VALUES ${values.join(',\n')}`;
      await db.$executeRawUnsafe(sql);
    }

    if ((i + PS_CHUNK) % 2000 === 0 || i + PS_CHUNK >= dedupedPlayers.length) {
      process.stdout.write(`  📈 PlayerSeasons: ${Math.min(i + PS_CHUNK, dedupedPlayers.length)}/${dedupedPlayers.length}\n`);
    }
  }

  console.log(`\n  ✅ Created: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);

  // Step 7: Verify and print stats
  console.log('\n📊 Final database stats:');
  const clubCount = await db.club.count();
  const seasonCount = await db.season.count();
  const clubSeasonCount = await db.clubSeason.count();
  const playerCountFinal = await db.player.count();
  const playerSeasonCount = await db.playerSeason.count();

  console.log(`  Clubs: ${clubCount}`);
  console.log(`  Seasons: ${seasonCount}`);
  console.log(`  Club-Seasons: ${clubSeasonCount}`);
  console.log(`  Players: ${playerCountFinal}`);
  console.log(`  Player-Seasons: ${playerSeasonCount}`);

  // Verify seasons are from 2000+ only
  const oldSeasons = await db.season.findMany({ where: { startYear: { lt: 2000 } } });
  if (oldSeasons.length > 0) {
    console.warn(`\n⚠️  WARNING: Found ${oldSeasons.length} seasons before 2000!`);
  } else {
    console.log('\n  ✅ All seasons are 2000+');
  }

  await db.$disconnect();
  console.log('\n🎉 Import complete!');
}

main().catch((error) => {
  console.error('Import failed:', error);
  db.$disconnect();
  process.exit(1);
});
