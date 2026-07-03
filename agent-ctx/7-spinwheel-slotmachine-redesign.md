# Task 7: SpinWheel Slot Machine Redesign

## Summary
Completely redesigned the SpinWheel component from a rotating SVG wheel to a slot-machine style spinner with two vertical reels.

## Changes Made

### `/home/z/my-project/src/components/game/SpinWheel.tsx`
- **Removed**: Entire SVG wheel with segments, pointer, decorative lights, center hub
- **Removed**: "КРУТИТЬ СОСТАВ" header text
- **Removed**: "Крутить колесо" button text → replaced with "Крутить"
- **Added**: Two vertical reels side by side:
  - **Year reel** (left): Shows years 2000-2026 cycling vertically, labeled "Сезон"
  - **Club reel** (right): Shows 14 RPL clubs cycling vertically, labeled "Клуб"
- **Added**: `startReelDecel()` function for deceleration animation using setTimeout chains
- **Added**: Fast spinning phase (50ms interval) followed by deceleration with progressive delays
- **Added**: Year reel stops first (~1.5s), club reel stops second (~2.5s) with staggered timing
- **Added**: Blur effect during spinning, green glow + bounce animation on stop
- **Added**: Gradient fade overlays at top/bottom of each reel
- **Added**: Center highlight band with green border for selected item
- **Added**: "·" separator between the two reels
- **Preserved**: spin()/reroll() calls to game store
- **Preserved**: currentSpin result handling with club emoji + season label
- **Preserved**: rerollsLeft display and reroll button
- **Preserved**: haptic feedback (light on year stop, heavy on club stop)
- **Preserved**: Particle burst effect on result reveal
- **Preserved**: "Осталось заполнить: X позиций" info text

### `/home/z/my-project/src/app/globals.css`
- **Added**: `@keyframes reelBounce` animation (translateY bounce effect)
- **Added**: `.animate-reel-bounce` class

## Animation Flow
1. User clicks "Крутить" → haptic('medium'), both reels start fast spinning (50ms interval)
2. API returns spin result → fast interval cleared, 200ms pause
3. Year reel deceleration starts: fast steps (40ms) + 9 progressive delay steps (~1.4s total)
4. 500ms later: Club reel deceleration starts: fast steps (40ms) + 12 progressive delay steps (~1.9s total)
5. Year reel stops → haptic('light'), green glow + bounce animation
6. Club reel stops → haptic('heavy'), green glow + bounce animation
7. 200ms after club stops → result reveal with particle burst

## Clubs List (in order)
Зенит, Спартак, ЦСКА, Локомотив, Краснодар, Динамо, Рубин, Ахмат, Ростов, Урал, Крылья Советов, Торпедо, Факел, Оренбург

## Lint Status
✅ All lint errors resolved (fixed synchronous setState in effect by deferring to setTimeout)
