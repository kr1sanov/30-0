-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT,
    "city" TEXT,
    "logoUrl" TEXT,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "matchesPerTeam" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubSeason" (
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

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT,
    "fullName" TEXT NOT NULL,
    "nationality" TEXT,
    "birthYear" INTEGER,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSeason" (
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

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "photoUrl" TEXT,
    "displayName" TEXT NOT NULL DEFAULT 'Игрок',
    "profileStatsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRun" (
    "id" TEXT NOT NULL,
    "formation" TEXT NOT NULL DEFAULT '4-3-3',
    "difficulty" TEXT NOT NULL DEFAULT 'normal',
    "draftMode" TEXT NOT NULL DEFAULT 'squad_first',
    "ratingMode" TEXT NOT NULL DEFAULT 'season',
    "eraFilter" TEXT NOT NULL DEFAULT 'all',
    "eraStartYear" INTEGER,
    "eraEndYear" INTEGER,
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
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSlot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "slotPosition" TEXT NOT NULL,
    "playerSeasonId" TEXT,
    "playerName" TEXT,
    "playerLastName" TEXT,
    "playerRating" INTEGER,
    "playerPosition" TEXT,
    "playerOtherPositions" TEXT,
    "playerNationality" TEXT,
    "isCompatible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GameSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_nameRu_key" ON "Club"("nameRu");

-- CreateIndex
CREATE UNIQUE INDEX "Season_startYear_endYear_key" ON "Season"("startYear", "endYear");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSeason_clubId_seasonId_key" ON "ClubSeason"("clubId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_fullName_key" ON "Player"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeason_playerId_clubSeasonId_key" ON "PlayerSeason"("playerId", "clubSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSlot_runId_slotPosition_key" ON "GameSlot"("runId", "slotPosition");

-- AddForeignKey
ALTER TABLE "ClubSeason" ADD CONSTRAINT "ClubSeason_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubSeason" ADD CONSTRAINT "ClubSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeason" ADD CONSTRAINT "PlayerSeason_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeason" ADD CONSTRAINT "PlayerSeason_clubSeasonId_fkey" FOREIGN KEY ("clubSeasonId") REFERENCES "ClubSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRun" ADD CONSTRAINT "GameRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSlot" ADD CONSTRAINT "GameSlot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "GameRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
