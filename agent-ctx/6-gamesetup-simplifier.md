# Task 6 — GameSetup Component Simplification

## Summary
Simplified the `GameSetup` component at `/home/z/my-project/src/components/game/GameSetup.tsx` to be more minimalistic per the task requirements.

## Changes Made

### 1. Removed Quick Start button ("Быстрый старт")
- Removed the entire animated yellow Quick Start button and its Tooltip wrapper
- Removed the Quick Pick confirmation overlay (AnimatePresence modal)
- Removed `handleQuickPick` callback, `quickPickPreview` state, and `isQuickPicking` state
- Removed the `PreviewRow` helper component (only used in the overlay)

### 2. Removed team name input block
- Removed the team name input field and its label entirely
- The default "Моя команда" will be used from the store's default config

### 3. Shortened era period to 2000-2026
- ERA_CONFIG in types.ts already had minYear: 2000 for 'all' — no changes needed there
- Added "2000–2026" range display under each era filter button in the UI
- No references to 1990 or 1992 existed in the GameSetup component

### 4. Made interface more minimalistic
- **Removed Draft Mode selector** — hardcoded to `squad_first` (store default)
- **Removed Rating Mode selector** — hardcoded to `season` (store default)
- **Removed Show Ratings toggle** — this is implicitly controlled by difficulty selection
- **Removed Settings Summary bar** — with only 3 settings, the summary was redundant
- **Simplified formation selector**: compact 4-col/6-col grid, removed type badges, removed descriptions, removed animated "Выбрано" label, removed pulsing glow animations, smaller mini pitch
- **Simplified difficulty cards**: removed animated scale effects, removed indicator strip, combined reroll count and rating visibility into single flavor line
- **Simplified era buttons**: added year range subtitle, simpler styling
- **Kept Start Game button prominent**: green gradient, shimmer animation, full width

### 5. Cleaned up imports
- Removed: `DRAFT_MODE_CONFIG`, `RATING_MODE_CONFIG` from types imports
- Removed: `GameConfig` type import (no longer needed)
- Removed: `Switch` component import
- Removed: `Tooltip`, `TooltipContent`, `TooltipTrigger` imports
- Removed: `useCallback` from react imports
- Removed: `AnimatePresence` import (no longer used after removing overlays)
- Kept: `motion` (used for Start button shimmer)
- Kept: `DIFFICULTY_CONFIG`, `ERA_CONFIG`, `Difficulty`, `EraFilter` imports

### File Statistics
- **Before**: 955 lines
- **After**: ~270 lines
- **Reduction**: ~72% fewer lines of code

### Lint Status
- ✅ ESLint passes with no errors
