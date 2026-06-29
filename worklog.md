# 30-0 RPL — Work Log

## Current Project Status

**Status**: MVP is functional and playable. The core game loop works end-to-end:
Home → Setup → Draft (Spin → Select Player → Assign Position ×11) → Squad Complete → Manager Choice → Simulate → Result

### What's Working:
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

### Database Stats:
| Entity | Count |
|--------|-------|
| Clubs | 15 |
| Seasons | 33 |
| ClubSeasons | 374 |
| Players | 613 |
| PlayerSeasons | 5,278 |

---

## Completed Work (Round 1)

### Task ID: 1 - Prisma Schema & Database
- Updated prisma/schema.prisma with game models (Club, Season, ClubSeason, Player, PlayerSeason, GameRun, GameSlot)
- Ran db:push successfully
- Created seed script at prisma/seed.ts
- Seeded database with 5,278 player-season records
- Added db:seed script to package.json

### Task ID: 2 - Game Logic Libraries
- Created src/lib/types.ts - TypeScript types, configs, enums
- Created src/lib/positions.ts - 15 positions, compatibility matrix, 12 formations
- Created src/lib/simulation.ts - Season simulation engine (squad strength, match sim, Poisson goals)
- Created src/lib/wheel.ts - Wheel spinning logic with filtering and animation

### Task ID: 3 - API Routes
- GET /api/clubs - List all clubs
- GET /api/seasons - List all seasons
- GET /api/formations - List formations
- POST /api/runs - Create new game run
- GET /api/runs/[runId] - Get run details
- POST /api/runs/[runId]/spin - Spin the wheel
- POST /api/runs/[runId]/draft - Draft a player to slot
- POST /api/runs/[runId]/reroll - Use a reroll
- POST /api/runs/[runId]/simulate - Simulate season
- GET /api/leaderboard - Get top results

### Task ID: 4 - Frontend Components
- src/store/gameStore.ts - Zustand store with all game state
- src/components/game/GameSetup.tsx - Formation selector, difficulty, era filter
- src/components/game/FormationView.tsx - Football pitch with position slots
- src/components/game/SpinWheel.tsx - Wheel spinning with animation
- src/components/game/PlayerList.tsx - Player cards with compatibility
- src/components/game/SquadStats.tsx - Squad statistics panel
- src/components/game/SimulationResult.tsx - Season results with table
- src/components/game/ManagerChoice.tsx - Manager selection
- src/components/layout/Header.tsx - Navigation with restart button
- src/components/layout/Footer.tsx - Footer with how-to-play modal
- Updated src/app/page.tsx - All screens rendered via Zustand state
- Updated src/app/layout.tsx - Metadata and dark theme
- Updated src/app/globals.css - Custom scrollbar, animations, pitch styles

### Task ID: 5 - Polish & Improvements
- Homepage: Added hero section, how-to-play steps, stats, challenges, FAQ
- FormationView: Added pitch stripes, bigger slots, proper initials, fill counter
- SpinWheel: Added "КРУТИТЬ СОСТАВ" header, rotating animation, club emoji
- PlayerList: Added compatibility indicators (✅/❌), instruction banner
- SimulationResult: Added confetti, trophy animation, achievements
- Header: Added ⚽ emoji, restart button, backdrop blur
- GameSetup: Added mini pitch previews, rating toggle, polished layout
- HowToPlayModal: New dialog component

---

## Unresolved Issues & Risks

1. **Player data quality**: Some player names in the seed may not be perfectly accurate (the seed uses generated names for less famous players). Needs review and correction from real historical data sources.

2. **Performance**: The spin API loads ALL club-seasons with players in one query, which could be slow with 5000+ records. Should add caching or optimized queries.

3. **Hard mode rating hiding**: Currently the spin endpoint returns rating=0 for hard mode, but the DB still has the rating. The frontend should show "??" for hidden ratings.

4. **Position swap in Squad Complete**: The movePlayer function swaps players between positions but doesn't update the database. This is a local-only operation.

5. **Manager/Coach feature**: The ManagerChoice component exists but the spin for manager isn't fully implemented. The simulate endpoint accepts managerRating but there's no UI to actually spin for a manager.

6. **Missing features (locked)**: Daily Challenge, One-Club XI, Leagues, Nations Trophy are all hidden with "Скоро" badges.

7. **No Telegram integration yet**: The app works as a web page but hasn't been integrated with Telegram WebApp SDK (Mini App authentication, MainButton, BackButton, HapticFeedback).

8. **Sharing**: The "Поделиться" button on results doesn't implement actual sharing logic.

---

## Priority Recommendations for Next Phase

1. **HIGH**: Fix the player name display on formation view (show last name instead of truncated first name)
2. **HIGH**: Add proper Telegram WebApp SDK integration for Mini App deployment
3. **HIGH**: Implement the manager/coach spinning feature
4. **MEDIUM**: Improve seed data quality with real player names from transfermarkt/sofifa
5. **MEDIUM**: Add spin result caching for performance
6. **MEDIUM**: Implement sharing functionality (share results to Telegram)
7. **LOW**: Add sound effects and haptic feedback
8. **LOW**: Implement Daily Challenge mode
9. **LOW**: Add One-Club mode
