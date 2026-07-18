# Task: fix-critical — Critical Bug Fixes

## Summary
Applied all 7 critical fixes from comprehensive audit.

## Changes Made

### Fix 1: Undo route missing player fields
- **File**: `src/app/api/runs/[runId]/undo/route.ts`
- **Change**: Added `playerLastName: null, playerPrimeRating: null, playerOtherPositions: null, playerNationality: null` to the `db.gameSlot.update()` data object
- **Impact**: Prevents ghost data remaining after undo operations

### Fix 2: Deploy-webhook shell injection
- **File**: `src/app/api/deploy-webhook/route.ts`
- **Change**: Complete rewrite — replaced `exec()` with `execFile()`, removed curl artifact download, removed GET endpoint
- **Impact**: Eliminates command injection vulnerability

### Fix 3: SSRF via image remote patterns
- **File**: `next.config.ts`
- **Change**: Replaced `hostname: "**"` with specific domains: `mc.yandex.ru` and `telegram.org`
- **Impact**: Prevents Next.js image optimization from proxying arbitrary hosts

### Fix 4: Unused heavy dependencies
- **File**: `package.json`
- **Change**: Removed 16 unused deps (~12.5MB), moved `prisma` to devDependencies
- **Impact**: Reduced bundle size, cleaner dependency tree

### Fix 5: Credentials leak
- **File**: `.env.example`
- **Change**: Replaced actual password `ArT2r6hyy` with `YOUR_MYSQL_PASSWORD_HERE`
- **Impact**: Prevents credential exposure in version control

### Fix 6: Database indexes
- **Files**: `prisma/schema.prisma`, `prisma/schema.mysql.prisma`, `prisma/schema.sqlite.prisma`
- **Change**: Added indexes on GameRun, GameSlot, PlayerSeason, ClubSeason
- **Impact**: Improved query performance for leaderboard, user runs, player lookups

### Fix 7: HSTS and HTTPS redirect
- **File**: `public/.htaccess`
- **Change**: Uncommented HSTS header and HTTPS rewrite rule
- **Impact**: Forces HTTPS in production

## Verification
- `tsc --noEmit`: 0 errors ✓
- `npm run build`: succeeds ✓  
- Dev server: HTTP 200 ✓
- Lint: 6 pre-existing errors only (unrelated to changes)
