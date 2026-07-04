# Task 2 — User Model + Cloud Sync API

## Summary

Added User model to Prisma schema and created cloud sync/profile API routes for the 30-0 RPL football draft simulator.

## Work Completed

### 1. Prisma Schema Updates (`prisma/schema.prisma`)
- Added `User` model with: `id`, `telegramId` (unique), `username`, `firstName`, `lastName`, `photoUrl`, `displayName` (default "Игрок"), `profileStatsJson` (String?, stores JSON), `createdAt`, `updatedAt`
- Added `runs GameRun[]` relation to User
- Added `userId String?` and `user User? @relation(fields: [userId], references: [id], onDelete: SetNull)` to GameRun model
- Ran `bun run db:push` successfully

### 2. API Route: `/api/users/sync` (POST)
- File: `src/app/api/users/sync/route.ts`
- Accepts: `telegramId`, `username`, `firstName`, `lastName`, `photoUrl`, `profileStats`
- Upserts user by `telegramId`
- Serializes `profileStats` to JSON string for `profileStatsJson` field
- Only updates `profileStatsJson` if explicitly provided in request
- Returns user object with parsed `profileStats`

### 3. API Route: `/api/users/profile` (GET)
- File: `src/app/api/users/profile/route.ts`
- Query param: `telegramId`
- Returns user profile + aggregate stats from completed game runs
- Calculates: totalGames, totalWins, totalDraws, totalLosses, totalPoints, bestPosition, bestOverallRating
- Returns last 50 completed runs as `recentRuns`

### 4. Existing Auth Routes Verified
- `/api/auth/telegram` — POST, validates Telegram initData, upserts user (now works with User model)
- `/api/auth/profile` — PATCH, updates displayName

### 5. Testing
All routes tested via curl and confirmed working.

## Files Modified
- `prisma/schema.prisma` — Added User model, updated GameRun with userId relation
- `src/app/api/users/sync/route.ts` — NEW
- `src/app/api/users/profile/route.ts` — NEW
- `worklog.md` — Updated with Round 12 changes
