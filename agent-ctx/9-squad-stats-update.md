# Task 9 — SquadStats Component Update

## Summary
Updated `/home/z/my-project/src/components/game/SquadStats.tsx` with two changes:

### 1. Rounded overall rating to whole number
- **Before**: `Math.round((totalRating / filledCount) * 10) / 10` (1 decimal, e.g. 73.5)
- **After**: `Math.round(totalRating / filledCount)` (whole number, e.g. 74)

### 2. Merged GK data into Defense line
- **Categories array**: Changed from `['gk', 'def', 'mid', 'att']` to `['def', 'mid', 'att']`
- **categoryRatings**: Removed `gk` entry, only `def`, `mid`, `att`
- **Calculation**: Added `displayCat` mapping — GK positions are mapped to `def` for display purposes
- **CATEGORY_LABELS**: Removed `gk: 'Вратарь'`, now only 3 entries (def/mid/att)
- **CATEGORY_COLORS**: Removed `gk: '#f97316'`, now only 3 entries
- **CATEGORY_ICONS**: Removed `gk: '🧤'`, now only 3 entries (def still uses 🛡️)
- The Защита (Defense) line now includes both GK and DEF player ratings in its average

## Result
- Display now shows 3 lines: Защита 🛡️, Полузащита ⚽, Атака 🎯
- Overall rating displays as whole number
- No compilation errors
