#!/usr/bin/env bun
/**
 * Seed Supabase database with RPL football data via REST API.
 * Extracts data definitions from prisma/seed.ts and inserts via Supabase REST API.
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// ============================================================
// CONFIG
// ============================================================
const SUPABASE_URL = 'https://lukxzfkmlajotcruxrgx.supabase.co/rest/v1';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1a3h6ZmttbGFqb3RjcnV4cmd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5MDA2OCwiZXhwIjoyMDk4NDY2MDY4fQ.B3mJQLsQGSsbmCZ9dTzr7s1gbjPksFxpoptBrcFzgrk';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Prefer': 'return=representation',
};

// ============================================================
// SUPABASE REST API HELPERS
// ============================================================
async function supabaseInsert<T = any>(table: string, data: Record<string, any> | Record<string, any>[]): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to insert into ${table}: ${res.status} ${text}`);
  }
  return res.json();
}

async function supabaseUpdate<T = any>(table: string, id: string, data: Record<string, any>): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update ${table} ${id}: ${res.status} ${text}`);
  }
  return res.json();
}

async function supabaseDeleteAll(table: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/${table}?id=neq.00000000`, {
    method: 'DELETE',
    headers: { ...headers, 'Prefer': 'return=minimal' },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    console.warn(`Warning deleting ${table}: ${res.status} ${text}`);
  }
}

async function supabaseCount(table: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/${table}?select=id&limit=0`, {
    method: 'GET',
    headers: {
      ...headers,
      'Prefer': 'count=exact',
    },
  });
  const count = res.headers.get('content-range');
  // content-range: */count
  if (count) {
    const parts = count.split('/');
    return parseInt(parts[1] || '0', 10);
  }
  const data = await res.json();
  return data.length;
}

async function supabaseGet<T = any>(table: string, query: string = ''): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/${table}${query ? '?' + query : ''}`, {
    method: 'GET',
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get ${table}: ${res.status} ${text}`);
  }
  return res.json();
}

function cuid(): string {
  return randomUUID();
}

// ============================================================
// EXTRACT DATA FROM seed.ts
// ============================================================
console.log('Extracting data from prisma/seed.ts...');
const seedSource = readFileSync(join(import.meta.dir, '../prisma/seed.ts'), 'utf-8');

// Get everything before runSeed function
const dataSection = seedSource.split('export async function runSeed')[0];

// Remove import lines and type-only declarations
let cleanedData = dataSection.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');

// Add exports to the variables and functions we need
cleanedData = cleanedData
  .replace(/^const seasonDefs/m, 'export const seasonDefs')
  .replace(/^const clubs/m, 'export const clubs')
  .replace(/^const POS/m, 'export const POS')
  .replace(/^function isInRanges/m, 'export function isInRanges')
  .replace(/^function getOtherPositions/m, 'export function getOtherPositions')
  // Don't export seededRandom/_seed - we'll use our own local copy

// Write to temp file for dynamic import
const tempPath = join(import.meta.dir, '_temp_seed_data.ts');
writeFileSync(tempPath, cleanedData);

let data: any;
try {
  data = await import(tempPath);
} finally {
  // Clean up temp file
  try { unlinkSync(tempPath); } catch {}
}

const { clubs, seasonDefs, POS, isInRanges, getOtherPositions } = data;

// Seeded pseudo-random for deterministic output (local copy)
let _seed = 42;
function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}

// ============================================================
// CLUB STRENGTH MAP (from seed.ts)
// ============================================================
const clubStrength: Record<string, number> = {
  'Спартак Москва': 85, 'ЦСКА Москва': 87, 'Зенит': 86, 'Локомотив Москва': 82,
  'Динамо Москва': 78, 'Краснодар': 80, 'Рубин Казань': 79, 'Ростов': 76,
  'Крылья Советов': 72, 'Торпедо Москва': 70, 'Ахмат': 71, 'Кубань': 68,
  'Урал': 67, 'Алания': 74, 'Амкар': 69,
};

