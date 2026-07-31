# 🏟️ 30-0 RPL — Roadmap

> Дата: 2026-08-01 | Обновлено после полного аудита

---

## Phase 1 — Безопасность и деплой (1-2 дня) 🔴

> Цель: Продакшн безопасен и доступен

### Задачи
- [ ] 1.1 **Сменить пароль MySQL** — скомпрометирован в git history
- [ ] 1.2 **BFG Repo-Cleaner** — удалить пароль из git history навсегда
- [ ] 1.3 **Добавить API-аутентификацию** — middleware для проверки Telegram initData
- [ ] 1.4 **Добавить rate limiting** — защитить spin/draft/simulate от спама
- [ ] 1.5 **Реализовать `PATCH /api/auth/profile`** — updateDisplayName() не работает
- [ ] 1.6 **Настроить Vercel деплой** — авторизация, подключение, env vars
- [ ] 1.7 **Тестовый деплой** — проверить health endpoint

## Phase 2 — Стабилизация (2-3 дня) 🟡

> Цель: Production-качество, чистота кода

### Задачи
- [ ] 2.1 **Убрать CSP `unsafe-inline`/`unsafe-eval`** — ослабляет XSS-защиту
- [ ] 2.2 **Включить `reactStrictMode: true`** — маскирует баги
- [ ] 2.3 **Добавить Error Boundaries** — обработка ошибок на уровне экранов
- [ ] 2.4 **Синхронизировать PostgreSQL schema** — добавить referral + era поля
- [ ] 2.5 **Удалить неиспользуемые npm-пакеты** — next-themes, react-day-picker, input-otp, cmdk, react-resizable-panels
- [ ] 2.6 **Удалить неиспользуемые shadcn/ui** — ~20 компонентов
- [ ] 2.7 **Включить `noImplicitAny: true`** в tsconfig
- [ ] 2.8 **Выбрать один пакетный менеджер** — удалить bun.lock или package-lock.json

## Phase 3 — Рефакторинг (3-5 дней) 🔵

> Цель: Масштабируемая архитектура, подготовка к новым функциям

### Задачи
- [ ] 3.1 **Разбить page.tsx** на отдельные экраны-компоненты
- [ ] 3.2 **Разбить gameStore** на модули (draftStore, simulationStore, achievementStore, uiStore)
- [ ] 3.3 **Дедупликация spin/reroll** — вынести общую логику
- [ ] 3.4 **Дедупликация FORMATION_LAYOUTS** — единый источник данных
- [ ] 3.5 **Дедупликация расчёта химии** — SquadStats + PreMatchAnalysis
- [ ] 3.6 **Добавить server components** где возможно — метаданные, SEO
- [ ] 3.7 **Добавить loading skeletons** — для всех экранов
- [ ] 3.8 **`profileStatsJson` → JSON-колонка** или отдельная таблица

## Phase 4 — Новые функции (1-2 недели) 🟢

> Цель: Расширение функциональности

### Задачи
- [ ] 4.1 **Реализовать "Ежедневный челлендж"** — бэкенд есть, нужен UI
- [ ] 4.2 **Реализовать "Один клуб" режим** — упоминается в UI
- [ ] 4.3 **Реализовать "Кубок наций" режим** — новая механика
- [ ] 4.4 **Добавить `position_first` драфт** — UI есть, логика не отличается
- [ ] 4.5 **Добавить UI для `januaryTransfer`, `enableManagers`, `clubFilter`, `teamName`**
- [ ] 4.6 **Мультиплеер** — реальное время, WebSocket
- [ ] 4.7 **Elo рейтинг** — рейтинг игроков
- [ ] 4.8 **Push-уведомления** — через Telegram Bot API

---

## ✅ Выполнено (текущая сессия 2026-08-01)

- [x] Исправлен `isJackpot` порог: 87 → 9 (рейтинг 1-10)
- [x] Исправлен `useMemo` → `useEffect` для побочных эффектов
- [x] Исправлен swap без транзакции → `$transaction()`
- [x] Исправлен `<noscript>` вне `<body>` — hydration ошибка
- [x] Удалены пароли из DEPLOY.md, PRODUCTION.md, DEPLOYMENT.md
- [x] Удалены 281 лишних файлов из Git
- [x] Удалены .env, db/custom.db, скриншоты, MCP-файлы из Git
- [x] Полный перевод UI на русский
- [x] Yandex.Metrika Script перемещён внутрь `<body>`
- [x] Полный аудит проекта: архитектура, стек, API, безопасность
- [x] Создана документация: PROJECT_ANALYSIS.md, PROJECT_STATUS.md, TODO.md
