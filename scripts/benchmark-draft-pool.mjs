/** Read-only benchmark; use a dedicated local database, never production. */
import { PrismaClient } from '@prisma/client';
import { performance } from 'node:perf_hooks';
import { draftPoolSelect } from '../src/lib/draftPoolQuery.ts';
if (!process.env.DATABASE_URL?.startsWith('file:') || !process.env.DATABASE_URL.includes('30-0-benchmark')) {
  throw new Error('A dedicated local 30-0-benchmark SQLite database is required');
}
const db = new PrismaClient();
const where = { season: { startYear: { gte: 2006, lte: 2026 } } };
const queries = {
  before: () => db.clubSeason.findMany({ where, include: { club: true, season: true, players: { include: { player: true } } } }),
  after: () => db.clubSeason.findMany({ where, select: draftPoolSelect }),
};
try {
  const results = {};
  for (const [name, query] of Object.entries(queries)) {
    await query(); // warm up the client and SQLite page cache equally
    const times = [];
    let rows;
    for (let i=0; i<7; i++) { const start=performance.now(); rows=await query(); times.push(performance.now()-start); }
    results[name] = { medianQueryMs: +times.sort((a,b)=>a-b)[3].toFixed(2), serializedBytes: Buffer.byteLength(JSON.stringify(rows)), clubSeasons: rows.length, cards: rows.reduce((n,row)=>n+row.players.length,0) };
  }
  console.log(JSON.stringify({ database:'local SQLite, imported source cards', iterations:7, includesHttpOrNetworkLatency:false, results,
    payloadReductionPercent:+((1-results.after.serializedBytes/results.before.serializedBytes)*100).toFixed(1) },null,2));
} finally { await db.$disconnect(); }
