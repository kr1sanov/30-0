# Task R6-3: ManagerChoice Slot-Machine Redesign Agent

## Summary
Completely redesigned `ManagerChoice.tsx` (122 → ~590 lines) to replace the basic spinning-emoji animation with a real **3-reel slot machine** that scrolls manager initials, rating, and nationality flag — stopping in sequence (left → middle → right at 0.8s / 1.3s / 1.8s) and revealing an enhanced manager card with tier-based glow, JACKPOT burst for 87+ rated managers, and a polished pool preview.

A tiny supporting change was made to `gameStore.ts`: `spinManager` now accepts an optional `manager` parameter and sets `currentManager` synchronously at the start (instead of after the 1.5s delay). This lets the component pick the target manager locally so the reels know where to land, while the store still gates `isSpinningManager` for 1.5s. The change is backward-compatible — existing callers (none outside `ManagerChoice`) still work.

## Files Modified
1. `src/store/gameStore.ts` — `spinManager` signature: `() => Promise<void>` → `(manager?: Manager) => Promise<void>`; body picks manager upfront and sets `currentManager` immediately, then waits 1.5s, then clears `isSpinningManager`.
2. `src/components/game/ManagerChoice.tsx` — Complete rewrite (122 → ~590 lines).

## Requirements Coverage

### 1. Slot-Machine Style Manager Spinning ✅
- **Three Reels**: 
  - Reel 1 — manager initial (first letter of last name, Cyrillic-safe)
  - Reel 2 — rating number (e.g. `88`)
  - Reel 3 — nationality flag emoji (🇷🇺 🇮🇹 🇷🇴 🇪🇸 🇷🇸 🇩🇪 🇹🇲 🇳🇱)
- **Independent speeds / staggered stops**: each reel has a different item count (22 / 30 / 40) and a different animation duration (0.8s / 1.3s / 1.8s). All three start at the same instant; they decelerate and stop left → middle → right.
- **Deceleration easing**: cubic-bezier `[0.12, 0.78, 0.22, 1]` (fast start, long slow tail) — feels like a real slot machine landing.
- **CSS transforms**: each reel uses `motion.div` animating `y` from `0` to `-(targetIndex - 1) * ITEM_HEIGHT` (`ITEM_HEIGHT = 56px`).
- **Window**: 3 items visible at a time (prev / current / next). Center band is highlighted with accent-colored borders + tint, plus top/bottom gradient fades for depth.
- **Stop flash**: when each reel's `onAnimationComplete` fires, a radial accent-color overlay flashes and fades (~0.55s) and the reel's box-shadow intensifies briefly.
- **JACKPOT effect**: when the landed manager's `rating >= 87`, the post-spin card shows a gold "JACKPOT" badge with Sparkles icons, an infinite expanding radial gold burst, and a strong golden box-shadow halo. (Gold-tier managers: Газзаев 88, Романцев 87, Спаллетти 88, Луческу 89, Адвокат 87, Хиддинк 89, Капелло 88, Манчини 87.)

### 2. Enhanced Manager Card ✅
- **Avatar**: 80px circle with 👨‍💼, surrounded by a continuously rotating conic-gradient ring tinted by the manager's tier color (gold/silver/bronze).
- **Name**: large bold (`text-xl font-black`).
- **Nationality row**: large flag emoji + country name + era badge (tier-colored pill).
- **Rating**: huge number (`text-5xl font-black`) in tier color with multi-layer text-shadow glow, plus a tier label (ЛЕГЕНДА / МАСТЕР / ПРОФИ).
- **+2 bonus**: spring-popped green gradient pill with filled Zap icon, shown next to the rating.
- **Special ability**: green "buff" pill with Sparkles icon, spring-popped in with a slight delay.
- **Background / border tiers**:
  - `rating >= 87` (gold): strong golden outer glow (`0 0 40px … 0 0 90px …`) + JACKPOT burst
  - `rating >= 83` (silver): green-tinted glow
  - else (bronze): subtle gray shadow
- **Spring entrance**: card mounts with `scale: 0.85, y: 18` and springs into place.

### 3. Action Buttons ✅
- **"Играть с [FirstName] (+2)"** — large primary green button (`h-14`), filled Zap icon, scale-on-hover/active.
- **"🔄 Крутить ещё раз"** — secondary outline button with `RotateCw` lucide icon, green-tinted border/text.
- **"Без тренера (классика)"** — subtle text-only link (`text-xs text-[#64748b]`).
- All three existing handlers (`handleSpinManager`, `handleWithManager`, `handleWithoutManager`) preserved with identical external behavior.

### 4. Manager Pool Preview ✅
- Before the first spin, shows "**22 тренеров доступны**" header.
- Row of 5 overlapping avatar circles (`-space-x-2`) using each manager's last-name initial, colored by tier (gold/silver/bronze gradient backgrounds).
- A trailing `+17` chip indicates the remaining pool.
- Each avatar springs in with a stagger via Framer Motion.

## Implementation Notes
- **State flow**: 
  - `handleSpinManager` picks a local `target` from `MANAGERS`, sets `reelTarget` + `showSpinAnimation=true` + bumps `spinKey`. 
  - It then calls `spinManager(target)` — the store sets `currentManager = target` synchronously, holds `isSpinningManager = true` for 1.5s, then clears it.
  - After the promise resolves, a 450ms tail delay lets the slowest reel (1.8s) fully stop before swapping back to the card.
- **Reel remounting**: each `<Reel>` is given `key={`r{n}-${spinKey}`}` so a fresh component instance is created per spin. This avoids the lint error `react-hooks/set-state-in-effect` (calling `setState` synchronously inside `useEffect`) and guarantees `stopped` state starts at `false` for every spin.
- **Target placement**: `buildReelItems(target, mode, length)` places the target's value at index `length - 2` (second-to-last), so a "next" item remains visible below the centered target. The reels land on `targetIndex = length - 2`.
- **Tier color** is computed from the target manager and passed to all reels as the `accent` — so the center band, stop-flash, and border glow all match the eventual reveal (gold/silver/bronze).
- **Cyrillic-safe initials**: `getInitial` splits on whitespace and takes the first character of the last part (`"Валерий Газзаев"` → `"Г"`).
- **Flag map**: covers all 8 nationalities present in the `MANAGERS` array (`Россия`, `Италия`, `Румыния`, `Испания`, `Сербия`, `Германия`, `Туркменистан`, `Нидерланды`); unknown nationalities fall back to 🏳️.
- **Imports**: `lucide-react` (`RotateCw`, `Sparkles`, `Zap`, `Dices`), `framer-motion` (`motion`, `AnimatePresence`), `useState`/`useMemo` from React.
- **Kept store fields**: `simulate`, `spinManager`, `currentManager`, `isSpinningManager` all still come from `useGameStore`. `spinManager`'s signature is additive (optional param) — no existing caller breaks.

## Lint / Build
- `bun run lint` → ✅ passes with zero errors/warnings.
- Dev server compiles cleanly (`✓ Compiled in 171ms` latest).

## What other agents should know
- The `spinManager` store action now sets `currentManager` **immediately** at the start of the spin (rather than after the 1.5s delay). If any future code reads `currentManager` while `isSpinningManager === true`, it will see the upcoming manager instead of `null`/the previous one. The only current consumer is `ManagerChoice.tsx` itself, which gates the card on `!isSpinningManager && !showSpinAnimation`.
- If you want to drive the reels from the store itself (instead of having `ManagerChoice` pick locally), you can `await spinManager(myTarget)` and read `currentManager` right away.
