# 30-0 RPL — Work Log

## Current Project Status (Round 2 Complete)

**Status**: MVP is fully functional with enhanced features. The complete game loop works end-to-end with manager spinning, persistent profile stats, match-by-match results, and Telegram WebApp SDK integration.

### What's Working (Round 2 additions in bold):
- ✅ Full game flow from homepage to season simulation results
- ✅ 12 formations with proper slot layouts on football pitch
- ✅ 3 difficulty levels (Easy/Normal/Hard) with rerolls
- ✅ Spin wheel with animation and club+season reveal
- ✅ Player selection with position compatibility indicators
- ✅ Position assignment on the formation pitch
- ✅ Season simulation engine (30 matches, realistic results)
- ✅ Leaderboard and profile screens
- ✅ Database seeded with 5,278 player-season records
- ✅ Dark theme matching 38-0.app style
- ✅ "How to Play" modal with 4-step instructions
- ✅ FAQ accordion on homepage
- ✅ Challenge cards on homepage
- ✅ Responsive mobile-first design
- **✅ Manager/Coach spinning feature (22 Russian coaches)**
- **✅ Profile stats persistence with localStorage (Zustand persist)**
- **✅ Match-by-match season results view (30 matches expandable)**
- **✅ Telegram WebApp SDK integration (haptics, share, theme)**
- **✅ Enhanced SimulationResult with win streak, squad rating, manager info**
- **✅ Profile screen with trophy cabinet, history, and detailed stats**
- **✅ PWA manifest for installable web app**
- **✅ Cyrillic font support in Geist**

### Database Stats:
| Entity | Count |
|--------|-------|
| Clubs | 15 |
| Seasons | 33 |
| ClubSeasons | 374 |
| Players | 613 |
| PlayerSeasons | 5,278 |
| Managers | 22 (in code, not DB) |

---

## Round 2 — Completed Work

### Task ID: R2-1 — QA Testing
- Tested full game flow with agent-browser
- Confirmed: Homepage → Setup → Draft (11 spins) → Squad Complete → Manager Spin → Simulation → Results
- Manager spin landed on "Леонид Слуцкий" (rating 85)
- Simulation produced: 12W/8D/10L, 44 points, 7th place
- Match-by-match results visible (30 matches)
- Tournament table with 16 teams displayed correctly
- No errors in console, no crashes

### Task ID: R2-2 — Manager Spinning Feature
- Created `/src/lib/managers.ts` with 22 Russian/international coaches
  - Legends: Газзаев, Романцев, Сёмин, Бышовец
  - CSKA: Слуцкий, Каррера
  - Zenit: Спаллетти, Луческу, Семак
  - Spartak: Черчесов, Карпин, Абаскаль
  - Others: Бердыев, Адвокат, Хиддинк, Капелло, Манчини
- Updated `/src/components/game/ManagerChoice.tsx`:
  - "🎲 Крутить тренера" button with spinning animation
  - Manager card showing name, nationality, era, rating, special ability
  - "Играть с [Name] (+2)" and "🔄 Крутить ещё раз" options
  - "Без тренера (классика)" fallback
- Updated `/src/app/api/runs/[runId]/simulate/route.ts`:
  - Accepts managerName and managerRating in request body
  - Saves to GameRun table
  - Returns managerName, managerRating, squadRating, squadStrength, players in response

### Task ID: R2-3 — Profile Stats Persistence
- Updated `/src/store/gameStore.ts` with Zustand `persist` middleware:
  - Profile stats saved to localStorage under "30-0-rpl-storage" key
  - Only profileStats is persisted (not transient game state)
- Enhanced ProfileStats interface:
  - totalSeasons, bestPoints, bestRecord, titles, perfect
  - totalWins, totalGoals, favoriteFormation
  - achievements[] (champion, perfect, goal_machine, iron_defense)
  - history[] (last 50 seasons with full details)
- `updateProfileStats()` action called after each simulation:
  - Increments counters, updates best records
  - Adds achievements based on results
  - Tracks formation usage for favorite
  - Stores history entries

### Task ID: R2-4 — Enhanced Profile Screen
- Created `/src/components/game/ProfileScreen.tsx`:
  - 4 stat cards (seasons, best points, titles, perfect 30-0)
  - Additional stats (total wins, total goals)
  - Favorite formation display
  - Trophy cabinet with 4 achievements (earned/locked states)
  - Expandable history section with last 50 seasons
  - Each history entry shows formation, difficulty, W-D-L, points, position, manager
- Updated `/src/app/page.tsx` to use the new component

