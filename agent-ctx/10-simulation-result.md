# Task 10 — SimulationResult Component Update

## Summary

Updated `/home/z/my-project/src/components/game/SimulationResult.tsx` with a two-phase animation flow:

### Changes Made

1. **Match-by-match animation on load** — The component now auto-starts a sequential match reveal when the simulation result screen loads. Matches appear one by one with ~300ms delay between each. Each match card animates in with a fade + slide-from-bottom effect using Framer Motion.

2. **Animated match cards** — Each revealed match shows:
   - Matchday number (Тур X)
   - Home/Away indicator (🏠/✈️)
   - Opponent name with club color dot
   - Score (e.g., 2:1) with green/red coloring for goals
   - Result badge (В/Н/П) with color-coded background
   - Left border colored by result (green=win, orange=draw, red=loss)
   - Pulse animation on the latest revealed match
   - Placeholder cards for upcoming matches shown as dimmed

3. **Skip button** — "⏭ Пропустить" button visible during animation. When pressed:
   - Stops the sequential animation timer
   - Sets currentMatchIndex to total, revealing all matches instantly
   - Transitions to the complete phase immediately

4. **Sticky analytics bar** — Fixed to the bottom of the screen during animation phase:
   - Победы (Wins) — green (#22c55e)
   - Ничьи (Draws) — orange (#f97316)
   - Проигрыши (Losses) — red (#ef4444)
   - Очки (Points) — bold white
   - Progress bar showing animation completion percentage
   - Backdrop blur + semi-transparent background

5. **Two-phase rendering** — Component uses `phase` state:
   - `'animating'`: Shows match cards appearing one by one with skip button and analytics bar
   - `'complete'`: Shows full season result (position badge, stats, form bar, sparkline, match list, table, achievements, action buttons)
   - Confetti animation preserved for championship wins in complete phase

6. **Replay button** — "🎬 Повтор анимации" button in the complete phase allows re-watching the match-by-match reveal

7. **Hooks compliance** — All React hooks (including `useAnimatedValue`) are called before any conditional returns, fixing the rules-of-hooks lint errors

### Technical Details
- Phase state: `useState<'animating' | 'complete'>('animating')`
- Match reveal: `useEffect` with recursive `setTimeout` at 300ms intervals
- Running analytics: `useMemo` computed from `currentMatchIndex` and matches array
- Analytics bar: Fixed positioned div with `z-40`, backdrop blur, and animated progress bar
- Match cards: Framer Motion `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`
- Lint: Passes cleanly with no errors
