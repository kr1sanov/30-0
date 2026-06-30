# Task: Create API Routes for 30-0 RPL Game

## Status: Completed

## Summary
Created all 10 API route files for the 30-0 RPL football draft game. All routes pass lint checks cleanly.

## Files Created

### 1. `/src/app/api/clubs/route.ts` (GET)
- Returns all clubs ordered by `nameRu` ascending
- Uses `db.club.findMany()`

### 2. `/src/app/api/seasons/route.ts` (GET)
- Returns all seasons ordered by `startYear` descending
- Uses `db.season.findMany()`

### 3. `/src/app/api/formations/route.ts` (GET)
- Returns all 12 formations from `@/lib/positions`
- Imports `FORMATIONS` constant

### 4. `/src/app/api/runs/route.ts` (POST)
- Accepts `{ formation, difficulty, draftMode, ratingMode, eraFilter }`
- Validates formation exists against FORMATIONS
- Sets `rerollsTotal` based on difficulty (easy=3, normal=1, hard=0)
- Creates GameRun + 11 GameSlots from formation
- Returns run with slots (status 201)

### 5. `/src/app/api/runs/[runId]/route.ts` (GET)
- Returns run details with slots ordered by slotPosition
- Uses Next.js 16 async params pattern

### 6. `/src/app/api/runs/[runId]/spin/route.ts` (POST)
- Gets open slots (playerSeasonId is null)
- Queries ClubSeasons filtered by era (Season.startYear >= minYear from ERA_CONFIG)
- Builds ClubSeasonWithPlayers with available positions
- Filters using `filterCompatibleClubSeasons()` from wheel.ts
- Uses `spinWheel()` for weighted random selection
- Returns `{ clubSeasonId, clubName, seasonLabel, players }` 
- Each player has: playerSeasonId, fullName, lastName, rating, mainPosition, otherPositions, nationality
- Excludes already drafted players (by playerSeasonId and fullName unique person rule)
- Hides ratings when difficulty is 'hard' (returns 0)

### 7. `/src/app/api/runs/[runId]/draft/route.ts` (POST)
- Accepts `{ playerSeasonId, slotPosition }`
- Validates player can fill slot using `canFillSlot()`
- Checks unique person rule (same fullName)
- Updates GameSlot with player info
- Sets `isCompatible` based on position penalty (full=true, partial=false)

### 8. `/src/app/api/runs/[runId]/reroll/route.ts` (POST)
- Checks rerolls remaining (rerollsUsed < rerollsTotal)
- Increments rerollsUsed
- Returns new spin result (same logic as spin route)
- Includes rerollsUsed and rerollsTotal in response

### 9. `/src/app/api/runs/[runId]/simulate/route.ts` (POST)
- Validates all 11 slots are filled
- Builds SquadSlot[] from filled slots
- Runs `simulateSeason()` from simulation.ts
- Updates GameRun with results (wins, draws, losses, points, position, etc.)
- Returns full season result including table and matches

### 10. `/src/app/api/leaderboard/route.ts` (GET)
- Returns top 50 completed GameRuns ordered by points desc, position asc
- Includes filled slots for each run

## Key Design Decisions
- Slot positions use format `POSITION_INDEX` (e.g., "ВР_0", "ЦЗ_1") to handle duplicate positions in formations
- Next.js 16 async params pattern: `params: Promise<{ runId: string }>`
- All routes use try/catch with appropriate status codes
- Consistent error response format: `{ error: string }`
- `@/lib/positions` provides position compatibility via `canFillSlot()`
- `@/lib/wheel` provides `filterCompatibleClubSeasons()` and `spinWheel()`
- `@/lib/simulation` provides `simulateSeason()`
- `@/lib/types` provides `ERA_CONFIG` for era filtering

## Lint Result
Passed with no errors or warnings.
