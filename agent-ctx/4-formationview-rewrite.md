# Task 4: FormationView Rewrite for 38-0.app Compatibility

## Task ID: 4
## Agent: Main

## Summary
Completely rewrote `/home/z/my-project/src/components/game/FormationView.tsx` to match 38-0.app compact pitch behavior.

## Key Changes
1. **Compact pitch**: max-width 360px, paddingBottom 62% — fits on 320px mobile screens
2. **Small rounded rectangle markers** instead of large circles: filled=44×32px, empty=32×24px
3. **Filled positions show**: rating number (colored by tier) + 2-letter initials + flag + position tag
4. **Empty positions show**: just position label (e.g., "ВР", "ЦЗ", "ЦП")
5. **Green glow on available positions** when `selectedPlayer` is set (border + shadow + strongGreenPulse animation)
6. **Click green position → assignToSlot(slotIndex)** to place selected player
7. **Just-assigned animation**: green glow burst (scale+opacity keyframes)
8. **Move player button** ("Переставить игрока") below pitch for repositioning
9. **Moving mode**: yellow pulse ring on selected player, SVG connection lines to targets
10. **Dark green pitch** with subtle field lines (stripes, V-pattern, penalty boxes, center circle)
11. **Color coding**: GK=orange, DEF=blue, MID=green, ATT=red

## Removed from Previous Version
- Large circle markers (w-7 to w-11)
- Hover tooltips with detailed player info
- Compatibility badges (✓/⚠) on positions
- Full-width pitch layout

## Files Modified
- `/home/z/my-project/src/components/game/FormationView.tsx` — complete rewrite
- `/home/z/my-project/worklog.md` — added Task 4 entry

## Lint Status
✅ Passes cleanly with no errors
