# Task 2 — Home Screen & Header Rebuild (38-0.app Style)

## Agent: Senior Full Stack Engineer
## Date: 2026-07-04

## Summary
Rebuilt the home screen and header to match the 38-0.app style with a complete color scheme overhaul from green-tinted dark to pure dark theme.

## Key Changes

### Color Scheme (Global)
- Background: `#0A0A0A` (pure almost-black)
- Card backgrounds: `#141414`
- Card hover/border: `#1E1E1E`
- Accent green: `#00C896` (teal)
- Primary text: `#FFFFFF`
- Secondary text: `#9CA3AF`

### Header
- Minimal dark header on home screen with navigation buttons only
- No "30-0 RPL" or branding text
- Game screens: subtle overlay buttons (Home left, Profile right)
- Setup/profile: full navigation bar

### HomePage
- Hero: badge "НЕОФИЦИАЛЬНАЯ ФАНТАЗИ-ИГРА", huge 30-0 title, full-width CTA
- Game Modes: only Классика active, others have СКОРО badge
- How to Play: 4-step numbered layout
- Stats: 16 клубов / 5000+ игроков / 1992-2026
- Challenges: simplified clean cards with progress bars
- FAQ: accordion with new colors
- No leaderboard on home screen

### Footer
- Only Home/Play/Profile tabs (no leaderboard)
- Colors updated to new scheme

## Files Modified
- `src/app/globals.css` — Color variables + all CSS color refs
- `src/app/layout.tsx` — Body colors
- `src/app/page.tsx` — HomePage rebuild + color updates
- `src/components/layout/Header.tsx` — Complete rewrite
- `src/components/layout/Footer.tsx` — Color updates
- `src/hooks/use-telegram.ts` — Color updates
- `src/lib/positions.ts` — Color updates
- 14 game component files — Bulk color replacement

## Verification
- ESLint: ✅ No errors
- Dev server: ✅ Compiles successfully
- HTTP: ✅ 200 response
