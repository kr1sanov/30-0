# Task 2-a: Apply all UI changes per user requirements

## Summary
All 7 requested UI changes have been applied successfully. Lint passes cleanly.

## Changes Made

### Change 1: Banner text
- File: `src/app/page.tsx` (line 299)
- "НЕОФИЦИАЛЬНАЯ ФАНТАЗИ-ИГРА" → "НЕОФИЦИАЛЬНАЯ ДРАФТ-ИГРА ДЛЯ ФАНАТОВ"

### Change 2: Analytics stats
- File: `src/app/page.tsx` (lines 472-474)
- 16 → 15 (клубов), 5000+ → 4000+ (игроков), 1992-2026 → 2000-2026 (сезонов)

### Change 3: Sound removal
- File: `src/components/layout/Header.tsx` — completely rewritten
  - Removed useSound hook import
  - Removed Volume2/VolumeX icon imports
  - Removed sound toggle button from all 3 header modes
  - Removed soundOn state and handleToggleSound function
- Verified no other files import useSound after changes

### Change 4: Header buttons larger
- File: `src/components/layout/Header.tsx`
- Icon sizes: w-4 h-4 → w-6 h-6
- Button padding: p-2 → p-2.5
- Header height: h-12 → h-14
- Game screen overlay buttons: w-9 h-9 → w-11 h-11, icons w-[18px] → w-6 h-6
- Overlay position: top-3 → top-4

### Change 5: Remove "Современная" word
- `src/lib/types.ts`: 'Современная (2016+)' → '2016+'
- `src/lib/positions.ts`: 'Современная с опорной' → 'С опорной'

### Change 6: Remove "Дополнительные настройки"
- File: `src/components/game/GameSetup.tsx`
- Removed entire collapsible section with Settings/ChevronDown/ChevronUp icons and toggle switches
- Removed unused imports: useState, useCallback, Settings, ChevronDown, ChevronUp
- Removed showAdvanced state variable

### Change 7: Restrict to 2000-2026
- `src/lib/types.ts`: ERA_CONFIG.all: 'Все времена' → 'Все', minYear 1992 → 2000
- `src/app/api/runs/[runId]/spin/route.ts`: fallback minYear 1992 → 2000

## Verification
- `bun run lint` passes with no errors
- No remaining references to useSound in any component
- No remaining Volume2/VolumeX icon imports
