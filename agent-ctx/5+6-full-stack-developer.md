# Task 5+6 — Improve game setup and draft screens to match 38-0.app style

## Agent: full-stack-developer

## Summary
Improved GameSetup, SpinWheel, PlayerList, SquadStats, and FormationView components to match the 38-0.app visual style with dark theme and green accent.

## Files Changed
1. **src/lib/types.ts** — Added `showRatings`, `enableManagers`, `januaryTransfer` to GameConfig
2. **src/components/game/GameSetup.tsx** — Complete rework: dark theme, sections, pills, toggles
3. **src/components/game/SpinWheel.tsx** — Smoother animation, header with positions count, instruction text
4. **src/components/game/PlayerList.tsx** — Rating-tier coloring, effectiveShowRatings, improved inline picker
5. **src/components/game/SquadStats.tsx** — Russian labels, category emojis (⚡🌀🛡️🥅), proper colors
6. **src/components/game/FormationView.tsx** — Circle-based layout, player initials, dashed empty slots, color legend
7. **src/components/game/DraftProgressTracker.tsx** — Use effectiveShowRatings

## Key Design Decisions
- Accent color: #00C896 (matching 38-0.app)
- Background: #0A0A0A (page), #141414 (cards)
- Rating tiers: ≥85 green, 75-84 blue, <75 gray
- Slot colors: GK yellow (#fbbf24), DEF blue (#3b82f6), MID green (#22c55e), ATT orange (#f97316)
- showRatings defaults to difficulty setting but can be overridden independently
- Spin deceleration: 12 steps, progressive slowdown from 80ms to ~700ms total
