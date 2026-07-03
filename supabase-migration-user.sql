-- Migration: Add User table and userId to GameRun
-- For Supabase / PostgreSQL

-- Add User table
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

-- Add userId to GameRun (nullable)
ALTER TABLE "GameRun" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Add foreign key (optional relation)
-- We skip the actual FK constraint since User might not exist for old GameRun records
-- Prisma handles this at the application level

-- Add index for performance
CREATE INDEX IF NOT EXISTS "GameRun_userId_idx" ON "GameRun"("userId");
