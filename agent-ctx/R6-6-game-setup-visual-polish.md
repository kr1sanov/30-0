# Task R6-6: GameSetup Visual Polish & Quick Pick Agent

## Summary
Enhanced the `GameSetup.tsx` component with comprehensive visual polish: formation type badges, animated selected states, an enhanced mini pitch with field gradient and formation name overlay, difficulty cards with icons/flavor text, a new "⚡ Быстрый старт" (Quick Start) feature that randomizes settings and starts a run, a compact settings summary bar, and a more prominent start button with shimmer + pulsing glow.

## File Modified
- `src/components/game/GameSetup.tsx` (339 → ~700 lines, complete rewrite of UI layer while preserving all existing functionality)

## Requirements Coverage

### 1. Enhanced Formation Cards ✅
- **Formation Stats Badge**: Each card shows a small badge in the top-left indicating its type:
  - Attack (4-3-3, 3-4-3, 4-2-3-1) → ⚔️ (red)
  - Defensive (5-3-2, 5-4-1) → 🛡️ (blue)
  - Balanced (4-4-2, 4-2-2-2, 3-5-2, 4-4-1-1) → ⚖️ (green)
  - Midfield-dominant (4-5-1, 4-1-4-1, 3-4-1-2) → 🎯 (purple)
- **Selected State Enhancement**:
  - Green checkmark (✓) circle springs in at top-right corner (Framer Motion spring animation)
  - Pulsing glow ring (animated boxShadow, 1.8s loop)
  - "✓ Выбрано" label briefly appears at card bottom for 1.4s after selection (AnimatePresence)
- **Better Mini Pitch**:
  - Vertical gradient field (`#1f6e3a → #175228`) replacing flat color
  - Stripes overlay at 70% opacity for depth
  - Radial vignette around edges
  - Position dots use category colors (GK=orange, DEF=blue, MID=green, ATT=red) with white border + glow
  - Penalty box hint at top
  - Formation name overlaid at bottom on a black-to-transparent gradient strip
  - Position color legend shown below grid (desktop inline, mobile centered)

### 2. Difficulty Card Enhancement ✅
- **Icons**: 🌱 Easy, ⚖️ Normal, 🔥 Hard (large, with pulse animation when selected)
- **Flavor text**:
  - Easy: "Идеально для новичков"
  - Normal: "Баланс риска и награды"
  - Hard: "Только для экспертов"
- **Selected State**: Stronger visual treatment — tinted gradient background, colored border, inner+outer glow matching the difficulty color (green/amber/red), animated bottom strip via Framer Motion `layoutId`
- Kept reroll count and ratings visibility info

### 3. Quick Pick Feature ✅
- **Button**: "⚡ Быстрый старт" at the top of the setup screen
  - Gradient background: yellow → orange (`#facc15 → #f59e0b → #f97316`)
  - Lightning bolt ⚡ icon with continuous wobble animation
  - Animated shimmer sweep across button (2.2s loop)
  - Pulsing attention ring (radial pulse from yellow)
  - Hover scale (1.01) and tap scale (0.97)
  - Tooltip: "Случайные настройки для быстрой игры" (via shadcn Tooltip)
- **Behavior** (when clicked):
  - Picks random formation from all 12 available
  - Picks weighted random difficulty: 50% normal / 30% easy / 20% hard
  - Picks random era from the 4 options
  - Keeps existing draft mode and rating mode (default or user's current choice)
  - Calls `setConfig` with all three randomized values
  - Shows confirmation overlay for 1.6s, then calls `startRun()`
- **Confirmation**: Full-screen overlay with spring-animated card showing the random picks (formation, difficulty with color accent, era) — each row staggers in via Framer Motion
- **Guard**: `isQuickPicking` flag prevents double-clicks while in progress

### 4. Settings Summary Bar ✅
- Compact horizontal bar (horizontally scrollable on mobile) above the start button
- Shows: formation (⚽), difficulty (with color dot + colored value), draft mode (🎯), rating mode (⭐), era (📅)
- Each item has uppercase tiny label + bold value
- Vertical dividers between items (green-tinted)
- Animated fade-in on mount

### 5. Enhanced Start Button ✅
- Larger size: `h-16` (was `h-18` typo in original — fixed to proper `h-16`)
- Gradient background: `#22c55e → #16a34a → #15803d` (3-stop diagonal)
- Uses existing `animate-button-glow` CSS class for pulsing green glow
- Shimmer sweep animation (2.8s loop, lighter than quick pick)
- Animated ⚽ icon with continuous gentle rotation
- Hover scale (1.015) via motion.div wrapper, tap scale (0.98)
- Drop shadow on text for readability
- Box shadow: outer glow + inner white highlight

## Implementation Notes
- `'use client'` directive preserved
- All existing functionality preserved: `config`, `setConfig`, `startRun` from gameStore
- Framer Motion used for all animations (`motion`, `AnimatePresence`)
- Existing CSS utility classes used where applicable (`animate-fade-in-up`, `animate-button-glow`)
- All inline styles for gradient backgrounds (no new CSS classes needed)
- shadcn `Tooltip` component used (auto-wrapped in `TooltipProvider`)
- `useCallback` for Quick Pick handler to keep referential stability
- Local component state: `justSelectedFormation` (for brief "Выбрано" label), `quickPickPreview` (for overlay), `isQuickPicking` (button guard)
- No SSR issues — all interactive logic gated behind event handlers

## Helper Sub-Components Created (within same file)
- `MiniPitch` — enhanced formation preview with gradient field
- `LegendDot` — position color legend item
- `PreviewRow` — row in Quick Pick confirmation overlay
- `SummaryItem` — single cell in settings summary bar
- `Divider` — vertical separator for summary bar

## Data Constants Added (within same file)
- `FORMATION_TYPE` — maps formation id → 'attack' | 'defensive' | 'balanced' | 'midfield'
- `FORMATION_TYPE_BADGE` — icon/label/color per formation type
- `DIFFICULTY_META` — icon/flavor/color/glow per difficulty

## Lint Status
✅ Passes `bun run lint` with 0 errors

## Dev Server Status
✅ Compiles successfully (verified in dev.log — multiple `✓ Compiled in ...ms` with no errors, POST /api/runs returning 201)
