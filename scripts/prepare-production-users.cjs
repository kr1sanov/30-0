#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Makes the legacy User.providerId data safe before Prisma adds its unique
 * index. No users or game runs are deleted. Conflicting legacy identities are
 * detached from login by assigning a stable `legacy_*` provider id; the oldest
 * record keeps the original provider id.
 */
const fs = require('node:fs');
const path = require('node:path');

const clientPath = path.join(
  process.cwd(),
  '.next',
  'standalone',
  'node_modules',
  '@prisma',
  'client',
);
const { PrismaClient } = require(clientPath);
const db = new PrismaClient();

function safeLegacyId(prefix, id) {
  const value = `${prefix}_${id}`;
  if (value.length > 255) throw new Error(`Cannot normalize providerId for user ${id}`);
  return value;
}

async function main() {
  const columns = await db.$queryRawUnsafe('SHOW COLUMNS FROM `User`');
  const columnNames = new Set(columns.map((column) => column.Field));
  if (!columnNames.has('provider')) {
    await db.$executeRawUnsafe(
      "ALTER TABLE `User` ADD COLUMN `provider` VARCHAR(50) NOT NULL DEFAULT 'guest'",
    );
  }
  if (!columnNames.has('providerId')) {
    await db.$executeRawUnsafe(
      'ALTER TABLE `User` ADD COLUMN `providerId` VARCHAR(255) NULL',
    );
  }
  if (!columnNames.has('email')) {
    await db.$executeRawUnsafe(
      'ALTER TABLE `User` ADD COLUMN `email` VARCHAR(255) NULL',
    );
  }

  // Preserve the identity of users created by the previous Telegram-only
  // schema before assigning generic legacy ids to any remaining rows.
  if (columnNames.has('telegramId')) {
    await db.$executeRawUnsafe(
      "UPDATE `User` SET `provider` = 'telegram', `providerId` = CONCAT('telegram_', `telegramId`) WHERE (`providerId` IS NULL OR TRIM(`providerId`) = '') AND `telegramId` IS NOT NULL AND TRIM(`telegramId`) <> ''",
    );
  }

  const users = await db.$queryRawUnsafe(
    'SELECT `id`, `provider`, `providerId`, `telegramId`, `createdAt` FROM `User` ORDER BY `createdAt`, `id`',
  );

  const missing = users.filter(
    (user) => user.providerId === null || String(user.providerId).trim() === '',
  );
  const duplicateGroups = await db.$queryRawUnsafe(
    "SELECT `providerId`, COUNT(*) AS `count` FROM `User` WHERE `providerId` IS NOT NULL AND TRIM(`providerId`) <> '' GROUP BY `providerId` HAVING COUNT(*) > 1",
  );

  const affectedIds = new Set(missing.map((user) => user.id));
  const duplicateRows = [];
  for (const group of duplicateGroups) {
    const rows = await db.$queryRawUnsafe(
      'SELECT `id`, `provider`, `providerId`, `telegramId`, `createdAt` FROM `User` WHERE `providerId` = ? ORDER BY `createdAt`, `id`',
      group.providerId,
    );
    rows.slice(1).forEach((row) => {
      affectedIds.add(row.id);
      duplicateRows.push(row);
    });
  }

  if (affectedIds.size > 0) {
    const backupDir = path.resolve(process.env.MIGRATION_BACKUP_DIR || 'backups/private');
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(backupDir, 0o700);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `user-provider-${stamp}.json`);
    const affected = users.filter((user) => affectedIds.has(user.id));
    fs.writeFileSync(backupFile, `${JSON.stringify(affected, null, 2)}\n`, { mode: 0o600 });
    console.log(`Identity backup written for ${affected.length} user(s).`);
  }

  for (const user of missing) {
    await db.$executeRawUnsafe(
      "UPDATE `User` SET `provider` = 'legacy', `providerId` = ? WHERE `id` = ?",
      safeLegacyId('legacy', user.id),
      user.id,
    );
  }

  for (const user of duplicateRows) {
    await db.$executeRawUnsafe(
      "UPDATE `User` SET `provider` = 'legacy', `providerId` = ? WHERE `id` = ?",
      safeLegacyId('legacy_duplicate', user.id),
      user.id,
    );
  }

  const invalid = await db.$queryRawUnsafe(
    "SELECT COUNT(*) AS `count` FROM `User` WHERE `providerId` IS NULL OR TRIM(`providerId`) = ''",
  );
  const duplicates = await db.$queryRawUnsafe(
    "SELECT COUNT(*) AS `count` FROM (SELECT `providerId` FROM `User` GROUP BY `providerId` HAVING COUNT(*) > 1) AS duplicate_ids",
  );
  const invalidCount = Number(invalid[0]?.count ?? 0);
  const duplicateCount = Number(duplicates[0]?.count ?? 0);
  if (invalidCount !== 0 || duplicateCount !== 0) {
    throw new Error(`providerId preflight failed: missing=${invalidCount}, duplicate_groups=${duplicateCount}`);
  }

  console.log(
    `User providerId preflight passed (normalized missing=${missing.length}, duplicates=${duplicateRows.length}).`,
  );
}

main()
  .catch((error) => {
    console.error(`User providerId preflight failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
