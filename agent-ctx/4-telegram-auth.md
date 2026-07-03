# Task 4 - Telegram Auth & Profile Refactoring

## Work Completed

### 1. Prisma Schema Updates
- **Added `User` model** to both `prisma/schema.prisma` (SQLite) and `prisma/schema.postgresql.prisma` (PostgreSQL):
  - Fields: `id`, `telegramId` (unique), `username`, `firstName`, `lastName`, `displayName`, `photoUrl`, `createdAt`, `updatedAt`
  - Relation: `gameRuns GameRun[]`
- **Added `userId` field** to `GameRun` model in both schemas:
  - `userId String?` (nullable)
  - `user User? @relation(fields: [userId], references: [id], onDelete: SetNull)`

### 2. Environment Variable
- Added `TELEGRAM_BOT_TOKEN` to `.env` with the provided bot token

### 3. API Routes
- **Created `/api/auth/telegram/route.ts`**: POST endpoint that validates Telegram WebApp initData using HMAC-SHA256, extracts user info, and upserts user in database
- **Created `/api/auth/profile/route.ts`**: PATCH endpoint that updates a user's display name in the database

### 4. Auth Store
- **Created `/store/authStore.ts`**: Zustand store with localStorage persistence that manages:
  - `user` (Telegram user data or guest)
  - `isAuthenticated`, `isAuthenticating` state flags
  - `loginWithTelegram(initData)` — validates via API, falls back to guest on failure
  - `loginAsGuest()` — creates a guest user profile
  - `updateDisplayName(name)` — updates locally and on server (if not guest)
  - `logout()`

### 5. Auto-Login Hook
- **Created `/hooks/use-telegram-auth.ts`**: React hook that checks for Telegram WebApp on mount and automatically authenticates. Falls back to guest mode if not in Telegram.

### 6. ProfileScreen Refactoring
- Imported `useAuthStore` for user data
- **Avatar**: Now shows Telegram user photo if available, falls back to ⚽ emoji
- **Editable display name**: Click name to edit inline with Input component. Saves on Enter/blur, cancels on Escape
- **Telegram username**: Shows `@username` below display name if available
- **Removed "Сбросить статистику" button**: Stats are now permanent
- **Removed `DEFAULT_PROFILE_STATS` constant** and `handleResetStats` function (no longer needed)
- **Removed AlertDialog imports** (no longer used after removing reset button)

### 7. Page-Level Auth Initialization
- Added `useTelegramAuth()` call in `Home` component in `page.tsx`

## Lint Status
- ✅ `bun run lint` passes with no errors

## Note
- `bun run db:push` was NOT run (as instructed). The User model and userId field are defined in the schema but not yet pushed to the database.
