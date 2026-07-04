# Task 5 — Add Position Selection Panel

## Agent: full-stack-developer

## Summary
Added a Position Selection Panel directly in the PlayerList component so users can click compatible positions without scrolling up to the field.

## Changes Made

### 1. `/home/z/my-project/src/store/gameStore.ts`
- Added `deselectPlayer()` action to the GameState interface and implementation
- Sets `selectedPlayer` to null, enabling the cancel button in PlayerList

### 2. `/home/z/my-project/src/components/game/PlayerList.tsx`
- Added `compatibleSlots` useMemo that computes empty slots where the selected player can fill
- Added Position Selection Panel with AnimatePresence + Framer Motion:
  - Shows when `selectedPlayer` is set and `compatibleSlots.length > 1`
  - Position buttons color-coded by category using POSITION_COLOR
  - Green border/glow on buttons, min-height 44px for touch
  - Partial compatibility (0.8×) shown with small badge
  - Clicking a position button calls `assignToSlot(slotIndex)`
- Auto-assign when only ONE compatible position (300ms delay)
- Cancel button ("Отменить выбор") calls `deselectPlayer()`
- Clicking selected player again now deselects it (was no-op before)
- Removed old instruction banner that was inside PlayerList (replaced by panel)

### 3. `/home/z/my-project/src/app/page.tsx`
- Updated instruction banner text: "Выберите позицию для ... ниже или на поле"

## Lint: passes cleanly
