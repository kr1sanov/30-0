# Task 2 — Header & Game UI Agent

## Task: Hide toolbar and add subtle game navigation buttons

### Summary
Modified Header component to support 3 display modes and added `goHome()`/`resumeGame()` store actions.

### Files Modified
1. **`/home/z/my-project/src/store/gameStore.ts`** — Added `goHome()` and `resumeGame()` actions
   - `goHome()`: Sets screen to 'home' without clearing game state
   - `resumeGame()`: Intelligently returns to the appropriate game screen based on current state

2. **`/home/z/my-project/src/components/layout/Header.tsx`** — Complete rewrite with 3 modes
   - Mode 1 (home): Returns null, header completely hidden
   - Mode 2 (game screens): Subtle fixed overlay buttons (Home + Profile) with opacity-30/hover:opacity-80
   - Mode 3 (setup/profile/leaderboard): Normal full header

### Key Decisions
- Used Lucide icons (Home, User) instead of emoji for cleaner look at small sizes
- No background on game buttons — they blend into dark #0a0a0f background
- `goHome()` preserves game state unlike `resetGame()` which clears everything
- `resumeGame()` uses smart logic to determine correct screen to return to

### Lint: Passed ✅
### Dev Server: Running ✅
