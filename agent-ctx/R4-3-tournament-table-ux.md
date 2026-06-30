# Task ID: R4-3 — Tournament Table + Position Assignment UX Agent

## Work Completed

### 1. Tournament Table — Expandable with Enhanced Styling
**File**: `/src/components/game/SimulationResult.tsx`

- Changed the tournament table from always-visible to an **expandable section** with `📊 Таблица РПЛ` header button and animated expand/collapse (matching the existing "📋 Матчи по турам" pattern)
- Added `showTable` state (default: collapsed)
- Added **🏆 icon** for the champion (1st place) instead of just the medal emoji
- **User's team** (`Моя команда`) is highlighted with green text and green background tint (`bg-[#22c55e]/10`, `text-[#22c55e]`)
- **Relegation zone** (positions 14-16) shown in red text with red background tint (`text-[#ef4444]`, `bg-[#ef4444]/5`)
- Added **МЗ** (Goals For) and **МП** (Goals Against) columns in addition to the existing РМ (Goal Difference) column for a complete RPL-style table
- Goal Difference values are now color-coded: green for positive, red for negative
- Used `motion.div` for smooth expand animation and `motion.span` for the chevron rotation

### 2. FormationView UX Improvements
**File**: `/src/components/game/FormationView.tsx`

- **Compatible positions info bar**: When a player is selected, a bar appears above the pitch showing "Совместимые позиции:" with position badges (e.g., `ЦП`, `АП`, `ЦН`, `НП`) styled as green pills. Uses `getCompatiblePositions()` from positions.ts.
- **Incompatible slot indicator**: When a slot is NOT compatible with the selected player, it shows:
  - Red-tinted dashed border (`border-[#ef4444]/40 border-dashed`)
  - Dimmer background color
  - The position label in red + a small ❌ emoji below it
- **Shake animation on incompatible click**: When user clicks an incompatible empty slot, a shake animation (`animate-shake`) plays for 400ms. Uses `useState` for `shakingSlot` and `setTimeout` to clear it.
- Added CSS `@keyframes shake` animation to `globals.css`
- Removed `toast` import and calls (replaced shake animation for incompatible feedback)
- Removed unused `rerollsUsed` from destructured store

### 3. PositionAssignScreen Enhancement
**File**: `/src/app/page.tsx`

- **Enhanced info banner**: Now shows:
  - Player's rating as a green badge
  - "Позиции:" label followed by all position badges (main + other positions) in blue pills
  - Open positions count
- **🔙 Назад button**: Added below the info banner. Clicking it clears `selectedPlayer` and navigates back to the `draft` screen, allowing the user to go back without assigning a position.
- Larger icon and better layout with `flex-1 min-w-0` for responsive wrapping

### 4. Position Swap Persistence via API
**Files**: 
- **NEW**: `/src/app/api/runs/[runId]/swap/route.ts`
- **MODIFIED**: `/src/store/gameStore.ts`

**Swap API endpoint** (`POST /api/runs/[runId]/swap`):
- Accepts `{ fromSlotPosition: string, toSlotPosition: string }` in request body
- Validates the run exists and is not completed
- Finds both slots by their `slotPosition` identifier
- Swaps `playerSeasonId`, `playerName`, `playerRating`, `playerPosition` between the two slots
- Recalculates `isCompatible` for each slot after the swap using `canFillSlot()`
- Updates both slots in the database
- Returns the updated slots array

**gameStore movePlayer update**:
- After the local swap (optimistic update), the function now also calls the swap API
- Uses `fetch()` with `.catch()` for fire-and-forget persistence (doesn't block UI)
- Constructs `fromSlotPosition` and `toSlotPosition` as `{position}_{index}` format

### 5. CSS Addition
**File**: `/src/app/globals.css`

Added shake animation keyframes:
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
  20%, 40%, 60%, 80% { transform: translateX(3px); }
}
.animate-shake { animation: shake 0.4s ease-in-out; }
```

## Files Modified
1. `/src/components/game/SimulationResult.tsx` — expandable tournament table with enhanced styling
2. `/src/components/game/FormationView.tsx` — incompatible indicators, shake animation, compatible positions bar
3. `/src/app/page.tsx` — enhanced PositionAssignScreen with rating/positions display and back button
4. `/src/app/globals.css` — shake animation keyframes
5. `/src/store/gameStore.ts` — movePlayer now persists swaps via API
6. `/src/app/api/runs/[runId]/swap/route.ts` — NEW swap API endpoint

## Lint & Build Status
- `bun run lint` passes with zero errors
- Dev server returns 200 for all routes
- No compilation errors
