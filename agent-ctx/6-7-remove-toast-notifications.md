# Task 6-7: Remove Toast/Push Notifications and Banners from Draft Process

## Summary
Removed all toast notifications and success/instruction banners from the game draft process as requested by the user who found them annoying and distracting.

## Changes Made

### 1. `/home/z/my-project/src/components/game/PlayerList.tsx`
- Removed `import { toast } from 'sonner'`
- Removed `useEffect` import (no longer needed)
- Removed `lastDraftError` from `useGameStore` destructuring
- Removed the `useEffect` that called `toast.warning` for `lastDraftError`

### 2. `/home/z/my-project/src/components/game/FormationView.tsx`
- Removed `import { toast } from 'sonner'`
- Removed `toast.success(...)` call when assigning a player (line ~275)
- Removed `toast.error(...)` call for incompatible positions during move (line ~260)
- Removed `toast.error('Несовместимая позиция')` call for incompatible positions during assignment (line ~279)
- **Kept the shake animation** (`triggerShake`) as visual feedback — only the toast text was removed

### 3. `/home/z/my-project/src/app/page.tsx`
- Removed `import { toast } from 'sonner'`
- Removed `toast('Скоро!')` call on "coming soon" game mode buttons (replaced with comment)
- Removed `lastPlacedInfo` state variable
- Removed the `useEffect` that set `lastPlacedInfo` when `justAssignedSlotIndex` changed
- Removed "Selected Player Instruction Banner" (AnimatePresence block showing "👉 Выберите позицию для [player] в списке ниже")
- Removed "Player Placed Success Banner" (AnimatePresence block showing "✅ Деспотович → НП")

### 4. `/home/z/my-project/src/store/gameStore.ts`
- Confirmed no toast imports — no changes needed

### 5. `/home/z/my-project/src/app/layout.tsx`
- Removed `import { Toaster as SonnerToaster } from "sonner"`
- Removed the entire `<SonnerToaster ... />` component from the layout
- Kept the shadcn `<Toaster />` component (different system, not related to sonner)

## Verification
- Lint passes with zero errors
- Dev server compiles successfully
- No remaining `sonner` imports in any of the modified files
