# Task 3-4: ERA_CONFIG Update & Custom Era Range Slider

## Summary

Updated the era configuration system from a simple minYear-only filter to a full range-based system with minYear/maxYear, and added a custom era range slider in the GameSetup UI.

## Changes Made

### 1. `/home/z/my-project/src/lib/types.ts`
- Updated `ERA_CONFIG` to use 2000–2026 range with both `minYear` and `maxYear` per era
- Added `'custom'` era option with label `'Свой период'`
- Updated `GameConfig.eraFilter` type to include `'custom'`
- Added `eraStartYear?: number` and `eraEndYear?: number` optional fields to `GameConfig`

### 2. `/home/z/my-project/prisma/schema.prisma`
- Added `eraStartYear Int?` and `eraEndYear Int?` fields to `GameRun` model
- Ran `bun run db:push` to apply schema changes

### 3. `/home/z/my-project/src/store/gameStore.ts`
- Updated `defaultConfig` to include `eraStartYear: 2000` and `eraEndYear: 2026`

### 4. `/home/z/my-project/src/components/game/GameSetup.tsx`
- Imported `Slider` from `@/components/ui/slider`
- Added local `eraRange` state for the dual-thumb slider
- Changed era grid to 5 columns (`sm:grid-cols-5`) to accommodate the new 'custom' option
- When 'custom' era is selected, shows `setConfig` with eraStartYear/eraEndYear
- Added animated range slider UI that appears when `config.eraFilter === 'custom'`:
  - Dual-thumb Slider (min=2000, max=2026, step=1)
  - Shows selected range as text (e.g. "2000 — 2026")
  - Updates config in real-time as slider moves

### 5. `/home/z/my-project/src/app/api/runs/route.ts`
- Destructured `eraStartYear` and `eraEndYear` from request body
- Saves `eraStartYear` and `eraEndYear` to GameRun when `eraFilter === 'custom'`, otherwise saves null

### 6. `/home/z/my-project/src/app/api/runs/[runId]/spin/route.ts`
- Updated era filtering to use both `minYear` and `maxYear` from `ERA_CONFIG`
- For custom era, reads `run.eraStartYear` and `run.eraEndYear` from the database
- Query now uses `{ gte: minYear, lte: maxYear }` instead of only `{ gte: minYear }`

### 7. `/home/z/my-project/src/app/api/runs/[runId]/reroll/route.ts`
- Same update as spin route: uses both minYear and maxYear for era filtering
- Supports custom era with stored start/end years

### 8. `/home/z/my-project/src/components/game/SpinWheel.tsx`
- Removed pre-2000 seasons from `RPL_SEASONS` array (removed 1999/00 through 1992/93)
- Now only includes seasons from 2000/01 to 2024/25

## Verification
- Lint passes with zero errors
- Dev server compiles successfully
