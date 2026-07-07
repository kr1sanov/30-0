/**
 * 30-0 RPL — Data Import Script
 * 
 * Imports RPL historical data (clubs, seasons, players) from JSON files
 * into the SQLite database via Prisma.
 * 
 * Usage: bun run scripts/import-rpl-data.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

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

// Club name normalization map
const CLUB_NAME_MAP: Record<string, string> = {
  'ЦСКА': 'ЦСКА Москва',
  'ЦСКА Москва': 'ЦСКА Москва',
  'Спартак': 'Спартак Москва',
  'Спартак Москва': 'Спартак Москва',
  'Локомотив': 'Локомотив Москва',
  'Локомотив Москва': 'Локомотив Москва',
  'Зенит': 'Зенит',
  'Динамо': 'Динамо Москва',
  'Динамо Москва': 'Динамо Москва',
  'Рубин': 'Рубин Казань',
  'Рубин Казань': 'Рубин Казань',
  'Краснодар': 'Краснодар',
  'Ростов': 'Ростов',
  'Ахмат': 'Ахмат',
  'Терек': 'Ахмат', // Терек was renamed to Ахмат
  'Крылья Советов': 'Крылья Советов',
  'Урал': 'Урал',
  'Амкар': 'Амкар',
  'Торпедо': 'Торпедо Москва',
  'Торпедо Москва': 'Торпедо Москва',
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
  'Газовик': 'Оренбург', // Газовик was renamed to Оренбург
};

function normalizeClubName(name: string): string {
  return CLUB_NAME_MAP[name] || name;
}

function seasonLabelToYears(label: string): { startYear: number; endYear: number } {
  const year = parseInt(label);
  if (isNaN(year)) return { startYear: 2000, endYear: 2001 };
  // Seasons like "2024" represent 2024/25
  return { startYear: year, endYear: year + 1 };
}

async function main() {
  console.log('🚀 Starting RPL data import...\n');

  // Load JSON data
  const dataDir = path.join(__dirname, 'data');
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

  // Step 1: Clear existing data
  console.log('\n🗑️  Clearing existing data...');
  await db.gameSlot.deleteMany();
  await db.gameRun.deleteMany();
  await db.playerSeason.deleteMany();
  await db.clubSeason.deleteMany();
  await db.player.deleteMany();
  await db.season.deleteMany();
  await db.club.deleteMany();
  console.log('  ✅ Cleared all existing data');

  // Step 2: Extract unique clubs
  const uniqueClubs = [...new Set(allPlayers.map(p => p.club))];
  console.log(`\n🏟️  Creating ${uniqueClubs.length} clubs...`);

  const clubMap = new Map<string, string>(); // name -> id
  for (const clubName of uniqueClubs.sort()) {
    const club = await db.club.create({
      data: { nameRu: clubName },
    });
    clubMap.set(clubName, club.id);
  }
  console.log('  ✅ Clubs created');

  // Step 3: Extract unique seasons
  const uniqueSeasonLabels = [...new Set(allPlayers.map(p => p.season))].sort();
  console.log(`\n📅 Creating ${uniqueSeasonLabels.length} seasons...`);

  const seasonMap = new Map<string, string>(); // label -> id
  for (const label of uniqueSeasonLabels) {
    const { startYear, endYear } = seasonLabelToYears(label);
    const season = await db.season.create({
      data: { startYear, endYear, label },
    });
    seasonMap.set(label, season.id);
  }
  console.log('  ✅ Seasons created');

  // Step 4: Create ClubSeason entries (unique club+season combinations)
  const clubSeasonKeys = [...new Set(allPlayers.map(p => `${p.club}|||${p.season}`))];
  console.log(`\n📋 Creating ${clubSeasonKeys.length} club-season entries...`);

  const clubSeasonMap = new Map<string, string>(); // "club|||season" -> id
  let csCount = 0;
  for (const key of clubSeasonKeys) {
    const [clubName, seasonLabel] = key.split('|||');
    const clubId = clubMap.get(clubName);
    const seasonId = seasonMap.get(seasonLabel);
    
    if (!clubId || !seasonId) {
      console.warn(`  ⚠️  Missing club or season for: ${key}`);
      continue;
    }

    const clubSeason = await db.clubSeason.create({
      data: { clubId, seasonId },
    });
    clubSeasonMap.set(key, clubSeason.id);
    csCount++;
  }
  console.log(`  ✅ Created ${csCount} club-season entries`);

  // Step 5: Create Player entries (unique by fullName)
  const uniquePlayerNames = [...new Set(allPlayers.map(p => p.fullName))];
  console.log(`\n👤 Creating ${uniquePlayerNames.length} unique players...`);

  const playerMap = new Map<string, string>(); // fullName -> id
  let playerCount = 0;
  for (const fullName of uniquePlayerNames) {
    // Get the most common info for this player across all seasons
    const playerRecords = allPlayers.filter(p => p.fullName === fullName);
    const lastName = playerRecords[0].lastName;
    const nationality = playerRecords[0].nationality;

    const player = await db.player.create({
      data: {
        fullName,
        lastName,
        firstName: fullName.replace(lastName, '').trim() || null,
        nationality,
      },
    });
    playerMap.set(fullName, player.id);
    playerCount++;
  }
  console.log(`  ✅ Created ${playerCount} players`);

  // Step 6: Create PlayerSeason entries
  console.log(`\n⚽ Creating ${allPlayers.length} player-season records...`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Process in batches for performance
  const BATCH_SIZE = 100;
  for (let i = 0; i < allPlayers.length; i += BATCH_SIZE) {
    const batch = allPlayers.slice(i, i + BATCH_SIZE);
    
    for (const record of batch) {
      try {
        const playerId = playerMap.get(record.fullName);
        const clubSeasonKey = `${record.club}|||${record.season}`;
        const clubSeasonId = clubSeasonMap.get(clubSeasonKey);

        if (!playerId || !clubSeasonId) {
          skipCount++;
          continue;
        }

        await db.playerSeason.create({
          data: {
            playerId,
            clubSeasonId,
            rating: record.rating,
            primeRating: record.primeRating,
            primeSeason: record.primeSeason,
            mainPosition: record.mainPosition,
            otherPositions: record.otherPositions.length > 0 
              ? record.otherPositions.join(',') 
              : null,
          },
        });
        successCount++;
      } catch (error: unknown) {
        // Skip duplicates silently
        if (error && typeof error === 'object' && 'code' in error && (error as {code: string}).code === 'P2002') {
          skipCount++;
        } else {
          errorCount++;
          if (errorCount <= 5) {
            console.error(`  ❌ Error for ${record.fullName} (${record.club} ${record.season}):`, error);
          }
        }
      }
    }

    // Progress indicator
    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= allPlayers.length) {
      process.stdout.write(`  📈 Processed ${Math.min(i + BATCH_SIZE, allPlayers.length)}/${allPlayers.length}\n`);
    }
  }

  console.log(`\n  ✅ Created: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);

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