// ============================================================
// MAIN SEED LOGIC
// ============================================================
async function main() {
  console.log('Clearing existing data...');
  // Delete in reverse dependency order
  await supabaseDeleteAll('GameSlot');
  await supabaseDeleteAll('GameRun');
  await supabaseDeleteAll('PlayerSeason');
  await supabaseDeleteAll('ClubSeason');
  await supabaseDeleteAll('Player');
  await supabaseDeleteAll('Season');
  await supabaseDeleteAll('Club');
  console.log('Data cleared.');

  // --------------------------------------------------------
  // 1. Insert Clubs
  // --------------------------------------------------------
  console.log('Creating clubs...');
  const clubRecords = clubs.map((c: any) => ({
    id: cuid(),
    nameRu: c.nameRu,
    nameEn: c.nameEn,
    city: c.city,
  }));
  const insertedClubs = await supabaseInsert('Club', clubRecords);
  const clubMap = new Map<string, string>(); // nameRu -> id
  for (const club of insertedClubs) {
    clubMap.set(club.nameRu, club.id);
  }
  console.log(`Created ${insertedClubs.length} clubs.`);

  // --------------------------------------------------------
  // 2. Insert Seasons
  // --------------------------------------------------------
  console.log('Creating seasons...');
  const seasonRecords = seasonDefs.map((s: any) => ({
    id: cuid(),
    startYear: s.startYear,
    endYear: s.endYear,
    label: s.label,
  }));
  const insertedSeasons = await supabaseInsert('Season', seasonRecords);
  const seasonMap = new Map<string, string>(); // label -> id
  for (const season of insertedSeasons) {
    seasonMap.set(season.label, season.id);
  }
  console.log(`Created ${insertedSeasons.length} seasons.`);

  // --------------------------------------------------------
  // 3. Insert ClubSeasons
  // --------------------------------------------------------
  console.log('Creating club-seasons...');
  const clubSeasonRecords: any[] = [];
  for (const c of clubs) {
    const clubId = clubMap.get(c.nameRu);
    for (const s of seasonDefs) {
      if (isInRanges(s.startYear, c.topDivRanges)) {
        clubSeasonRecords.push({
          id: cuid(),
          clubId,
          seasonId: seasonMap.get(s.label),
        });
      }
    }
  }
  const insertedClubSeasons = await supabaseInsert('ClubSeason', clubSeasonRecords);
  const clubSeasonMap = new Map<string, string>(); // "clubId-seasonId" -> id
  for (const cs of insertedClubSeasons) {
    clubSeasonMap.set(`${cs.clubId}-${cs.seasonId}`, cs.id);
  }
  console.log(`Created ${insertedClubSeasons.length} club-seasons.`);

  // --------------------------------------------------------
  // 3b. Generate realistic club season statistics
  // --------------------------------------------------------
  console.log('Generating club season statistics...');

  // Group club seasons by seasonId for position calculation
  const seasonsGrouped = new Map<string, any[]>();
  for (const cs of insertedClubSeasons) {
    const list = seasonsGrouped.get(cs.seasonId) || [];
    list.push(cs);
    seasonsGrouped.set(cs.seasonId, list);
  }

  // Get club nameRu by id
  const clubNameMap = new Map<string, string>(); // clubId -> nameRu
  for (const c of clubs) {
    clubNameMap.set(clubMap.get(c.nameRu), c.nameRu);
  }

  // Get season label by id
  const seasonLabelMap = new Map<string, string>(); // seasonId -> label
  for (const s of insertedSeasons) {
    seasonLabelMap.set(s.id, s.label);
  }

  let statsUpdated = 0;
  // Process seasons in batches to avoid too many concurrent requests
  for (const [seasonId, csList] of seasonsGrouped) {
    const numTeams = csList.length;
    // Determine matchesPerTeam based on season
    const seasonLabel = seasonLabelMap.get(seasonId) || '';
    const matchesPerTeam = numTeams >= 16 ? 30 : 28;

    const stats: { id: string; strength: number; points: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number }[] = [];

    for (const cs of csList) {
      const clubNameRu = clubNameMap.get(cs.clubId) || '';
      const baseStrength = clubStrength[clubNameRu] || 70;
      const variance = (seededRandom() - 0.5) * 20;
      const strength = baseStrength + variance;

      let won = 0, drawn = 0, lost = 0;
      let goalsFor = 0, goalsAgainst = 0;

      for (let match = 0; match < matchesPerTeam; match++) {
        const roll = seededRandom() * 100;
        const winChance = 25 + (strength - 60) * 0.8;
        const drawChance = 25;

        if (roll < winChance) {
          won++;
          const g = Math.floor(seededRandom() * 3) + 1;
          const gc = Math.floor(seededRandom() * Math.min(2, g));
          goalsFor += g;
          goalsAgainst += gc;
        } else if (roll < winChance + drawChance) {
          drawn++;
          const g = Math.floor(seededRandom() * 2) + 1;
          goalsFor += g;
          goalsAgainst += g;
        } else {
          lost++;
          const gc = Math.floor(seededRandom() * 3) + 1;
          const g = Math.floor(seededRandom() * Math.min(2, gc));
          goalsFor += g;
          goalsAgainst += gc;
        }
      }

      const points = won * 3 + drawn;
      stats.push({ id: cs.id, strength, points, won, drawn, lost, goalsFor, goalsAgainst });
    }

    // Sort by points (then goal difference) to determine positions
    stats.sort((a, b) => {
      const ptsDiff = b.points - a.points;
      if (ptsDiff !== 0) return ptsDiff;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      return gdB - gdA;
    });

    // Batch update club seasons with position and stats
    const updateBatch: Promise<any>[] = [];
    for (let i = 0; i < stats.length; i++) {
      const s = stats[i];
      updateBatch.push(
        supabaseUpdate('ClubSeason', s.id, {
          position: i + 1,
          points: s.points,
          played: matchesPerTeam,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
        })
      );
    }
    // Execute updates with some concurrency (but not all at once)
    const BATCH_SIZE = 10;
    for (let i = 0; i < updateBatch.length; i += BATCH_SIZE) {
      await Promise.all(updateBatch.slice(i, i + BATCH_SIZE));
    }
    statsUpdated += stats.length;
  }
  console.log(`Updated statistics for ${statsUpdated} club-seasons.`);

  // --------------------------------------------------------
  // 4. Insert Players (unique by fullName)
  // --------------------------------------------------------
  console.log('Collecting unique players...');
  const allPlayerDefs = new Map<string, { lastName: string; firstName: string; birthYear?: number; nationality?: string }>();
  for (const c of clubs) {
    for (const [, , players] of c.eras) {
      for (const [lastName, firstName, , , birthYear, nationality] of players) {
        const fullName = `${lastName} ${firstName}`;
        if (!allPlayerDefs.has(fullName)) {
          allPlayerDefs.set(fullName, { lastName, firstName, birthYear, nationality });
        }
      }
    }
  }

  console.log('Creating players...');
  const playerRecords = Array.from(allPlayerDefs.entries()).map(([fullName, pd]) => ({
    id: cuid(),
    lastName: pd.lastName,
    firstName: pd.firstName,
    fullName,
    birthYear: pd.birthYear || null,
    nationality: pd.nationality || null,
  }));

  // Insert players in batches of 100
  const PLAYER_BATCH = 100;
  const insertedPlayers: any[] = [];
  for (let i = 0; i < playerRecords.length; i += PLAYER_BATCH) {
    const batch = playerRecords.slice(i, i + PLAYER_BATCH);
    const result = await supabaseInsert('Player', batch);
    insertedPlayers.push(...result);
    console.log(`  Inserted ${Math.min(i + PLAYER_BATCH, playerRecords.length)} / ${playerRecords.length} players`);
  }

  const playerMap = new Map<string, string>(); // fullName -> id
  for (const p of insertedPlayers) {
    playerMap.set(p.fullName, p.id);
  }
  console.log(`Created ${insertedPlayers.length} unique players.`);

  // --------------------------------------------------------
  // 5. Insert PlayerSeasons
  // --------------------------------------------------------
  console.log('Building player-season data...');
  const playerSeasonBatch: any[] = [];

  for (const c of clubs) {
    const clubId = clubMap.get(c.nameRu);
    for (const [eraStart, eraEnd, players] of c.eras) {
      const eraSeasons = seasonDefs.filter((s: any) => s.startYear >= eraStart && s.startYear <= eraEnd);

      for (const season of eraSeasons) {
        const seasonId = seasonMap.get(season.label);
        const csKey = `${clubId}-${seasonId}`;
        const clubSeasonId = clubSeasonMap.get(csKey);
        if (!clubSeasonId) continue;

        for (const [lastName, firstName, posKey, baseRating, birthYear] of players) {
          const fullName = `${lastName} ${firstName}`;
          const playerId = playerMap.get(fullName);
          if (!playerId) continue;

          // Vary rating based on position within the era
          const yearOffset = season.startYear - eraStart;
          const eraLength = eraEnd - eraStart + 1;
          const midPoint = eraLength / 2;
          const distFromPeak = Math.abs(yearOffset + 0.5 - midPoint / 2);
          const ratingAdjust = Math.round(-distFromPeak * 1.2 + (seededRandom() * 2 - 1));
          const finalRating = Math.max(55, Math.min(95, baseRating + ratingAdjust));

          const age = birthYear ? season.startYear - birthYear : null;

          const isGK = posKey === 'GK';
          const isDef = ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(posKey);
          const isMid = ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(posKey);
          const isFwd = ['LW', 'RW', 'ST', 'CF'].includes(posKey);

          const baseMatches = Math.floor(20 + (finalRating - 60) * 0.4 + seededRandom() * 8);
          let goals = 0;
          let assists = 0;

          if (isGK) {
            goals = 0;
            assists = Math.floor(seededRandom() * 2);
          } else if (isDef) {
            goals = Math.floor(seededRandom() * 4);
            assists = Math.floor(seededRandom() * 5 + 1);
          } else if (isMid) {
            goals = Math.floor(seededRandom() * 6 + 1);
            assists = Math.floor(seededRandom() * 8 + 2);
          } else if (isFwd) {
            goals = Math.floor((finalRating - 65) * 0.3 + seededRandom() * 5 + 2);
            assists = Math.floor(seededRandom() * 6 + 1);
          }

          const otherPositions = getOtherPositions(posKey);

          playerSeasonBatch.push({
            id: cuid(),
            playerId,
            clubSeasonId,
            rating: finalRating,
            mainPosition: POS[posKey],
            otherPositions: otherPositions || null,
            age,
            matches: baseMatches,
            goals,
            assists,
          });
        }
      }
    }
  }

  console.log(`Inserting ${playerSeasonBatch.length} player-seasons (batch)...`);

  // Insert in chunks of 200
  const CHUNK_SIZE = 200;
  for (let i = 0; i < playerSeasonBatch.length; i += CHUNK_SIZE) {
    const chunk = playerSeasonBatch.slice(i, i + CHUNK_SIZE);
    await supabaseInsert('PlayerSeason', chunk);
    console.log(`  Inserted ${Math.min(i + CHUNK_SIZE, playerSeasonBatch.length)} / ${playerSeasonBatch.length}`);
  }

  // --------------------------------------------------------
  // Final summary
  // --------------------------------------------------------
  const totalClubs = await supabaseCount('Club');
  const totalSeasons = await supabaseCount('Season');
  const totalClubSeasons = await supabaseCount('ClubSeason');
  const totalPlayers = await supabaseCount('Player');
  const totalPlayerSeasons = await supabaseCount('PlayerSeason');

  console.log('\n===== SEED SUMMARY =====');
  console.log(`  Clubs:          ${totalClubs}`);
  console.log(`  Seasons:        ${totalSeasons}`);
  console.log(`  ClubSeasons:    ${totalClubSeasons}`);
  console.log(`  Players:        ${totalPlayers}`);
  console.log(`  PlayerSeasons:  ${totalPlayerSeasons}`);
  console.log('========================\n');
  console.log('Seed complete!');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
