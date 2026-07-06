---
Task ID: 1
Agent: main
Task: Fix season simulation not working after clicking "Сыграть сезон"

Work Log:
- Investigated the full project structure and identified the season simulation flow
- Found the root cause: Zustand store uses optimistic updates for draft picks, and when the draft API returns 400, the optimistic update was NOT reverted, causing the frontend to think all 11 slots are filled while the DB doesn't agree
- The simulate API checks the DB for filled slots and returns 400 if not all 11 are filled
- When simulate failed, the store silently went back to 'squad-complete' without any error message

- Added `syncRunWithDB()` method to gameStore.ts that:
  1. Fetches the current run state from DB via GET /api/runs/[runId]
  2. Identifies slots that are filled locally but not in the DB
  3. Re-saves those missing slots via the draft API
  4. Re-fetches the run to get the latest DB state
  5. Syncs the local slots array with the DB state
  6. Returns true if all 11 slots are filled in DB (ready to simulate)

- Fixed `simulate()` in gameStore.ts to:
  1. Call syncRunWithDB() before calling the simulate API
  2. Show proper error handling (go to 'pre-match' instead of 'squad-complete' on failure)
  3. Handle "already completed" runs by going to home screen

- Fixed draft 400 error handling in `assignToSlot()`:
  1. "Slot already filled" errors → keep optimistic update (DB already has it)
  2. "Player already drafted" / "cannot fill position" errors → revert the optimistic update
  3. Added `lastDraftError` state for UI feedback

- Tested via agent-browser: full flow from draft → squad-complete → pre-match → simulate → result works
- API direct test confirms simulate returns 200 with proper results (points, position, matches, trophies)

Stage Summary:
- Season simulation now works correctly
- Root cause was data desync between frontend optimistic updates and DB
- Added robust sync mechanism before simulation
- Improved error handling throughout the simulation flow
