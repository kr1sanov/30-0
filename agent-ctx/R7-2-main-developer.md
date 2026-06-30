# Task R7-2 — Team Name Input, Draft Undo, Achievement Unlocked Animation

## Agent: Main Developer
## Task ID: R7-2

## Summary
Successfully implemented all three features:

1. **Team Name Input** — Added `teamName` to GameConfig, Prisma schema, and API. Input field in GameSetup with ⚽ icon prefix, 24-char max. Displayed in DraftProgressTracker, SimulationResult, ProfileScreen, RecentResults, and share text.

2. **Draft Undo** — Added `lastDraftState` snapshot to gameStore. `undoLastPick()` restores state and calls `/api/runs/[runId]/undo` API. Orange undo button in DraftProgressTracker with spring animation and toast confirmation.

3. **Achievement Unlocked Popup** — New `AchievementUnlocked.tsx` component with gold border card, animated trophy, sparkle particles, auto-dismiss after 5s. `newAchievements` state tracks newly earned vs previously earned. Sequential display via `dismissAchievement()`.

## Files Modified
- `/src/lib/types.ts` — Added teamName to GameConfig
- `/prisma/schema.prisma` — Added teamName column to GameRun
- `/src/app/api/runs/route.ts` — Accept teamName
- `/src/store/gameStore.ts` — Added lastDraftState, undoLastPick, newAchievements, dismissAchievement
- `/src/components/game/GameSetup.tsx` — Team name input + summary bar
- `/src/components/game/DraftProgressTracker.tsx` — Team name + undo button
- `/src/components/game/AchievementUnlocked.tsx` — NEW
- `/src/app/api/runs/[runId]/undo/route.ts` — NEW
- `/src/app/page.tsx` — AchievementUnlocked rendering + teamName in RecentResults
- `/src/components/game/SimulationResult.tsx` — Team name display + share text
- `/src/components/game/ProfileScreen.tsx` — Team name in history

## Quality
- Lint: 0 errors
- All 'use client' directives present
- TypeScript strict
- Russian UI text
- Framer Motion animations
- Dark theme consistent
