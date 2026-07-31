# 🏟️ 30-0 RPL — TODO

> Дата: 2026-07-31 | Приоритет: 🔴 Critical → 🟡 High → 🔵 Medium → 🟢 Low

## 🔴 Critical — блокирует работу

| # | Задача | Сложность | Время | Файл |
|---|--------|-----------|-------|------|
| C1 | Исправить `public_html/.htaccess` на Jino — PassengerAppRoot → корень, StartupFile → app.js | Низкая | 15 мин | `public_html/.htaccess` (на сервере) |
| C2 | Убрать `PassengerEnvVar` из root `.htaccess` — ломает Apache 500 | Низкая | 10 мин | `public/.htaccess` |
| C3 | Синхронизировать PostgreSQL schema — добавить referral + era поля | Средняя | 30 мин | `prisma/schema.postgresql.prisma` |
| C4 | Проверить Prisma client в standalone на Jino — .prisma, @prisma в node_modules | Низкая | 15 мин | На сервере |
| C5 | Проверить .env в standalone на Jino — DATABASE_URL доступен | Низкая | 10 мин | На сервере |

## 🟡 High — безопасность и стабильность

| # | Задача | Сложность | Время | Файл |
|---|--------|-----------|-------|------|
| H1 | Добавить API-аутентификацию — middleware для проверки Telegram initData | Высокая | 4 ч | `src/middleware.ts`, все API routes |
| H2 | Убрать хардкод путей — заменить на env-переменные | Низкая | 30 мин | `ecosystem.config.js`, `deploy-webhook/route.ts` |
| H3 | Настроить Vercel деплой — авторизация, подключение, env vars | Средняя | 1 ч | Vercel dashboard |
| H4 | Обновить .gitignore — добавить agent-ctx, download, upload, *.mcp.mjs | Низкая | 15 мин | `.gitignore` |
| H5 | Включить ESLint правила — no-unused-vars, no-explicit-any | Средняя | 2 ч | `eslint.config.mjs` |
| H6 | Удалить мёртвые компоненты — 5 файлов | Низкая | 15 мин | `src/components/game/` |
| H7 | Удалить неиспользуемые shadcn/ui — ~20 компонентов | Низкая | 30 мин | `src/components/ui/` |
| H8 | Удалить неиспользуемые npm-пакеты — 5 штук | Низкая | 15 мин | `package.json` |

## 🔵 Medium — качество кода

| # | Задача | Сложность | Время | Файл |
|---|--------|-----------|-------|------|
| M1 | Очистить git от dev-артефактов — 263 файла | Низкая | 30 мин | git rm, .gitignore |
| M2 | Выбрать один пакетный менеджер — удалить лишний lock-файл | Низкая | 10 мин | `bun.lock` или `package-lock.json` |
| M3 | Включить `noImplicitAny: true` | Средняя | 2 ч | `tsconfig.json` + все файлы |
| M4 | Дедупликация spin/reroll — вынести общую логику | Средняя | 1 ч | `api/runs/[runId]/spin/`, `reroll/` |
| M5 | Убрать дублирование LeaderboardScreen — использовать компонент | Низкая | 30 мин | `page.tsx`, `LeaderboardScreen.tsx` |
| M6 | Добавить error boundaries | Средняя | 1 ч | `src/app/` |
| M7 | Добавить loading skeletons | Средняя | 2 ч | Все экраны |

## 🟢 Low — оптимизация

| # | Задача | Сложность | Время | Файл |
|---|--------|-----------|-------|------|
| L1 | Рефакторинг page.tsx — разбить на экраны-компоненты | Высокая | 8 ч | `src/app/page.tsx` |
| L2 | Рефакторинг gameStore — разбить на модули | Высокая | 8 ч | `src/store/gameStore.ts` |
| L3 | Добавить server components — метаданные, SEO | Средняя | 4 ч | `src/app/` |
| L4 | Убрать CSP unsafe-eval | Средняя | 2 ч | `next.config.ts` |
| L5 | Вынести Yandex.Metrika ID в env | Низкая | 15 мин | `src/app/layout.tsx` |
| L6 | Вынести Telegram Bot URL в env | Низкая | 15 мин | `src/lib/use-share.ts`, `api/referrals/` |

---

## Сводка по времени

| Приоритет | Количество | Общее время |
|-----------|-----------|-------------|
| 🔴 Critical | 5 | ~1.5 ч |
| 🟡 High | 8 | ~8.5 ч |
| 🔵 Medium | 7 | ~9 ч |
| 🟢 Low | 6 | ~22.5 ч |
| **Итого** | **26** | **~41.5 ч** |
