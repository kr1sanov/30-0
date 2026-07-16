# Architecture — 30-0 RPL

> Comprehensive technical architecture documentation for the 30-0 RPL Football Draft Simulator.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database](#database)
5. [API Routes](#api-routes)
6. [Frontend Flow](#frontend-flow)
7. [State Management](#state-management)
8. [Telegram WebApp SDK](#telegram-webapp-sdk)
9. [Analytics](#analytics)
10. [CI/CD Pipeline](#cicd-pipeline)

---

## Overview

**30-0 RPL** is a Telegram Mini App that simulates building a fantasy football squad from Russian Premier League (RPL) players. Users spin a wheel of fortune (random club × season), select players to fill 11 positions on a formation, and then simulate a 30-match season. The ultimate goal: achieve a perfect 30-0 record.

The app is a single-page application (SPA) built with Next.js 16 App Router, using a client-side state machine (Zustand) to navigate between game screens without page reloads.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 16.1+ (App Router, Turbopack) | Full-stack React framework with SSR/SSG |
| Language | TypeScript | 5.x | Strict type safety across the codebase |
| Styling | Tailwind CSS | 4.x | Utility-first CSS with custom theme |
| UI Components | shadcn/ui | New York style | Pre-built accessible Radix UI components |
| State Management | Zustand | 5.x | Client-side state with localStorage persistence |
| Database ORM | Prisma | 6.x | Type-safe database access (SQLite/MySQL/PostgreSQL) |
| Animations | Framer Motion | 12.x | Declarative animations and transitions |
| Analytics | Yandex.Metrika | Counter 110726199 | User behavior tracking and custom events |
| Auth | Telegram WebApp SDK | — | Authentication via `window.Telegram.WebApp` |
| Icons | Lucide React | 0.525+ | SVG icon library |
| Runtime | Bun | Latest | Fast JavaScript runtime and package manager |
| Drag & Drop | @dnd-kit | 6.x / 10.x | Accessible drag-and-drop for squad management |

### Key Dependencies

- **next-intl**: Internationalization support
- **next-themes**: Light/dark theme switching
- **next-auth**: Authentication library (available for future use)
- **sonner**: Toast notifications
- **html2canvas-pro**: Client-side screenshot generation for sharing
- **recharts**: Data visualization charts
- **zod**: Runtime schema validation
- **date-fns**: Date manipulation utilities
- **sharp**: Server-side image processing

---

## Project Structure

```
30-0/
├── prisma/
│   ├── schema.prisma              # Active schema (SQLite by default)
│   ├── schema.sqlite.prisma       # SQLite variant for local development
│   ├── schema.mysql.prisma        # MySQL variant for production (Jino)
│   ├── schema.postgresql.prisma   # PostgreSQL variant for Supabase
│   ├── seed.ts                    # Database seed script (RPL player data)
│   └── migrations/                # Prisma migration history
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # Single SPA page (all game screens)
│   │   ├── layout.tsx             # Root layout (fonts, Metrika, Telegram SDK)
│   │   ├── globals.css            # Global styles and CSS variables
│   │   └── api/                   # API route handlers
│   │       ├── route.ts           # Root API endpoint
│   │       ├── health/route.ts    # Health check (GET)
│   │       ├── seed/route.ts      # Database seeding (GET)
│   │       ├── stats/route.ts     # Global statistics (GET)
│   │       ├── clubs/             # Club endpoints
│   │       ├── seasons/           # Season endpoints
│   │       ├── formations/route.ts
│   │       ├── leaderboard/route.ts
│   │       ├── daily/route.ts     # Daily challenge (GET)
│   │       ├── runs/              # Game run CRUD + actions
│   │       ├── auth/              # Telegram auth + profile
│   │       ├── users/             # User sync + profile
│   │       ├── referrals/route.ts
│   │       └── club-seasons/      # Club season player lists
│   │
│   ├── components/
│   │   ├── game/                  # Game-specific components
│   │   │   ├── SpinWheel.tsx      # Canvas-based spinning wheel
│   │   │   ├── GameSetup.tsx      # Game configuration screen
│   │   │   ├── PlayerList.tsx     # Draftable player list
│   │   │   ├── FormationView.tsx  # Football field with position slots
│   │   │   ├── DraftProgressTracker.tsx
│   │   │   ├── SquadStats.tsx     # Squad strength analysis
│   │   │   ├── PreMatchAnalysis.tsx
│   │   │   ├── ManagerChoice.tsx  # Manager spin/select
│   │   │   ├── SimulationResult.tsx
│   │   │   ├── SeasonAwards.tsx   # Trophies and achievements
│   │   │   ├── AchievementUnlocked.tsx
│   │   │   ├── SeasonBrowser.tsx  # Browse RPL seasons
│   │   │   ├── LeaderboardScreen.tsx
│   │   │   ├── ProfileScreen.tsx  # User profile and stats
│   │   │   ├── DailyChallengeScreen.tsx
│   │   │   ├── HowToPlayModal.tsx
│   │   │   └── ErrorToast.tsx
│   │   │
│   │   ├── layout/                # Layout components
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── share/                 # Sharing components
│   │   │   ├── ShareModal.tsx
│   │   │   ├── ResultShareCard.tsx
│   │   │   └── ProfileShareCard.tsx
│   │   │
│   │   └── ui/                    # shadcn/ui components (50+ components)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── tabs.tsx
│   │       └── ...                # All standard shadcn/ui primitives
│   │
│   ├── store/                     # Zustand state stores
│   │   ├── gameStore.ts           # Game state machine (~1300 lines)
│   │   └── authStore.ts           # Telegram auth state
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-telegram.ts        # Telegram WebApp SDK integration
│   │   ├── use-telegram-auth.ts   # Auth flow automation
│   │   ├── use-share.ts           # Share functionality
│   │   ├── use-sound.ts           # Sound effects
│   │   ├── use-mobile.ts          # Mobile detection
│   │   └── use-toast.ts           # Toast notifications
│   │
│   └── lib/                       # Core business logic
│       ├── db.ts                  # Prisma client singleton
│       ├── simulation.ts          # Season simulation engine (v2)
│       ├── positions.ts           # Position compatibility + 12 formations
│       ├── wheel.ts               # Spin wheel selection algorithm
│       ├── managers.ts            # 60+ Russian football managers
│       ├── types.ts               # TypeScript types and game configs
│       ├── dailyChallenge.ts      # Deterministic daily challenge generator
│       ├── nationality.ts         # Nationality → flag emoji mapping
│       ├── metrics.ts             # Yandex.Metrika tracking utility
│       └── utils.ts               # General utility functions (cn, etc.)
│
├── public/                        # Static assets
│   ├── manifest.json              # PWA manifest
│   ├── logo.svg
│   ├── share-image.png            # Open Graph share image
│   ├── robots.txt
│   └── sitemap.xml
│
├── scripts/                       # Utility scripts
│   ├── generate-rpl-data.js       # RPL data generation (2000-2010)
│   ├── generate-rpl-2000-2010.js  # Extended RPL data generation
│   ├── import-rpl-data.ts         # Import RPL data to database
│   ├── import-rpl-fast.ts         # Fast import variant
│   ├── seed-supabase.ts           # Supabase-specific seeding
│   ├── migrate-supabase.ts        # Supabase migration
│   ├── migrate-supabase-pg.ts     # PostgreSQL migration for Supabase
│   ├── deploy.sh                  # Deployment helper script
│   └── deploy-production.sh       # Production deployment script
│
├── ecosystem.config.js            # PM2 process configuration
├── next.config.ts                 # Next.js configuration (security headers, caching)
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── components.json                # shadcn/ui configuration
└── package.json                   # Project manifest
```

---

## Database

### Schema Overview

The Prisma schema defines 7 core models with the following relationships:

```
Club ──1:N──> ClubSeason <──N:1── Season
                    │
                    └──1:N──> PlayerSeason <──N:1── Player

User ──1:N──> GameRun ──1:N──> GameSlot
```

### Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| **Club** | RPL football club | `nameRu`, `nameEn`, `city`, `logoUrl` |
| **Season** | RPL season year range | `startYear`, `endYear`, `label`, `matchesPerTeam` |
| **ClubSeason** | Club performance in a season | `position`, `points`, `won`, `drawn`, `lost`, `goalsFor`, `goalsAgainst` |
| **Player** | Football player | `lastName`, `firstName`, `fullName`, `nationality`, `birthYear` |
| **PlayerSeason** | Player stats in a club-season | `rating`, `primeRating`, `primeSeason`, `mainPosition`, `otherPositions`, `age`, `matches`, `goals`, `assists` |
| **User** | Telegram user | `telegramId`, `displayName`, `referralCode`, `referralCount` |
| **GameRun** | A single game session | `formation`, `difficulty`, `draftMode`, `ratingMode`, `eraFilter`, `rerollsTotal`, `completed`, `wins`, `points`, `position` |
| **GameSlot** | A position in a game run | `slotPosition`, `playerSeasonId`, `playerName`, `playerRating`, `isCompatible` |

### Database Variants

| File | Provider | Use Case |
|------|----------|----------|
| `schema.sqlite.prisma` | SQLite | Local development, simple deployments |
| `schema.mysql.prisma` | MySQL | Production (Jino hosting), has `@db.VarChar` / `@db.Text` annotations |
| `schema.postgresql.prisma` | PostgreSQL | Cloud databases (Supabase, VK Cloud) |

### Production Database

- **Host**: `mysql.925c78adb421.hosting.myjino.ru` (Jino external MySQL)
- **Schema**: Defined in `prisma/schema.mysql.prisma`
- **Connection**: Via `DATABASE_URL` environment variable
- **Client**: `src/lib/db.ts` — singleton PrismaClient with `.env` file fallback

### Data Scale

- ~15 RPL clubs
- ~33 seasons (1992–2025)
- ~600+ players
- ~1500+ player-season records

---

## API Routes

All routes are defined under `src/app/api/` using Next.js App Router route handlers.

### Game Run Management

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/runs` | Create a new game run with formation, difficulty, and era config |
| `GET` | `/api/runs/active` | Get the current user's active (incomplete) game runs |
| `GET` | `/api/runs/[runId]` | Get a game run with its slots |

### Draft & Wheel

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/runs/[runId]/spin` | Spin the wheel — returns a random compatible club-season with available players |
| `POST` | `/api/runs/[runId]/draft` | Assign a player to a formation slot (with compatibility check) |
| `POST` | `/api/runs/[runId]/swap` | Swap two players between slots (strict position check) |
| `POST` | `/api/runs/[runId]/undo` | Undo the last draft action (remove last assigned player) |
| `POST` | `/api/runs/[runId]/reroll` | Re-spin the wheel using a reroll charge |

### Simulation

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/runs/[runId]/simulate` | Simulate a full 30-match season and save results |

### Data Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/clubs` | List all clubs (sorted by Russian name) |
| `GET` | `/api/clubs/[clubId]/history` | Get club's season-by-season history |
| `GET` | `/api/club-seasons/[clubSeasonId]/players` | Get all players for a specific club-season |
| `GET` | `/api/seasons` | List all seasons (sorted by start year descending) |
| `GET` | `/api/seasons/[seasonId]` | Get a specific season with its club-seasons |
| `GET` | `/api/formations` | List all 12 formation definitions |

### User & Auth

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/telegram` | Authenticate via Telegram WebApp initData (HMAC validation) |
| `PATCH` | `/api/auth/profile` | Update user display name |
| `POST` | `/api/users/sync` | Sync/create user profile from Telegram data |
| `GET` | `/api/users/profile` | Get user profile with game statistics |

### Social & Stats

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/leaderboard` | Top 50 completed game runs (by points, then position) |
| `GET` | `/api/daily` | Today's daily challenge (deterministic by MSK date) |
| `GET` | `/api/referrals` | Get referral stats for a user (`?userId=xxx`) |
| `GET` | `/api/stats` | Global database statistics (counts of clubs, players, etc.) |
| `GET` | `/api/health` | Health check — database connectivity + record counts |
| `GET` | `/api/seed` | Seed the database with initial RPL data |

---

## Frontend Flow

The entire game is a single-page application. Screen navigation is managed by `gameStore.screen` (a Zustand state variable of type `GameScreen`). There are no URL-based routes — all transitions happen in-memory.

### Game Screen State Machine

```
home ──[Play]──> setup ──[Start]──> draft ──[Fill 11 slots]──> squad-complete
                                                            │
                                                            ▼
                  awards <──result <──simulation <──manager-choice <──pre-match
                    │
                    └──[Play Again]──> setup
                    
profile <──[any screen via footer]
leaderboard <──[any screen via footer]
```

### Screen Descriptions

| Screen | State Key | Description |
|--------|-----------|-------------|
| **Home** | `home` | Landing page with "Play" button, daily challenge teaser, recent results |
| **Setup** | `setup` | Configure formation, difficulty, era, draft mode, rating mode |
| **Draft** | `draft` | Spin the wheel → select player → assign to position on the field |
| **Position Assign** | `position-assign` | (Sub-state of draft) Click a position on the football field to place selected player |
| **Squad Complete** | `squad-complete` | All 11 positions filled — show squad stats, proceed to match |
| **Pre-Match** | `pre-match` | Pre-match analysis screen showing squad strength breakdown |
| **Manager Choice** | `manager-choice` | Spin/select a manager for bonus rating (+2 overall) |
| **Simulation** | `simulation` | 30-match season simulation in progress |
| **Result** | `result` | Season results: table position, match-by-match results |
| **Awards** | `awards` | Trophies earned (Champion, Invincible, 30-0, etc.) |
| **Profile** | `profile` | User statistics, game history, achievements |
| **Leaderboard** | `leaderboard` | Top 50 completed game runs |

### Critical Draft Flow

1. User clicks "Spin the Wheel" → `POST /api/runs/[id]/spin`
2. Wheel animation plays, landing on a Club × Season combination
3. Player list appears below the wheel
4. User clicks a player → `selectPlayer()` sets `selectedPlayer` in store
5. FormationView highlights compatible positions
6. User clicks a position on the field → `POST /api/runs/[id]/draft`
7. After assignment → `selectedPlayer` cleared, `currentSpin` cleared, ready for next spin
8. Repeat until all 11 positions are filled → transition to `squad-complete`

---

## State Management

### gameStore (`src/store/gameStore.ts`)

The central game state machine, persisted to `localStorage` via Zustand's `persist` middleware. Key name: `30-0-rpl-game`.

**Core State:**

| Field | Type | Description |
|-------|------|-------------|
| `screen` | `GameScreen` | Current screen state |
| `gameConfig` | `GameConfig` | Formation, difficulty, era, draft mode, rating mode |
| `currentRunId` | `string \| null` | Active game run ID (from API) |
| `draftSlots` | `DraftSlot[]` | 11 formation slots with assigned players |
| `currentSpin` | `SpinResult \| null` | Current wheel spin result (club + players) |
| `selectedPlayer` | `PlayerOption \| null` | Player selected from spin result, awaiting position assignment |
| `rerollsUsed` | `number` | Rerolls used in current draft |
| `rerollsTotal` | `number` | Total rerolls available (based on difficulty) |
| `seasonResult` | `SeasonResult \| null` | Simulation results |
| `selectedManager` | `Manager \| null` | Chosen manager |
| `achievements` | `Achievement[]` | All defined achievements |
| `dailyChallenge` | `DailyChallenge \| null` | Today's daily challenge |
| `leaderboard` | `LeaderboardEntry[]` | Leaderboard data |

**Key Actions:**

- `startGame(config)` — Creates a run via API, initializes draft slots
- `spin()` — Calls spin API, sets `currentSpin`
- `selectPlayer(player)` — Sets `selectedPlayer`
- `assignToSlot(slotPosition)` — Calls draft API, updates slot
- `undoLastDraft()` — Calls undo API
- `reroll()` — Calls reroll API, uses a reroll charge
- `swapSlots(from, to)` — Calls swap API
- `simulateSeason()` — Calls simulate API
- `resetGame()` — Clears all state, returns to home

### authStore (`src/store/authStore.ts`)

Manages Telegram authentication state, persisted to `localStorage`. Key name: `30-0-rpl-auth`.

**State:**

| Field | Type | Description |
|-------|------|-------------|
| `user` | `TelegramUser \| null` | Authenticated user data |
| `isAuthenticated` | `boolean` | Whether user is logged in |
| `isAuthenticating` | `boolean` | Auth request in progress |

**Actions:**

- `loginWithTelegram(initData, startParam?)` — Validates via API, falls back to guest on failure
- `loginAsGuest()` — Creates a guest user with display name "Гость"
- `updateDisplayName(name)` — Updates name locally and on server
- `logout()` — Clears auth state

---

## Telegram WebApp SDK

The app integrates deeply with the Telegram WebApp SDK via `window.Telegram.WebApp`.

### Integration Points

| Feature | Implementation | File |
|---------|---------------|------|
| **Authentication** | `WebApp.initData` sent to `/api/auth/telegram` for HMAC validation | `use-telegram-auth.ts`, `authStore.ts` |
| **Haptic Feedback** | `WebApp.HapticFeedback.notificationOccurred()` / `.impactOccurred()` | `use-telegram.ts` |
| **Theme Adaptation** | `WebApp.themeParams` for colors, `WebApp.colorScheme` | `use-telegram.ts` |
| **Safe Area Insets** | `WebApp.safeAreaInset` for iOS notch/home indicator | `layout.tsx` (`env(safe-area-inset-*)`) |
| **Back Button** | `WebApp.BackButton.show()/hide()/onClick()` | `use-telegram.ts` |
| **Main Button** | `WebApp.MainButton` for primary actions | `use-telegram.ts` |
| **Expand** | `WebApp.expand()` to go fullscreen | `use-telegram.ts` |
| **Closing** | `WebApp.close()` to exit the Mini App | `use-telegram.ts` |
| **Cloud Storage** | `WebApp.CloudStorage` for persistent key-value storage | Available via SDK |

### initData Validation Flow

1. Telegram injects `window.Telegram.WebApp.initData` on launch
2. Frontend sends `initData` to `POST /api/auth/telegram`
3. Server validates HMAC-SHA256 signature using `TELEGRAM_BOT_TOKEN`
4. On success: user is upserted in database, session created
5. On failure: falls back to guest mode

### Referral Tracking

- When a user opens the app via `t.me/bot?start=rplXXXXXX`, the `start_param` is captured
- Server checks if the referral code belongs to an existing user
- Referrer's `referralCount` is incremented, new user's `referredBy` is set

---

## Analytics

### Yandex.Metrika

- **Counter ID**: `110726199`
- **Loaded via**: `<Script>` tag in `src/app/layout.tsx` with `strategy="afterInteractive"`
- **Tracking utility**: `src/lib/metrics.ts`

### Custom Events (19+)

| # | Event Name | Trigger | Parameters |
|---|-----------|---------|------------|
| 1 | `app_start` | App launched | `source: 'telegram' \| 'browser'` |
| 2 | `first_launch` | First launch ever | — |
| 3 | `game_start` | New game started | `formation, difficulty, draftMode, ratingMode, eraFilter` |
| 4 | `draft_complete` | All 11 positions filled | `totalRating, avgRating, rerollsUsed` |
| 5 | `season_start` | Season simulation starts | `teamName` |
| 6 | `season_finish` | Season simulation ends | `wins, draws, losses, points, position` |
| 7 | `title_earned` | Trophy earned | `title` |
| 8 | `profile_open` | Profile screen opened | — |
| 9 | `share_result` | Share button clicked | `platform` |
| 10 | `invite_friend` | Referral link shared | — |
| 11 | `leaderboard_open` | Leaderboard opened | — |
| 12 | `settings_open` | Settings opened | — |
| 13 | `difficulty_select` | Difficulty changed | `difficulty` |
| 14 | `era_select` | Era filter changed | `era` |
| 15 | `mode_select` | Game mode changed | `mode` |
| 16 | `app_error` | Application error | `error, context` |
| 17 | `screen_view` | SPA navigation | `screen` |
| 18 | `spin_wheel` | Wheel spun | `club, season` |
| 19 | `player_select` | Player chosen in draft | `playerName, rating, position` |

### Automatic Error Tracking

JS errors and unhandled promise rejections are automatically captured in `layout.tsx`:

```javascript
window.addEventListener('error', (e) => {
  ym(110726199, 'reachGoal', 'js_error', { message, filename, lineno });
});
window.addEventListener('unhandledrejection', (e) => {
  ym(110726199, 'reachGoal', 'promise_error', { reason });
});
```

### SPA Navigation Tracking

Virtual pageviews are sent for each screen transition via `Metrics.screenView(screen)`, which calls both `ym('hit', '/#/{screen}')` and `ym('reachGoal', 'screen_view', ...)`.

---

## CI/CD Pipeline

### GitHub Actions Workflow

The deployment pipeline is defined in `.github/workflows/deploy.yml` and consists of 4 sequential jobs:

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  LINT   │────►│  BUILD  │────►│  DEPLOY  │────►│  VERIFY  │
│         │     │         │     │          │     │          │
│ ESLint  │     │ next    │     │ SSH →    │     │ Health   │
│ tsc     │     │ build   │     │ PM2      │     │ check    │
│         │     │         │     │ reload   │     │ Telegram │
└─────────┘     └─────────┘     └──────────┘     └──────────┘
     │               │               │                │
     ▼               ▼               ▼                ▼
   Error →        Error →        Error →          Error →
   Stop           Stop           Rollback         Notify
```

### Job Details

| Job | Runner | Steps | On Failure |
|-----|--------|-------|------------|
| **lint** | `ubuntu-latest` | `bun install`, `bun run lint`, `bunx tsc --noEmit` | Pipeline stops |
| **build** | `ubuntu-latest` | `bun install`, `bun run build`, upload `.next/` artifact | Pipeline stops |
| **deploy** | `ubuntu-latest` | Download artifact, SSH to Jino, `git pull`, `bun install`, `bun run build`, `pm2 reload`, health check | Manual rollback needed |
| **verify** | `ubuntu-latest` | `curl https://30-0.рф/api/health`, Telegram notification | Telegram alert sent |

### Trigger

- Automatic: on push to `main` branch
- Manual: via `workflow_dispatch`

### Deployment Notification

- **Success**: Telegram message with commit SHA
- **Failure**: Telegram message with commit SHA and author
