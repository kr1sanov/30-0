# R5-3: Homepage Enhancement & Page Transitions Agent

## Task Summary
Enhanced the homepage hero section, page transitions, challenge cards, and footer with rich animations and visual improvements.

## Files Modified

### 1. `/home/z/my-project/src/app/globals.css`
Added new CSS animations and utility classes:
- **Noise texture overlay** (`.noise-overlay`) - SVG-based subtle noise for hero container
- **Scanline effect** (`.scanlines`) - Repeating horizontal lines for gaming aesthetic
- **Pulsing underline** (`.animate-pulse-underline`) - For subtitle decoration
- **Organic float animations** (`.animate-float-organic-1/2/3`) - 3 different organic movement patterns with rotation for particles
- **Number flash/glow** (`.animate-number-flash`) - Flash effect when counter reaches final value
- **Color-shifting gradient border** (`.animate-border-gradient-shift`) - Animated border with shifting green hues
- **Shimmer loading** (`.shimmer-loading`) - For simulation screen transition
- **Challenge card gradients** (`.challenge-gradient-fire/shield/bolt/target`) - Type-based gradient overlays
- **Challenge completed overlay** (`.challenge-completed`) - Green checkmark badge
- **Challenge progress bar** (`.challenge-progress-bar/fill`) - Visual progress indicator
- **Footer gradient border** (`.footer-gradient-border`) - Subtle green gradient line at top
- **Tab active glow** (`.tab-active-glow`)
- **Subtitle gradient text** (`.text-gradient-subtitle`) - Green to lighter green gradient

### 2. `/home/z/my-project/src/app/page.tsx`
Major enhancements:

**Animated Score Counter:**
- `AnimatedCounter` component counts from 0 to 30 over ~1 second with easeOutExpo easing
- "0" appears with dramatic spring animation after 1.3s delay
- Flash/glow effect when numbers reach final value (`.animate-number-flash`)

**Better Visual Hierarchy:**
- Subtitle "Футбольный драфт РПЛ" uses `.text-gradient-subtitle` (green to lighter green)
- Pulsing underline below subtitle (`.animate-pulse-underline`)
- Description text fades in with 1.4s delay after title

**Improved Floating Particles:**
- 10 particles: ⚽, 🏆, ⭐, 💚 with varied sizes
- 3 organic animation patterns with rotation and multi-point movement
- Larger/prominent particles (🏆 at text-xl)
- Different animation delays for organic feel

**Hero Container Enhancement:**
- Noise texture overlay via `.noise-overlay`
- Scanline effect via `.scanlines`
- Color-shifting gradient border via `.animate-border-gradient-shift`

**Stats Counter Animation:**
- `StatsCounter` component uses Framer Motion's `useInView`
- Numbers count up when scrolled into view
- Uses easeOutExpo easing over 1.2s

**Enhanced Challenge Cards:**
- Gradient overlay based on challenge type (fire=red, shield=blue, bolt=yellow, target=green)
- Progress indicator showing completion percentage based on profileStats
- Emoji bounces on hover (Framer Motion whileHover)
- Completed state with green checkmark overlay and green tint

**Improved Page Transitions:**
- Directional transitions: forward slides left, backward slides right, profile/leaderboard scales from center
- `getDirection()` determines direction based on screen order
- Custom `pageVariants` with enter/center/exit states
- Smooth easing `[0.25, 0.46, 0.45, 0.94]`

**Simulation Shimmer:**
- Added shimmer skeleton bars above the spinner
- Uses `.shimmer-loading` CSS class

### 3. `/home/z/my-project/src/components/layout/Footer.tsx`
- **Gradient border** at top of footer via `.footer-gradient-border`
- **Active tab glow** with animated box-shadow on play button (pulsing green glow)
- **Scale animation** on tap (`whileTap={{ scale: 0.88 }}`) for haptic-like feedback
- **Play button** larger (w-14 h-14 when active vs w-12 h-12 inactive) with stronger glow and gradient background
- **Active dot indicator** below non-play tabs with layoutId animation
- **Desktop play button** styled as gradient CTA with shadow
- **Desktop active indicator** with layoutId animated underline
- **Backdrop blur** on mobile nav bar (`bg-[#0a0a0f]/95 backdrop-blur-md`)

## Lint Status
- Modified files pass lint cleanly
- Pre-existing lint error in `SimulationResult.tsx` (not modified by this task)
