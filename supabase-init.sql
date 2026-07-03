-- 30-0 RPL: Supabase Database Initialization
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run

-- CreateTable: Club
CREATE TABLE IF NOT EXISTS "Club" (
    "id" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT,
    "city" TEXT,
    "logoUrl" TEXT,
    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Season
CREATE TABLE IF NOT EXISTS "Season" (
    "id" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "matchesPerTeam" INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ClubSeason
CREATE TABLE IF NOT EXISTS "ClubSeason" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "position" INTEGER,
    "points" INTEGER,
    "played" INTEGER,
    "won" INTEGER,
    "drawn" INTEGER,
    "lost" INTEGER,
    "goalsFor" INTEGER,
    "goalsAgainst" INTEGER,
    CONSTRAINT "ClubSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Player
CREATE TABLE IF NOT EXISTS "Player" (
    "id" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT,
    "fullName" TEXT NOT NULL,
    "nationality" TEXT,
    "birthYear" INTEGER,
    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlayerSeason
CREATE TABLE IF NOT EXISTS "PlayerSeason" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubSeasonId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "mainPosition" TEXT NOT NULL,
    "otherPositions" TEXT,
    "age" INTEGER,
    "matches" INTEGER,
    "goals" INTEGER,
    "assists" INTEGER,
    CONSTRAINT "PlayerSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GameRun
CREATE TABLE IF NOT EXISTS "GameRun" (
    "id" TEXT NOT NULL,
    "formation" TEXT NOT NULL DEFAULT '4-3-3',
    "difficulty" TEXT NOT NULL DEFAULT 'normal',
    "draftMode" TEXT NOT NULL DEFAULT 'squad_first',
    "ratingMode" TEXT NOT NULL DEFAULT 'season',
    "eraFilter" TEXT NOT NULL DEFAULT 'all',
    "rerollsTotal" INTEGER NOT NULL DEFAULT 1,
    "rerollsUsed" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "wins" INTEGER,
    "draws" INTEGER,
    "losses" INTEGER,
    "points" INTEGER,
    "position" INTEGER,
    "goalsFor" INTEGER,
    "goalsAgainst" INTEGER,
    "overallRating" INTEGER,
    "managerName" TEXT,
    "managerRating" INTEGER,
    "teamName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GameSlot
CREATE TABLE IF NOT EXISTS "GameSlot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "slotPosition" TEXT NOT NULL,
    "playerSeasonId" TEXT,
    "playerName" TEXT,
    "playerRating" INTEGER,
    "playerPosition" TEXT,
    "isCompatible" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "GameSlot_pkey" PRIMARY KEY ("id")
);

-- Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Club_nameRu_key" ON "Club"("nameRu");
CREATE UNIQUE INDEX IF NOT EXISTS "Season_startYear_endYear_key" ON "Season"("startYear", "endYear");
CREATE UNIQUE INDEX IF NOT EXISTS "ClubSeason_clubId_seasonId_key" ON "ClubSeason"("clubId", "seasonId");
CREATE UNIQUE INDEX IF NOT EXISTS "Player_fullName_key" ON "Player"("fullName");
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerSeason_playerId_clubSeasonId_key" ON "PlayerSeason"("playerId", "clubSeasonId");
CREATE UNIQUE INDEX IF NOT EXISTS "GameSlot_runId_slotPosition_key" ON "GameSlot"("runId", "slotPosition");

-- Foreign Keys
DO $$ BEGIN
  ALTER TABLE "ClubSeason" ADD CONSTRAINT "ClubSeason_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClubSeason" ADD CONSTRAINT "ClubSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PlayerSeason" ADD CONSTRAINT "PlayerSeason_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PlayerSeason" ADD CONSTRAINT "PlayerSeason_clubSeasonId_fkey" FOREIGN KEY ("clubSeasonId") REFERENCES "ClubSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GameSlot" ADD CONSTRAINT "GameSlot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "GameRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Disable RLS for all tables (we handle auth at app level)
ALTER TABLE "Club" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Season" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClubSeason" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Player" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerSeason" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameSlot" ENABLE ROW LEVEL SECURITY;

-- Allow public read access for game data
CREATE POLICY "Public read Club" ON "Club" FOR SELECT USING (true);
CREATE POLICY "Public read Season" ON "Season" FOR SELECT USING (true);
CREATE POLICY "Public read ClubSeason" ON "ClubSeason" FOR SELECT USING (true);
CREATE POLICY "Public read Player" ON "Player" FOR SELECT USING (true);
CREATE POLICY "Public read PlayerSeason" ON "PlayerSeason" FOR SELECT USING (true);
CREATE POLICY "Public CRUD GameRun" ON "GameRun" FOR ALL USING (true);
CREATE POLICY "Public CRUD GameSlot" ON "GameSlot" FOR ALL USING (true);
