# Task ID: ui-fix-all — Agent: main

## Summary of All Changes

### 1. Fix player cards on field (FormationView.tsx)
- Replaced `getInitials()` function with `getPlayerSurname()` — now shows player's last name (surname) instead of 2-letter initials
- Changed card layout: removed old "initials + flag + position tag" layout, replaced with "position abbreviation + last name + flag" on a single row
- Position abbreviation (e.g. "ВР", "ЦЗ") shown as a small badge with background color
- Last name shown as prominent text with truncation (max-w-[32px] mobile, max-w-[40px] sm+)
- Card size changed from fixed 48x36px to min-width 52px / min-height 38px (auto-expands for longer names)
- Flag emoji size increased from text-[6px] to text-[8px] for better visibility
- Rating text size made responsive: text-[9px] on mobile, text-[10px] on sm+

### 2. Fix move player function (FormationView.tsx + page.tsx)
- **FormationView.tsx line 224**: Added `screen === 'draft'` to `canMove` condition — players can now be moved during the draft screen
- **page.tsx line 759-764**: Fixed "Переместить игрока" button — it was only calling `finishMoving()` when already moving, but had no action to START moving. Added `useGameStore.setState({ movingPlayerSlotIndex: -1 })` to start the move mode when the button is clicked while not already moving.

### 3. Translate remaining English to Russian (page.tsx)
- Changed "OVERALL" label in Squad Stats Panel to "РЕЙТИНГ" (line 793)

### 4. Game setup button (GameSetup.tsx)
- Changed button height from `h-16` to `h-12`
- Changed text size from `text-xl` to `text-base`
- Removed ⚽ emoji and its rotating animation (`motion.span` with rotate keyframes)
- Changed button text from "Крутить колесо" to "Начать драфт"
- Removed pulsing ring animation div (`animate-pulse-ring`)
- Removed `animate-button-glow` class
- Reduced shadow from `0 6px 24px` to `0 4px 16px`
- Simplified shimmer opacity from 0.25 to 0.2
- Changed hover scale from 1.015 to 1.01

### 5. Remove "Крутить состав" text (SpinWheel.tsx)
- Removed "КРУТИТЬ СОСТАВ" header text from idle state (lines 269-273)
- Removed "КРУТИТЬ СОСТАВ" header text from spinning state (lines 315-317)
- Kept the "позиций осталось" counter in idle state

### 6. Change "Крутить колесо" to "Крутить" (SpinWheel.tsx)
- Changed button text from "Крутить колесо" to "Крутить"
- Removed `Zap` icon from the spin button
- Removed `Zap` import from lucide-react

### 7. Nationality flags (nationality.ts)
- Added English nationality name mappings (e.g. 'Russian' → 🇷🇺, 'Ukrainian' → 🇺🇦, 'Brazilian' → 🇧🇷, 'Argentine' → 🇦🇷, etc.)
- Added ISO 3166-1 alpha-2 country code mappings (e.g. 'RU' → 🇷🇺, 'BR' → 🇧🇷, etc.)
- Enhanced `getNationalityFlag()` function with case-insensitive fallback lookup
- Fixed flag emoji size on field cards from `text-[6px]` to `text-[8px]` (done in FormationView.tsx fix #1)

### 8. Player list not appearing after spin (gameStore.ts)
- **Verified**: The `spin()` function correctly sets `currentSpin: data` after successful API response (line 347)
- **Verified**: The PlayerList conditionally renders based on `currentSpin` (page.tsx line 838)
- **Verified**: `currentSpin` is NOT persisted (correctly excluded from partialize), so it's cleared on page refresh — expected behavior
- **No code change needed**: The flow is correct. If `currentSpin` is null, it means either the API failed or the state was cleared on resume.

## Lint Status
- `bun run lint` passes with no errors
- Dev server running on port 3000, responding 200

## Files Modified
1. `/home/z/my-project/src/components/game/FormationView.tsx` — Player cards, canMove, flag size
2. `/home/z/my-project/src/app/page.tsx` — Move button fix, OVERALL → РЕЙТИНГ
3. `/home/z/my-project/src/components/game/GameSetup.tsx` — Start button redesign
4. `/home/z/my-project/src/components/game/SpinWheel.tsx` — Remove headers, simplify button
5. `/home/z/my-project/src/lib/nationality.ts` — English name/country code support, case-insensitive lookup
