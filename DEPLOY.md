# 🏟️ 30-0 RPL — Деплой

## Архитектура

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vercel     │────▶│  Next.js App │────▶│  Supabase   │
│   (CDN/Edge) │     │  (SSR/API)   │     │  (PostgreSQL)│
└─────────────┘     └──────────────┘     └─────────────┘
```

## Варианты деплоя

### 1. Vercel + Supabase (рекомендуется)

**Supabase** — бесплатный PostgreSQL-хостинг с пулингом соединений.

#### Шаг 1: Создать проект Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Запишите `Project Ref`, `Password`, `Region`

#### Шаг 2: Получить connection strings

В Supabase Dashboard → Settings → Database:

- **DATABASE_URL** (pooled, через PgBouncer):
  ```
  postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
- **DIRECT_URL** (direct, для миграций):
  ```
  postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
  ```

#### Шаг 3: Настроить Vercel

```bash
# Установить Vercel CLI
npm i -g vercel

# Логин
vercel login

# Привязать проект
vercel link

# Добавить переменные окружения
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production

# Задеплоить
vercel --prod
```

Или через Vercel Dashboard:
1. Import Git Repository
2. Framework Preset: Next.js
3. Build Command: `cp prisma/schema.postgresql.prisma prisma/schema.prisma && npx prisma generate && next build`
4. Add Environment Variables: `DATABASE_URL`, `DIRECT_URL`

#### Шаг 4: Применить миграции и сидировать

```bash
# Установить переменные окружения локально
export DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
export DIRECT_URL="$DATABASE_URL"

# Применить миграции
npx prisma migrate deploy

# Сидировать данные (5000+ игроков)
bun run db:seed
```

---

### 2. Docker Compose (свой сервер)

#### Локальная разработка с PostgreSQL:

```bash
# Запустить PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Применить схему
bun run schema:postgres
bun run db:push

# Сидировать данные
bun run db:seed

# Запустить dev-сервер
bun run dev
```

#### Продакшн деплой:

```bash
# Настроить .env.production
cp .env.production.example .env.production
# Отредактировать .env.production с вашими данными

# Запустить все сервисы
docker compose up -d

# Применить миграции
docker compose exec app npx prisma migrate deploy

# Сидировать данные
docker compose exec app bun run db:seed

# Проверить
curl http://localhost:3000/api/formations
```

---

### 3. Локальная разработка (SQLite)

Для быстрой локальной разработки без Docker:

```bash
# Использовать SQLite-схему
bun run schema:sqlite

# Применить схему
bun run db:push

# Сидировать данные
bun run db:seed

# Запустить dev-сервер
bun run dev
```

---

## Переменные окружения

| Переменная | Описание | Обязательная |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) | ✅ |
| `DIRECT_URL` | PostgreSQL connection string (direct) | ✅ для миграций |
| `NEXTAUTH_URL` | URL сайта (для аутентификации) | ❌ |
| `NEXTAUTH_SECRET` | Секретный ключ NextAuth | ❌ |

---

## Полезные команды

```bash
# Переключить схему на SQLite (для локальной разработки)
bun run schema:sqlite

# Переключить схему на PostgreSQL (для продакшена)
bun run schema:postgres

# Prisma Studio — визуальный редактор БД
bun run db:studio

# Сбросить базу данных
bun run db:reset

# Создать новую миграцию
npx prisma migrate dev --name description

# Применить миграции на продакшене
npx prisma migrate deploy
```

---

## Структура файлов деплоя

```
30-0-rpl/
├── prisma/
│   ├── schema.prisma              # Активная схема (SQLite или PostgreSQL)
│   ├── schema.sqlite.prisma       # SQLite схема для локальной разработки
│   ├── schema.postgresql.prisma   # PostgreSQL схема для продакшена
│   ├── seed.ts                    # Сид-данные (5000+ игроков РПЛ)
│   └── migrations/                # PostgreSQL миграции
├── supabase/
│   └── config.toml                # Конфигурация Supabase
├── scripts/
│   └── deploy.sh                  # Скрипт деплоя
├── Dockerfile                     # Multi-stage Docker build
├── docker-compose.yml             # Продакшн: App + PostgreSQL + pgAdmin
├── docker-compose.dev.yml         # Разработка: только PostgreSQL
├── vercel.json                    # Конфигурация Vercel
├── .env                           # Локальные переменные (gitignored)
├── .env.example                   # Шаблон переменных
├── .env.production                # Продакшн переменные (gitignored)
└── next.config.ts                 # Конфигурация Next.js
```
