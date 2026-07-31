# 🏟️ 30-0 RPL — Project Analysis

> Дата: 2026-08-01 | Версия: 1.1.0 | Аудитор: AI Tech Lead

---

## 1. Обзор проекта

**30-0 RPL** — это Telegram Mini App, футбольный драфт-симулятор, вдохновлённый вирусным хитом [38-0.app](https://38-0.app/) (3.5M+ игроков), адаптированный для **Российской Премьер-Лиги (РПЛ)**. Название отсылает к идеальному результату: 30 побед, 0 поражений в сезоне.

**Суть игры**: Игрок крутит колесо фортуны, которое случайным образом выбирает реальный клуб и сезон РПЛ, затем выбирает игрока из этого состава на одну из 11 позиций формации. После драфта 11 игроков симулируется 30-матчевый сезон.

**Целевая платформа**: Telegram Mini Apps (mobile-first), с браузерным фоллбэком. Весь UI на русском языке.

---

## 2. Технологический стек

| Категория | Технология |
|-----------|-----------|
| **Фреймворк** | Next.js 16 (App Router) |
| **Язык** | TypeScript 5 |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui, Lucide Icons |
| **Анимации** | Framer Motion |
| **Состояние** | Zustand (persist to localStorage) |
| **БД** | Prisma ORM (SQLite dev / PostgreSQL prod / MySQL Jino) |
| **Аналитика** | Яндекс.Метрика (19+ событий) |
| **Платформа** | Telegram WebApp SDK |
| **Шрифты** | Geist / Geist_Mono (с кириллическим подмножеством) |

---

## 3. Архитектура

### Паттерн
- **Single-Page Application (SPA)**: Все экраны игры в одном `page.tsx` (~1500 строк). Навигация через Zustand `gameStore.screen`
- **Client-heavy**: Игра преимущественно клиентская. API-маршруты для персистентности и валидации
- **API-driven persistence**: Каждое действие (spin, draft, undo, swap, simulate) вызывает серверный API
- **Optimistic UI**: Zustand store обновляется мгновенно, затем синхронизируется с API

### Структура директорий
```
src/
├── app/
│   ├── page.tsx              # Главная SPA-страница (все экраны)
│   ├── layout.tsx            # Root layout (шрифты, Метрика, Telegram SDK)
│   ├── globals.css           # Глобальные стили (тёмная тема)
│   └── api/                  # 17+ API-маршрутов
├── components/
│   ├── game/                 # 12 игровых компонентов
│   ├── layout/               # Header, Footer
│   ├── share/                # 3 share-компонента
│   └── ui/                   # shadcn/ui компоненты
├── store/
│   ├── gameStore.ts          # ~1300 строк Zustand store
│   └── authStore.ts          # Telegram auth state
├── hooks/
│   ├── use-telegram.ts       # Telegram WebApp SDK (~700 строк)
│   ├── use-telegram-auth.ts  # Автоматизация авторизации
│   ├── use-sound.ts          # Web Audio API звуки
│   └── use-share.ts          # Share через Telegram + html2canvas
├── lib/
│   ├── db.ts                 # Prisma client singleton
│   ├── simulation.ts         # Движок симуляции сезона (v2)
│   ├── positions.ts          # 15 позиций, 12 формаций, матрица совместимости
│   ├── wheel.ts              # Взвешенный случайный выбор
│   ├── managers.ts           # 60+ российских футбольных тренеров
│   ├── types.ts              # TypeScript типы и конфиги
│   ├── dailyChallenge.ts     # Детерминистический генератор дейликов
│   ├── nationality.ts        # 250+ маппингов национальность → флаг
│   ├── metrics.ts            # Яндекс.Метрика (19+ событий)
│   └── utils.ts              # Утилиты (cn, etc.)
└── prisma/
    └── schema.prisma         # 7 моделей, SQLite/PostgreSQL/MySQL
```

---

## 4. Игровой поток

```
home → setup → draft → [squad-complete] → manager-choice → pre-match → simulation → result → awards
                                                                             ↕
                                                                   profile / leaderboard
```

1. **Home** (`home`): Лендинг с кнопкой "Играть", режимы игры, статистика
2. **Setup** (`setup`): Настройка формации, сложности, режима драфта, эпохи
3. **Draft** (`draft`): Крутить колесо → получить клуб/сезон → выбрать игрока → назначить на позицию
4. **Manager Choice** (`manager-choice`): Слот-машина для выбора тренера (+2 к рейтингу)
5. **Pre-Match** (`pre-match`): Анализ состава, химия, прогноз
6. **Simulation** (`simulation`): 30-матчевая симуляция сезона
7. **Result** (`result`): Итоговая таблица, результаты матчей, трофеи
8. **Awards** (`awards`): Индивидуальные награды игроков

---

## 5. Схема базы данных

```
Club ──1:N──> ClubSeason <──N:1── Season
                    │
                    └──1:N──> PlayerSeason <──N:1── Player

User ──1:N──> GameRun ──1:N──> GameSlot
```

| Модель | Ключевые поля | Назначение |
|--------|--------------|------------|
| **Club** | `nameRu`, `nameEn`, `city`, `logoUrl` | Клубы РПЛ (~15) |
| **Season** | `startYear`, `endYear`, `label` | Сезоны РПЛ (1992-2025) |
| **ClubSeason** | `position`, `points`, `won`, `drawn`, `lost` | Результаты клуба в сезоне |
| **Player** | `fullName`, `lastName`, `nationality` | Уникальные футболисты (~5000+) |
| **PlayerSeason** | `rating`, `primeRating`, `mainPosition` | Статистика игрока в сезоне (~5278) |
| **User** | `telegramId`, `displayName`, `referralCode` | Пользователи Telegram |
| **GameRun** | `formation`, `difficulty`, `completed`, `wins`, `points` | Игровые сессии |
| **GameSlot** | `slotPosition`, `playerSeasonId`, `playerRating` | Позиции в составе |

---

## 6. API Endpoints

| Метод | Endpoint | Назначение |
|-------|----------|------------|
| `POST` | `/api/runs` | Создать новую игровую сессию |
| `POST` | `/api/runs/[runId]/spin` | Крутить колесо → клуб/сезон + игроки |
| `POST` | `/api/runs/[runId]/draft` | Назначить игрока на позицию |
| `POST` | `/api/runs/[runId]/swap` | Поменять игроков местами |
| `POST` | `/api/runs/[runId]/undo` | Убрать игрока с позиции |
| `POST` | `/api/runs/[runId]/reroll` | Перекрутить колесо |
| `POST` | `/api/runs/[runId]/simulate` | Симулировать сезон |
| `GET` | `/api/leaderboard` | Топ-50 завершённых сессий |
| `POST` | `/api/auth/telegram` | Авторизация через Telegram initData |
| `GET` | `/api/health` | Health check с проверкой БД |
| `GET` | `/api/formations` | Все 12 формаций |
| `GET` | `/api/stats` | Глобальная статистика БД |
| `GET` | `/api/daily` | Дейлик (детерминистический по МСК дате) |
| `GET` | `/api/clubs` | Все клубы РПЛ |
| `GET` | `/api/seasons` | Все сезоны |
| `POST` | `/api/users/sync` | Синхронизировать/создать профиль |
| `GET` | `/api/users/profile` | Получить профиль пользователя |
| `GET` | `/api/referrals` | Статистика реферралов |

---

## 7. Интеграция с Telegram

| Функция | Реализация |
|---------|-----------|
| **Авторизация** | `WebApp.initData` → HMAC-SHA256 валидация → user upsert |
| **Haptic Feedback** | `impactOccurred()`, `notificationOccurred()` |
| **Адаптация темы** | `WebApp.themeParams`, `WebApp.colorScheme` |
| **Кнопка "Назад"** | `WebApp.BackButton.show()/hide()/onClick()` |
| **Главная кнопка** | `WebApp.MainButton` для основных действий |
| **Полноэкранный режим** | `WebApp.expand()` |
| **Реферралы** | `start_param` из deep links → отслеживание |
| **Шеринг** | `WebApp.openTelegramLink()` |

---

## 8. Найденные проблемы

### 🔴 Критические
1. **Нет API-аутентификации**: Все API-маршруты публично доступны без middleware. Любой может вызвать `/api/runs/[runId]/simulate` не доказав, что он владелец сессии.
2. **Нет rate limiting**: Эндпоинты spin/draft/simulate без ограничений.

### 🟡 Высокие
3. **CSP позволяет `unsafe-inline` и `unsafe-eval`**: Значительно ослабляет XSS-защиту.
4. **`reactStrictMode: false`**: Отключён в `next.config.ts`, что маскирует тонкие баги.
5. **Нет Error Boundaries**: Если компонент бросает ошибку, всё приложение падает.

### 🟠 Средние
6. **Монолитный `page.tsx`** (~1500 строк): Все экраны в одном компоненте.
7. **Монолитный `gameStore.ts`** (~1300 строк): Всё состояние в одном store.
8. **Дублирование кода spin/reroll**: Маршруты `/spin/` и `/reroll/` на 90% идентичны.
9. **Дублирование FORMATION_LAYOUTS**: Определено в 4 разных файлах с разными координатами.
10. **Дублирование расчёта химии**: В `SquadStats.tsx` и `PreMatchAnalysis.tsx`.

### 🟢 Низкие
11. **`spinWheelWithAnimation` не используется**: В `wheel.ts` — никогда не вызывается.
12. **`profileStatsJson` как строка**: Должен быть JSON-колонка или отдельная таблица.
13. **Нет TypeScript strict mode**: `noImplicitAny` не включён.

---

## 9. Нереализованные функции

| Функция | Статус | Приоритет |
|---------|--------|-----------|
| **"Один клуб" режим** | Упомянут в UI, не реализован | Medium |
| **"Ежедневный челлендж"** | Бэкенд есть, UI "СКОРО" | High |
| **"Кубок наций"** | Упомянут в UI, "СКОРО" | Low |
| **Мультиплеер** | В ROADMAP Phase 4 | Low |
| **Elo рейтинг** | В ROADMAP Phase 4 | Low |
| **`position_first` драфт** | UI есть, логика не отличается | Medium |
| **`januaryTransfer`** | В типах, нет UI-переключателя | Low |
| **`enableManagers`** | В типах, нет UI-переключателя | Low |
| **`clubFilter`** | В модели, нет UI | Low |
| **`teamName`** | В типах, нет UI | Low |
| **`PATCH /api/auth/profile`** | Вызывается из `authStore`, не существует | High |
