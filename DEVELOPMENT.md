# Development Guide — 30-0 RPL

> How to set up, develop, and contribute to the 30-0 RPL Football Draft Simulator.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Development Workflow](#development-workflow)
4. [Database Management](#database-management)
5. [Adding Features](#adding-features)
6. [Testing](#testing)
7. [Code Style](#code-style)
8. [Git Conventions](#git-conventions)
9. [Project Configuration](#project-configuration)

---

## Prerequisites

| Tool | Version | Required | Notes |
|------|---------|----------|-------|
| **Node.js** | 20+ | Yes | 22 LTS recommended |
| **Bun** | Latest | Yes | Fast runtime and package manager |
| **Git** | 2.x | Yes | Version control |
| **VS Code** | Latest | Recommended | With extensions below |

### Recommended VS Code Extensions

- **ESLint** (`dbaeumer.vscode-eslint`) — Linting
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — CSS autocomplete
- **Prisma** (`Prisma.prisma`) — Schema syntax highlighting
- **TypeScript Error Translator** (`mattpocock.ts-error-translator`) — Readable TS errors

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/kr1sanov/30-0.git
cd 30-0
```

### 2. Install Dependencies

```bash
bun install
# or: npm ci
```

### 3. Configure Database Schema

For local development, use SQLite (no external database needed):

```bash
cp prisma/schema.sqlite.prisma prisma/schema.prisma
npx prisma generate
```

### 4. Create the Database and Push Schema

```bash
npx prisma db push
```

This creates a local SQLite database file in `prisma/dev.db`.

### 5. Seed the Database

Load RPL player, club, and season data:

```bash
bun run db:seed
```

This runs `prisma/seed.ts` which populates the database with:
- ~15 RPL clubs
- ~33 seasons (1992–2025)
- ~600+ players
- ~1500+ player-season records

### 6. Start the Development Server

```bash
bun run dev
```

The app runs at `http://localhost:3000` with Turbopack for fast HMR.

### 7. Verify the Setup

```bash
# Health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok","database":"connected",...}

# Check clubs
curl http://localhost:3000/api/clubs
# Expected: JSON array of 15 clubs

# Check seasons
curl http://localhost:3000/api/seasons
# Expected: JSON array of 33 seasons
```

---

## Development Workflow

### Branch Strategy

```
main (protected)
  ├── feature/new-trophy-system
  ├── feature/manager-special-abilities
  ├── fix/draft-undo-bug
  └── refactor/simulation-engine-v3
```

### Workflow Steps

1. **Create a branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```

2. **Code** — Make your changes, following the [Code Style](#code-style) guidelines

3. **Test locally**:
   ```bash
   bun run lint          # ESLint check
   npx tsc --noEmit      # TypeScript type check
   bun run dev           # Start dev server and test manually
   ```

4. **Commit** — Follow [Conventional Commits](#git-conventions):
   ```bash
   git add .
   git commit -m "feat: add January transfer window to simulation"
   ```

5. **Push** to remote:
   ```bash
   git push origin feature/your-feature
   ```

6. **Create a Pull Request** on GitHub:
   - Title follows conventional commit format
   - Description includes: What, Why, How to test
   - Link any related issues

7. **Review** — At least one approval required

8. **Merge** — Squash and merge into `main`

9. **Auto-deploy** — GitHub Actions deploys to production on push to `main`

---

## Database Management

### Schema Variants

The project supports three database backends via separate Prisma schema files:

| File | Provider | When to Use | Switch Command |
|------|----------|-------------|----------------|
| `schema.sqlite.prisma` | SQLite | Local development, testing | `npm run schema:sqlite` |
| `schema.mysql.prisma` | MySQL | Production (Jino hosting) | Manual: `cp prisma/schema.mysql.prisma prisma/schema.prisma` |
| `schema.postgresql.prisma` | PostgreSQL | Cloud databases (Supabase) | `npm run schema:postgres` |

**Important**: The active `prisma/schema.prisma` is the one Prisma reads. Always switch before running `prisma generate`.

### Common Commands

```bash
# Generate Prisma Client from current schema
npx prisma generate

# Push schema changes to database (development)
bun run db:push

# Create a migration (production-safe)
bun run db:migrate

# Apply pending migrations
bun run db:migrate:deploy

# Reset database (⚠️ destroys all data)
bun run db:reset

# Seed database with RPL data
bun run db:seed

# Open Prisma Studio (visual database browser)
bun run db:studio
```

### Switching Database for Local Development

To use MySQL locally (e.g., with Docker):

```bash
# Start MySQL container
docker compose -f docker-compose.dev.yml up -d

# Switch schema
cp prisma/schema.mysql.prisma prisma/schema.prisma
npx prisma generate

# Set DATABASE_URL in .env
echo "DATABASE_URL=mysql://root:password@localhost:3306/30_0_rpl" >> .env

# Push schema and seed
bun run db:push
bun run db:seed
```

### Modifying the Schema

1. Edit the appropriate schema variant file (e.g., `schema.sqlite.prisma`)
2. Copy it to `schema.prisma`: `cp prisma/schema.sqlite.prisma prisma/schema.prisma`
3. Run `npx prisma generate` to update the client
4. Run `npx prisma db push` to apply changes
5. **Also update the other schema variants** (`schema.mysql.prisma`, `schema.postgresql.prisma`) to keep them in sync

### Schema Differences Between Variants

- **MySQL**: Uses `@db.VarChar(N)`, `@db.Text` annotations for column types
- **PostgreSQL**: Similar type annotations with `@db.Text`, `@db.VarChar`
- **SQLite**: No type annotations needed (SQLite is typeless)
- **MySQL-specific fields**: `User` model has `referralCode` and `referredBy` fields not present in the basic SQLite schema

---

## Adding Features

### Component Structure

Create new game components in `src/components/game/`:

```typescript
// src/components/game/MyNewScreen.tsx
'use client';

import { useGameStore } from '@/store/gameStore';

export function MyNewScreen() {
  const screen = useGameStore((s) => s.screen);

  if (screen !== 'my-new-screen') return null;

  return (
    <div className="p-4">
      {/* Component content */}
    </div>
  );
}
```

Then import and render it in `src/app/page.tsx`.

### API Route Pattern

Create new API routes in `src/app/api/`:

```typescript
// src/app/api/my-feature/route.ts
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // 1. Parse input
    const { searchParams } = new URL(request.url);
    const param = searchParams.get('param');

    // 2. Validate
    if (!param) {
      return NextResponse.json({ error: 'param required' }, { status: 400 });
    }

    // 3. Query database
    const data = await db.myModel.findMany({ where: { param } });

    // 4. Return response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate and process...

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Failed:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 },
    );
  }
}
```

### Store Pattern

Add new state and actions to `src/store/gameStore.ts`:

```typescript
// In gameStore.ts
interface GameState {
  // ... existing state
  myNewState: string | null;
  myNewAction: (param: string) => void;
}

// In the store creator:
  myNewState: null,
  myNewAction: (param) => {
    set({ myNewState: param });
    // Call API if needed
    fetch('/api/my-feature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ param }),
    }).then(res => res.json()).then(data => {
      // Update state based on response
    });
  },
```

### Adding a New Game Screen

1. Add the screen key to the `GameScreen` type in `src/lib/types.ts`
2. Create the component in `src/components/game/`
3. Add the component to `src/app/page.tsx`
4. Add transition logic in `gameStore.ts` (e.g., `goToMyScreen()`)
5. Add analytics tracking: `Metrics.screenView('my-screen')`
6. Test the full flow from home → your screen → back

### Adding a New Formation

1. Add the formation definition to `FORMATIONS` array in `src/lib/positions.ts`
2. Each formation has 11 slots with a `Position` and a `label`
3. Ensure all positions are valid `Position` types from the `ALL_POSITIONS` array
4. The API endpoint `GET /api/formations` automatically returns all formations

### Adding a New Manager

1. Add the manager object to `MANAGERS` array in `src/lib/managers.ts`
2. Include: `id`, `name`, `rating` (1–10), `nationality`, `era`, optional `specialAbility`
3. Follow the rating guidelines in the file comments

---

## Testing

### Lint Check

```bash
bun run lint
```

Runs ESLint with Next.js configuration. Warnings are acceptable; errors must be fixed.

### TypeScript Type Check

```bash
npx tsc --noEmit
```

Validates all TypeScript types without generating output. No errors should be present.

### Production Build

```bash
bun run build
```

Compiles the entire application for production. This also runs `prisma generate`. If the build succeeds, the app is ready for deployment.

### Manual Testing Checklist

Before submitting a PR, verify:

- [ ] App loads at `http://localhost:3000`
- [ ] Health check passes: `curl http://localhost:3000/api/health`
- [ ] Can start a new game from the home screen
- [ ] Can configure game settings (formation, difficulty, era)
- [ ] Wheel spin works and returns players
- [ ] Can select a player and assign to a position
- [ ] Squad stats update after each assignment
- [ ] Can complete the draft (fill all 11 slots)
- [ ] Season simulation runs and produces results
- [ ] Trophies are awarded correctly
- [ ] Profile screen shows user data
- [ ] Leaderboard loads
- [ ] Daily challenge generates correctly
- [ ] No console errors in browser DevTools
- [ ] Mobile layout looks correct (375px width)

---

## Code Style

### TypeScript

- **Strict mode** enabled in `tsconfig.json`
- **No `any` types** — use proper type definitions
- **ES modules** — use `import`/`export`, not `require()`
- **Interface over type** for object shapes; `type` for unions and utilities
- **Explicit return types** for exported functions
- **Nullish coalescing** (`??`) over logical OR (`||`) for null/undefined checks

### React

- **Function components** only (no class components)
- **`'use client'`** directive for client-side components (interactive, hooks, browser APIs)
- **Hooks at the top** of the component function
- **Conditional rendering** over early returns for screen visibility
- **Zustand selectors** for store access to prevent unnecessary re-renders:
  ```typescript
  // Good: specific selector
  const screen = useGameStore((s) => s.screen);

  // Bad: destructure entire store
  const { screen, gameConfig, draftSlots, ... } = useGameStore();
  ```

### Styling

- **Tailwind CSS** utility classes — no custom CSS files except `globals.css`
- **shadcn/ui components** — use existing components instead of building from scratch
- **No indigo/blue** as primary colors unless explicitly requested
- **Responsive design** — mobile-first with `sm:`, `md:`, `lg:` breakpoints
- **Dark theme** — the app uses `className="dark"` on the `<html>` element

### Components

- **shadcn/ui** for UI primitives (Button, Card, Dialog, Tabs, etc.)
- **Framer Motion** for animations and transitions
- **Lucide React** for icons
- **Component naming**: PascalCase files matching component name
- **File organization**: Group by feature (`game/`, `layout/`, `share/`, `ui/`)

### API Routes

- **Type-safe request handling** — validate and parse all inputs
- **Consistent error responses** — `{ error: string }` with appropriate HTTP status
- **Console error logging** — `console.error('Failed to ...:', error)` on catch blocks
- **Prisma client** — import from `@/lib/db` (singleton pattern)

---

## Git Conventions

### Conventional Commits

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(game): add January transfer window event` |
| `fix` | Bug fix | `fix(draft): prevent duplicate player assignment` |
| `refactor` | Code refactoring | `refactor(simulation): extract match probability calculation` |
| `docs` | Documentation | `docs: update ARCHITECTURE.md` |
| `style` | Code style (formatting) | `style: fix indentation in gameStore` |
| `test` | Tests | `test: add simulation engine tests` |
| `chore` | Build, deps, tooling | `chore: upgrade Next.js to 16.2` |
| `perf` | Performance improvement | `perf(wheel): cache club-season compatibility` |

### Scopes

Common scopes: `game`, `draft`, `simulation`, `auth`, `api`, `db`, `ui`, `store`, `metrics`

### Branch Naming

```
feature/description     # New features
fix/description         # Bug fixes
refactor/description    # Code refactoring
```

### Pull Request Template

```markdown
## What
Brief description of changes

## Why
Motivation / problem being solved

## How to Test
1. Step 1
2. Step 2
3. Expected result

## Screenshots (if UI changes)
[Add screenshots]

## Checklist
- [ ] Lint passes
- [ ] TypeScript compiles
- [ ] Tested manually
- [ ] No console.log left in code
```

---

## Project Configuration

### Key Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config: standalone output, security headers, caching, image optimization |
| `tailwind.config.ts` | Tailwind CSS theme customization |
| `tsconfig.json` | TypeScript compiler options (strict mode) |
| `components.json` | shadcn/ui component configuration (New York style) |
| `ecosystem.config.js` | PM2 process manager configuration |
| `eslint.config.mjs` | ESLint rules and Next.js plugin |
| `postcss.config.mjs` | PostCSS with Tailwind CSS plugin |
| `prisma/schema.prisma` | Active Prisma database schema |

### npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev -p 3000 2>&1 \| tee dev.log` | Start development server |
| `build` | `prisma generate && next build && cp -r ...` | Production build with standalone output |
| `start` | `NODE_ENV=production node .next/standalone/server.js` | Start production server |
| `lint` | `eslint .` | Run ESLint |
| `db:push` | `prisma db push` | Push schema to database |
| `db:generate` | `prisma generate` | Generate Prisma Client |
| `db:migrate` | `prisma migrate dev` | Create and apply migrations |
| `db:migrate:deploy` | `prisma migrate deploy` | Apply pending migrations |
| `db:reset` | `prisma migrate reset` | Reset database (destroys data) |
| `db:seed` | `bun run prisma/seed.ts` | Seed database with RPL data |
| `db:studio` | `prisma studio` | Open visual database browser |
| `schema:sqlite` | `cp prisma/schema.sqlite.prisma prisma/schema.prisma && prisma generate` | Switch to SQLite schema |
| `schema:postgres` | `cp prisma/schema.postgresql.prisma prisma/schema.prisma && prisma generate` | Switch to PostgreSQL schema |

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database connection (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# Telegram Bot Token (for auth validation)
TELEGRAM_BOT_TOKEN="your-bot-token-here"

# Node environment
NODE_ENV="development"
```

The `.env` file is git-ignored and should never be committed.

### Debugging

**Dev Server Logs**: The dev script writes logs to `dev.log`:
```bash
# View recent logs
tail -50 dev.log

# Watch logs in real-time
tail -f dev.log
```

**Database Queries**: Prisma logs errors by default (`log: ['error']` in `db.ts`). For query logging during development:
```typescript
// Temporarily in db.ts:
new PrismaClient({
  log: ['query', 'error', 'warn'],
})
```

**Browser DevTools**: Open in Telegram Desktop or Chrome:
- Console: Check for errors and API responses
- Network: Monitor API calls and response times
- React DevTools: Inspect component state
- Zustand DevTools: Monitor store changes
