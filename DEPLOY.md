# 🚀 Деплой 30-0 RPL

Руководство по развёртыванию Telegram Mini App «30-0» на продакшн.

## Системные требования

- **Node.js** 20+ (рекомендуется 22)
- **ОС**: Linux (Ubuntu 22.04+ / Debian 12+ / Alpine)
- **RAM**: минимум 512 МБ
- **Диск**: минимум 2 ГБ
- **MySQL** 5.7+ / 8.0 (или Docker)

---

## Вариант 1: Docker (рекомендуется)

### 1. Подготовка

```bash
# Клонируем репозиторий
git clone https://github.com/kr1sanov/30-0.git
cd 30-0

# Создаём .env.production
cp .env.production.example .env.production
nano .env.production  # Заполняем значения
```

### 2. Запуск

```bash
# Быстрый старт через скрипт
./deploy.sh

# Или вручную
docker build -t 30-0-app .
docker compose up -d
```

### 3. Первичная инициализация БД

При первом запуске нужно создать таблицы и загрузить данные:

```bash
# Через docker compose (одноразовый контейнер)
docker compose run --rm migrate

# Или вручную
docker exec -it 30-0-app sh
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Полезные команды

```bash
docker compose logs -f app     # Логи
docker compose restart         # Рестарт
docker compose down            # Остановка
docker compose up -d --build   # Пересборка и запуск
```

---

## Вариант 2: Джино (Jino) — прямая установка

### Что нужно проверить

1. ✅ **Поддержка веб-приложений** (83 ₽/мес) — для запуска Node.js
2. ✅ **MySQL** — база уже создана на хостинге
3. ⚠️ **SSH доступ** — нужен для управления приложением
4. ⚠️ **Порт 3000** — убедитесь, что можно слушать этот порт

### Шаги

1. Зайдите по SSH на сервер Джино
2. Установите Node.js 22:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
3. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/kr1sanov/30-0.git
   cd 30-0
   ```
4. Установите зависимости и соберите:
   ```bash
   npm install

   # Переключаемся на MySQL-схему
   cp prisma/schema.mysql.prisma prisma/schema.prisma
   npx prisma generate

   # Создаём таблицы
   DATABASE_URL="mysql://j97915155:ArT2r6hyy@localhost:3306/j97915155" npx prisma db push

   # Загружаем данные игроков РПЛ
   DATABASE_URL="mysql://j97915155:ArT2r6hyy@localhost:3306/j97915155" npx tsx prisma/seed.ts

   # Билдим
   NODE_ENV=production npm run build
   ```
5. Запустите через PM2:
   ```bash
   npm install -g pm2

   DATABASE_URL="mysql://j97915155:ArT2r6hyy@localhost:3306/j97915155" \
     TELEGRAM_BOT_TOKEN="ваш_токен" \
     NODE_ENV=production \
     pm2 start .next/standalone/server.js --name 30-0-app

   pm2 save
   pm2 startup
   ```

---

## Вариант 3: VPS (Timeweb, Selectel и т.д.)

```bash
# Клонируем
git clone https://github.com/kr1sanov/30-0.git
cd 30-0

# Устанавливаем
npm install
cp prisma/schema.mysql.prisma prisma/schema.prisma
npx prisma generate

# Настраиваем .env.production
cp .env.production.example .env.production
nano .env.production

# Билдим и запускаем
NODE_ENV=production npm run build

# MySQL на том же сервере? Используем localhost:
# DATABASE_URL=mysql://user:pass@localhost:3306/dbname

# Инициализируем БД
npx prisma db push
npx tsx prisma/seed.ts

# Запуск через PM2
pm2 start .next/standalone/server.js --name 30-0-app
pm2 save && pm2 startup
```

---

## Переменные окружения

| Переменная | Обязательно | Описание |
|---|---|---|
| `DATABASE_URL` | ✅ | MySQL подключение, например `mysql://j97915155:ArT2r6hyy@localhost:3306/j97915155` |
| `TELEGRAM_BOT_TOKEN` | ✅ | Токен бота от @BotFather |
| `NEXT_TELEMETRY_DISABLED` | ❌ | Установите `1` для отключения телеметрии |
| `NODE_ENV` | ❌ | Установите `production` |

---

## Настройка Telegram Bot

После деплоя обновите URL Mini App в @BotFather:

1. Откройте @BotFather
2. Выберите вашего бота (`@RPL30_bot`)
3. `/myapps` → выберите «30-0»
4. Обновите URL на: `https://your-domain.com`

---

## Мониторинг

```bash
# Здоровье приложения
curl http://localhost:3000/

# Логи PM2
pm2 logs 30-0-app

# Логи Docker
docker compose logs -f app

# Использование ресурсов
pm2 monit    # для PM2
docker stats  # для Docker
```

---

## Обновление

```bash
cd 30-0
git pull origin main

# Docker
docker compose up -d --build

# PM2
npm install
cp prisma/schema.mysql.prisma prisma/schema.prisma
npx prisma generate
NODE_ENV=production npm run build
pm2 restart 30-0-app
```

---

## Бэкапы MySQL

```bash
# Создать бэкап
mysqldump -u j97915155 -p j97915155 > backup-$(date +%Y%m%d).sql

# Восстановить
mysql -u j97915155 -p j97915155 < backup-20250101.sql
```

---

## Структура схем Prisma

| Файл | БД | Когда использовать |
|------|----|----|
| `schema.sqlite.prisma` | SQLite | Локальная разработка, простой деплой без MySQL |
| `schema.mysql.prisma` | MySQL | Продакшн на Джино, VPS с MySQL |
| `schema.postgresql.prisma` | PostgreSQL | Облачные БД (Supabase, VK Cloud) |

Активная схема: `cp prisma/schema.<db>.prrisma prisma/schema.prisma && npx prisma generate`
