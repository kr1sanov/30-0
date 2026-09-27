/** One-time production reset after the verified roster import.
 * Idempotent marker and the pre-reset snapshot stay outside the web root's
 * published assets, under the private backup directory.
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve(process.env.MIGRATION_BACKUP_DIR ?? 'backups/private');
const marker = resolve(directory, 'progress-reset-2026-09-27.done');
if (existsSync(marker)) process.exit(0);
if (!process.argv.includes('--apply') || !process.env.DATABASE_URL) {
  throw new Error('Explicit --apply and DATABASE_URL required');
}

const db = new PrismaClient();
try {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const backup = {
    users: await db.user.findMany({ select: { id: true, profileStatsJson: true } }),
    runs: await db.gameRun.findMany(),
    slots: await db.gameSlot.findMany(),
  };
  const filename = resolve(directory, `progress-before-reset-${Date.now()}.json`);
  writeFileSync(filename, JSON.stringify(backup), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  await db.$transaction(async tx => {
    await tx.gameSlot.deleteMany();
    await tx.gameRun.deleteMany();
    await tx.user.updateMany({ data: { profileStatsJson: null } });
    // The temporary 2009 archive served old drafts; those drafts are gone.
    await tx.season.deleteMany({ where: { startYear: { lt: 2010 } } });
    await tx.player.deleteMany({ where: { seasons: { none: {} } } });
    await tx.club.deleteMany({ where: { seasons: { none: {} } } });
  }, { timeout: 120_000 });
  writeFileSync(marker, `${new Date().toISOString()}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  console.log(`Progress reset completed: ${backup.runs.length} runs, ${backup.slots.length} slots, ${backup.users.length} profiles; private backup saved.`);
} finally {
  await db.$disconnect();
}