### Task ID: R2-5 — Match-by-Match Results
- Enhanced `/src/components/game/SimulationResult.tsx`:
  - Added expandable "📋 Матчи по турам" section
  - Shows all 30 matches with: tour number, W/D/L badge, home/away icon, opponent, score
  - Color-coded results (green=W, orange=D, red=L)
  - Scrollable list with custom scrollbar
- Added extra stats:
  - Win streak calculation
  - Squad rating display
  - Manager info card (if used)
- Added new achievements:
  - 🛡️ Непобедимый (0 defeats, not perfect)
  - 💪 Доминирование (+50 goal difference)

### Task ID: R2-6 — Telegram WebApp SDK Integration
- Created `/src/hooks/use-telegram.ts`:
  - Auto-initializes Telegram WebApp on mount
  - Sets dark theme colors (header, background)
  - Enables closing confirmation
  - Provides: haptic(), notify(), showMainButton(), showBackButton(), shareToTelegram()
  - Works gracefully outside Telegram (no errors)
- Added Telegram script to `/src/app/layout.tsx`
- Added haptic feedback to SpinWheel (medium on spin, light on reroll)
- Enhanced share button in SimulationResult to use Telegram share first
- Added PWA manifest at `/public/manifest.json`
- Added Cyrillic subset to Geist fonts

### Task ID: R2-7 — Bug Fixes
- Fixed player name display: shows last name initials (2 letters) instead of truncated first name
- Fixed movePlayer function: now properly swaps players between slots (was only updating isCompatible)
- Fixed simulate API: now returns matches array, managerName, squadRating, squadStrength
- Fixed reroll API: properly increments rerollsUsed in database
- Fixed React hooks rules violation in SimulationResult (useMemo before early return)

---

## Round 1 — Completed Work (Summary)

### Task ID: 1 - Prisma Schema & Database
- 7 models: Club, Season, ClubSeason, Player, PlayerSeason, GameRun, GameSlot
- Seed script with 5,278 player-season records

### Task ID: 2 - Game Logic Libraries
- types.ts, positions.ts (15 positions, 12 formations, compatibility matrix)
- simulation.ts (sigmoid + Poisson season engine)
- wheel.ts (filtered random selection)

### Task ID: 3 - API Routes (10 endpoints)
- clubs, seasons, formations, runs, spin, draft, reroll, simulate, leaderboard

### Task ID: 4 - Frontend Components
- Zustand store, 8 game components, 2 layout components
- Full page.tsx with 9 screen states

### Task ID: 5 - Polish & Improvements
- Homepage with hero, how-to-play, stats, challenges, FAQ
- Pitch stripes, animations, card-glow effects
- HowToPlayModal component

---

## Unresolved Issues & Risks

1. **Player data quality**: Some player names in the seed may not be perfectly accurate (the seed uses generated names for less famous players). Needs review and correction from real historical data sources (Transfermarkt, soFIFA).

2. **Performance**: The spin API loads ALL club-seasons with players in one query (5000+ records). Should add caching or optimized queries for production.

3. **Hard mode rating hiding**: The spin endpoint returns rating=0 for hard mode, but the DB still has the rating. The frontend shows "??" for hidden ratings but the draft still uses the real rating in simulation.

4. **Position swap persistence**: The movePlayer function swaps players locally but doesn't update the database. If the page is refreshed, swaps are lost.

5. **Missing features (locked)**: Daily Challenge, One-Club XI, Leagues, Nations Trophy are all hidden with "Скоро" badges.

6. **Telegram auth**: The app works as a web page but doesn't authenticate users via Telegram initData. For leaderboard to work properly, need to implement Telegram user authentication.

7. **No sound effects**: Could add spin sound, goal sound, victory fanfare.

8. **Mobile bottom safe area**: Should add `env(safe-area-inset-bottom)` padding for iOS devices with home indicator.

---

## Priority Recommendations for Next Phase

1. **HIGH**: Implement Telegram user authentication (validate initData on backend, create/update User records)
2. **HIGH**: Improve seed data quality with real player names from Transfermarkt/soFIFA
3. **HIGH**: Add spin result caching for performance (cache club-seasons with players in memory)
4. **MEDIUM**: Implement One-Club mode (draft from a single club's history)
5. **MEDIUM**: Add sound effects (spin, draft, goal, victory)
6. **MEDIUM**: Implement sharing with rich preview (image generation of squad)
7. **LOW**: Add Daily Challenge mode
8. **LOW**: Add Leagues (head-to-head) mode
9. **LOW**: Add player photos/avatars
