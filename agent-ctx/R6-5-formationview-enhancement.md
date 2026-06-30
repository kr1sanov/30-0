# Task ID: R6-5 — FormationView Enhancement Agent

**Status**: All enhancements implemented. Lint passes with 0 errors. Dev server compiles cleanly.

## Summary

Enhanced `src/components/game/FormationView.tsx` with richer visual polish and additional features, expanding it from 432 to ~520 lines while keeping ALL existing functionality (handleSlotClick, canFillSlot, FORMATION_LAYOUTS, etc.) intact.

## What was done

### 1. Enhanced Player Circles on Pitch

**a) Position Color Ring (Task 1a)**
- Added `CATEGORY_RING_COLOR` map: gk=orange, def=blue, mid=green, att=red
- Filled slots now render with an outer 3px ring via `boxShadow: 0 0 0 3px ${ringColor}`
- Ring sits outside the existing `border-2` border (rendered after the border in the box model)
- Combined with a subtle drop shadow `0 4px 10px rgba(0,0,0,0.45)` for depth (Task 4b)

**b) Compatibility Indicator (Task 1b)**
- Computes `compatKind` ('full' | 'partial' | null) per filled slot using `canFillSlot(playerPosition, playerOtherPositions, slot.position)`
- Full (penalty=1): green ✓ badge at top-right
- Partial (penalty=0.8): yellow ⚠ badge at top-right AND rating displayed at 0.78 opacity (dimmed)
- Effective rating for partial = `Math.round(baseRating * 0.8)` so the user sees the actual reduced number
- Badges are 16px (sm: 20px), positioned with `-top-1.5 -right-1.5`, with dark border for contrast

**c) Rating Color Coding (Task 1c)**
- Replaced `getRatingColor` to use new tier scheme:
  - 78+ → Gold `#fbbf24`
  - 73-77 → Green `#22c55e`
  - 68-72 → Orange `#f97316`
  - <68 → Red `#ef4444`
- Applied to rating badge inside circle AND to the avg-rating number in the header

**d) Hover Info Tooltip (Task 1d)**
- Added `hoveredSlot` state, set on `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur`
- Tooltip renders via `AnimatePresence` with smooth fade+slide
- Direction-aware: tooltip appears BELOW slot if slot is in top half (`pos.row < 50`), ABOVE otherwise — prevents clipping near pitch edges
- Tooltip contents:
  - Full player name (truncated)
  - All positions they can play (main + others) — current slot position highlighted green
  - Rating line: base rating + arrow to effective rating + "(-20%)" if partial penalty applies; otherwise just the base rating
- Arrow pointer on the tooltip matches direction

### 2. Enhanced Empty Slot Visuals

**a) Pulsing Glow (Task 2a)**
- Kept existing `animate-strong-pulse-green` class on compatible empty slots (no regression)
- The class already produces a stronger pulsing animation via `@keyframes strongGreenPulse`

**b) Position Number Badge (Task 2b)**
- Added a small circular number badge (1-11) at top-left of every slot
- Shows the draft order (slot index + 1)
- Filled slots: brighter badge (white text, white border)
- Empty slots: dimmer badge (lower opacity)
- 16px on mobile, 20px on sm+

**c) Connection Lines (Task 2c)**
- When `movingPlayerSlotIndex !== null`, an SVG overlay renders dashed yellow lines from the source slot to all OTHER filled slots (valid swap targets)
- Used `<motion.line>` with `pathLength` animation for a draw-in effect (staggered by 0.03s)
- `viewBox="0 0 100 130"` with `preserveAspectRatio="none"` since the pitch uses `paddingBottom: 130%` aspect ratio (row percentages map to viewBox Y by multiplying by 1.3)
- Valid swap targets are also visually highlighted with a yellow ring (`ring-2 ring-yellow-400/70`)

### 3. Formation Info Header

Added a compact gradient header bar above the pitch (`bg-gradient-to-r from-[#1a1a2e] to-[#16162a]`) containing:

- **Formation name with icon**: `📐 {config.formation}` (e.g., "📐 4-3-3")
- **Player count by category** (color-coded): "1 ВР · 4 ЗАЩ · 3 ПОЛ · 3 НАП" — uses gk/def/mid/att colors
- **Average rating of filled players** (Task 3c): computed with penalty applied; tier-colored
- **Chemistry indicator** (Task 3d): small color-coded dot (color from `getChemistryColor`) + percentage. Chemistry = % of filled players fully compatible with their slot
  - 100% → bright green
  - 80-99% → yellow-green
  - 60-79% → yellow
  - 40-59% → orange
  - <40% → red
- **Rerolls badge** moved into this bar (preserved from old header)
- Replaces the older simpler "Формация: X / Перебросы: X" header

### 4. Pitch Enhancements

**a) Better Grass Texture (Task 4a)**
- Added a new overlay with diagonal mowing pattern at 60° angle
- `repeating-linear-gradient(60deg, transparent 36px, rgba(255,255,255,0.025) 36-72px)`
- Sits on top of existing vertical grass lines for layered depth

**b) Shadow Under Players (Task 4b)**
- Each filled player circle now has `0 4px 10px rgba(0,0,0,0.45)` drop shadow
- Combined with the 3px position ring in the same `boxShadow` declaration

**c) Center Circle Logo (Task 4c)**
- Center circle now uses `flex items-center justify-center` to host a ⚽ emoji
- Emoji gently pulses with Framer Motion (`scale: [1, 1.08, 1]`, `opacity: [0.55, 0.75, 0.55]`) over 3s
- Subtle and unobtrusive so it doesn't compete with player circles

**d) Penalty Box Detail (Task 4d)**
- Added small white penalty spot dots (6px, `bg-white/40`) in each penalty box
- Positioned at `calc(12px + 42px)` from top/bottom — roughly where a real penalty spot sits
- Both top and bottom penalty boxes get a spot

## Implementation Notes

- Kept `'use client'` directive
- Kept ALL existing functionality (`handleSlotClick`, `canFillSlot`, `movePlayer`, etc.) — unchanged behavior
- Kept the `FORMATION_LAYOUTS` object 100% as-is (12 formations, identical coordinates)
- Used Framer Motion for new animations: `AnimatePresence` for tooltip, `motion.line` for connection lines, `motion.span` for chemistry dot and center circle logo
- Used existing CSS utility classes from globals.css: `pitch-elevated`, `pitch-stripes`, `pitch-grass-lines`, `pitch-vignette`, `player-inner-glow`, `animate-subtle-pulse`, `animate-strong-pulse-green`, `animate-shake`
- Mobile-first: all new elements use responsive `sm:` breakpoints; touch targets remain ≥44px (the 14-16 (56-64px) circle is preserved)
- The tooltip direction logic (`pos.row < 50`) prevents tooltips from being clipped by the pitch's `overflow-hidden`

## Files Modified

1. `/home/z/my-project/src/components/game/FormationView.tsx` — Complete enhancement (432 → ~520 lines)

## Verification

- `bun run lint` → 0 errors, 0 warnings
- Dev server compiles cleanly (`✓ Compiled in 220ms`)
- No TypeScript errors
