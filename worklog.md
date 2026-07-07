# 30-0 RPL — Project Worklog & Status

## Project Current Status (2026-07-07)

### Project Overview
**30-0 RPL** — неофициальная фантази-игра по Российской Премьер-Лиге. Игроки собирают символическую сборную, крутя колесо фортуны (случайный клуб + сезон РПЛ), выбирая игроков и симулируя сезон из 30 матчей. Цель — достичь 30-0 (выиграть все матчи).

### Tech Stack
- **Framework**: Next.js 16.1.3 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **State**: Zustand (persisted to localStorage)
- **Database**: Prisma ORM + SQLite (613 players, 15 clubs, 33 seasons)
- **Animations**: Framer Motion
- **Auth**: Telegram WebApp SDK
- **Runtime**: Bun
- **Port**: 3000

### Dev Server Status
- ✅ Сервер работает на порту 3000 (HTTP 200)
- ✅ API /api/health → `{"status":"ok","database":"connected","clubs":15,"players":613,"seasons":33}`
- ✅ API /api/clubs → 15 клубов
- ✅ API /api/seasons → 33 сезона (1992-2025)
- ✅ API /api/runs → Создание игр работает
- ✅ API /api/runs/[id]/spin → Колесо фортуны работает
- ✅ API /api/runs/[id]/simulate → Симуляция работает (при заполненных слотах)

### Key Files
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Главная SPA-страница (все экраны через Zustand state) |
| `src/store/gameStore.ts` | Zustand store (1283 строки) — всё состояние игры |
| `src/lib/simulation.ts` | Движок симуляции сезона (30 матчей) |
| `src/lib/positions.ts` | Позиции, совместимость, 12 формаций |
| `src/lib/types.ts` | Типы и конфиги (сложность, эпоха, режим драфта) |
| `src/components/game/GameSetup.tsx` | Экран настройки игры |
| `src/components/game/SpinWheel.tsx` | Колесо фортуны (Canvas) |
| `src/components/game/SimulationResult.tsx` | Результаты симуляции |
| `src/components/game/FormationView.tsx` | Футбольное поле с позициями |
| `src/components/game/PlayerList.tsx` | Список игроков для выбора |
| `src/app/api/runs/[runId]/draft/route.ts` | API драфта (строгое позиционное соответствие) |
| `src/app/api/runs/[runId]/simulate/route.ts` | API симуляции |
| `src/app/api/runs/[runId]/spin/route.ts` | API спина колеса |
| `prisma/schema.prisma` | Схема БД (Club, Season, ClubSeason, Player, PlayerSeason, User, GameRun, GameSlot) |

### Game Flow (Zustand Screen State)
```
home → setup → draft → position-assign → squad-complete → pre-match → manager-choice → simulation → result → awards → profile
```

### Database Schema
- **Club** → nameRu, nameEn, city, logoUrl
- **Season** → startYear, endYear, label
- **ClubSeason** → club + season + position/points/stats
- **Player** → lastName, firstName, fullName, nationality
- **PlayerSeason** → player + clubSeason + rating + mainPosition + otherPositions
- **User** → telegramId, displayName, profileStatsJson
- **GameRun** → formation, difficulty, completed, wins/draws/losses/points/position
- **GameSlot** → run + slotPosition + playerSeasonId + playerName + isCompatible

---

## Known Issues & Risks

### Critical
1. **Строгое позиционное соответствие в драфте** — `canFillSlotStrict` в API требует точного совпадения позиции. Если у игрока mainPosition=ВР (вратарь), он не может быть поставлен на ЦЗ даже частично. Это правильно для игры, но требует чтобы фронтенд корректно показывал только совместимых игроков.

2. **Мало данных** — Только 613 игроков и 15 клубов (вместо 5000+ и 16+). Нужен дополнительный скрапинг данных.

### Medium
3. **Нет кнопки "Современная"** — В ERA_CONFIG есть `modern: { label: 'Современная (2016+)' }`, нужно убрать слово "Современная" (по просьбе пользователя).

4. **"Дополнительные настройки"** — Пользователь просил убрать этот блок из GameSetup.

5. **Наложение элементов** — Элементы на экране настроек накладываются друг на друга, нужен фикс.

6. **Слово "Современная" в описании формации 4-2-3-1** — description: 'Современная с опорной', нужно заменить.

### Low
7. **Нет логотипов клубов** — logoUrl = null для всех клубов
8. **Нет Supabase интеграции** — Используется только локальный SQLite
9. **Нет Vercel деплоя** — Проект не задеплоен на продакшн

---

## Previous Work (from session summary)

---
Task ID: 1
Agent: main
Task: Fix season simulation not working after clicking "Сыграть сезон"

Work Log:
- Investigated the full project structure and identified the season simulation flow
- Found the root cause: Zustand store uses optimistic updates for draft picks, and when the draft API returns 400, the optimistic update was NOT reverted, causing the frontend to think all 11 slots are filled while the DB doesn't agree
- The simulate API checks the DB for filled slots and returns 400 if not all 11 are filled
- When simulate failed, the store silently went back to 'squad-complete' without any error message

- Added `syncRunWithDB()` method to gameStore.ts that:
  1. Fetches the current run state from DB via GET /api/runs/[runId]
  2. Identifies slots that are filled locally but not in the DB
  3. Re-saves those missing slots via the draft API
  4. Re-fetches the run to get the latest DB state
  5. Syncs the local slots array with the DB state
  6. Returns true if all 11 slots are filled in DB (ready to simulate)

- Fixed `simulate()` in gameStore.ts to:
  1. Call syncRunWithDB() before calling the simulate API
  2. Show proper error handling (go to 'pre-match' instead of 'squad-complete' on failure)
  3. Handle "already completed" runs by going to home screen

- Fixed draft 400 error handling in `assignToSlot()`:
  1. "Slot already filled" errors → keep optimistic update (DB already has it)
  2. "Player already drafted" / "cannot fill position" errors → revert the optimistic update
  3. Added `lastDraftError` state for UI feedback

Stage Summary:
- Season simulation now works correctly
- Root cause was data desync between frontend optimistic updates and DB
- Added robust sync mechanism before simulation
- Improved error handling throughout the simulation flow

---

## Priority Recommendations for Next Phase

1. **UI фиксы по запросу пользователя** — Убрать "Современная", убрать "Дополнительные настройки", исправить наложение элементов
2. **Скрапинг данных** — Добавить больше клубов и игроков (цель: 5000+ игроков, 16+ клубов)
3. **Деплой** — Настроить Vercel деплой с Supabase
4. **Полный E2E тест** — Протестировать весь игровой цикл вручную
