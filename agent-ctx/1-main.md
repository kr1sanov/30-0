# Task 1 — Fix database connection issue and add error handling

## Summary
Fixed the Vercel/Supabase IPv6 connection issue by creating a PostgreSQL schema with `directUrl` support, and added comprehensive frontend error handling with auto-dismissing toast notifications.

## Changes Made

### 1. `src/store/gameStore.ts`
- Added `error: string | null` to `GameState` interface
- Added `clearError: () => void` action
- Updated all async methods to set error on failure:
  - `startRun` — sets error on `!res.ok` and catch
  - `spin` — sets error on `!res.ok` and catch
  - `reroll` — sets error on `!res.ok` and catch
  - `assignToSlot` — sets error on `!res.ok` and catch
  - `simulate` — sets error on `!res.ok` and catch
  - `undoLastPick` — sets error on `!res.ok` and catch
  - `loadLeaderboard` — sets error on `!res.ok` and catch
- `resetGame()` now clears `error: null`
- All methods call `set({ error: null })` at the start of try block

### 2. `src/components/game/ErrorToast.tsx` (NEW)
- Auto-dismissing toast using Framer Motion AnimatePresence
- Shows when store has an error
- Dismisses after 5 seconds or on close button click
- Uses selectors for `error` and `clearError` to minimize re-renders

### 3. `src/app/page.tsx`
- Added import for `ErrorToast`
- Renders `<ErrorToast />` before `<Header />` in the main div

### 4. `prisma/schema.postgresql.prisma` (NEW)
- PostgreSQL variant of the schema for Vercel deployment
- Uses `directUrl = env("DIRECT_URL")` for Supabase connection pooling
- `DATABASE_URL` should be the Transaction pooler (port 6543)
- `DIRECT_URL` should be the direct connection (port 5432)

### 5. `vercel.json`
- Already had correct build command: `cp prisma/schema.postgresql.prisma prisma/schema.prisma && npx prisma generate && next build`
- No changes needed (verified it's correct)

### 6. `src/app/api/health/route.ts` (NEW)
- Health check endpoint at GET `/api/health`
- Tests database connectivity by counting clubs, players, seasons
- Returns `{ status, database, clubs, players, seasons }` on success
- Returns `{ status: 'error', database: 'disconnected', error }` on failure with HTTP 500
