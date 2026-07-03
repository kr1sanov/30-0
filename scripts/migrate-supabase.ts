import { PrismaClient } from '@prisma/client';

const SUPABASE_URL = 'postgresql://postgres.lukxzfkmlajotcruxrgx:kri3Wf48_29@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: SUPABASE_URL },
    },
  });

  try {
    // Execute raw SQL to create User table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "telegramId" TEXT NOT NULL UNIQUE,
        "username" TEXT,
        "firstName" TEXT,
        "lastName" TEXT,
        "displayName" TEXT NOT NULL DEFAULT 'Игрок',
        "photoUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ User table created');

    // Add userId column to GameRun
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "GameRun" ADD COLUMN IF NOT EXISTS "userId" TEXT;
    `);
    console.log('✅ userId column added to GameRun');

    // Add index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "GameRun_userId_idx" ON "GameRun"("userId");
    `);
    console.log('✅ Index created');

    // Verify
    const count = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "User"`);
    console.log('✅ Verification: User table exists, count:', count);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
