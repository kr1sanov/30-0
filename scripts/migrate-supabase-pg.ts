import pg from 'pg';

async function main() {
  // Use Transaction pooler for DDL (port 6543)
  const client = new pg.Client({
    host: 'aws-1-eu-central-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.lukxzfkmlajotcruxrgx',
    password: 'kri3Wf48_29',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase via pooler');

    // Create User table
    await client.query(`
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
    await client.query(`
      ALTER TABLE "GameRun" ADD COLUMN IF NOT EXISTS "userId" TEXT;
    `);
    console.log('✅ userId column added to GameRun');

    // Add index
    await client.query(`
      CREATE INDEX IF NOT EXISTS "GameRun_userId_idx" ON "GameRun"("userId");
    `);
    console.log('✅ Index created');

    // Verify
    const res = await client.query(`SELECT count(*) FROM "User"`);
    console.log('✅ Verification: User table exists, count:', res.rows[0].count);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

main();
