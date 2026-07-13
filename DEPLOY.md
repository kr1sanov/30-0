# 🚀 Деплой 30-0 RPL

Руководство по развёртыванию Telegram Mini App «30-0» на продакшн.

## Системные требования

- **Node.js** 20+ (рекомендуется 22)
- **ОС**: Linux (Ubuntu 22.04+ / Debian 12+ / Alpine)
- **RAM**: минимум 512 МБ
- **Диск**: минимум 2 ГБ
- **Docker** (опционально, но рекомендуется)

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
docker build -f Dockerfile.sqlite -t 30-0-app .
docker compose -f docker-compose.simple.yml up -d
```

### 3. Первичная инициализация БД

При первом запуске нужно заполнить базу данными игроков РПЛ:

```bash
# Заходим в контейнер
docker exec -it 30-0-app sh

# Применяем схему и загружаем данные
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Полезные команды

```bash
docker compose -f docker-compose.simple.yml logs -f app   # Логи
docker compose -f docker-compose.simple.yml restart        # Рестарт
docker compose -f docker-compose.simple.yml down           # Остановка
```

---

## Вариант 2: Прямой запуск (без Docker)

### 1. Установка зависимостей

```bash
# Клонируем
git clone https://github.com/kr1sanov/30-0.git
cd 30-0

# Устанавливаем зависимости
npm install

# Или через скрипт
./deploy.sh --node
```

### 2. Ручная сборка

```bash
# Переключаемся на SQLite-схему
cp prisma/schema.sqlite.prisma prisma/schema.prisma
npx prisma generate

# Создаём директорию для данных
mkdir -p data

# Билдим
NODE_ENV=production npm run build

# Инициализируем БД
DATABASE_URL="file:$(pwd)/data/production.db" npx prisma db push
DATABASE_URL="file:$(pwd)/data/production.db" npx tsx prisma/seed.ts
```

### 3. Запуск через PM2

```bash
npm install -g pm2

# Запускаем
DATABASE_URL="file:/полный/путь/к/data/production.db" \
  NODE_ENV=production \
  pm2 start .next/standalone/server.js --name 30-0-app

# Автозапуск при перезагрузке
pm2 save
pm2 startup
```

### 4. Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Для HTTPS используйте Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Вариант 3: Джино (Jino)

### Что нужно проверить

1. **Поддержка Node.js** — убедитесь, что опция «Поддержка веб-приложений» (83 ₽/мес) позволяет запускать Node.js как долгоживущий процесс (не CGI)
2. **SSH доступ** — нужен для управления приложением
3. **Порт** — убедитесь, что можно слушать порт 3000 (или другой)
4. **MySQL не нужен** — приложение использует SQLite, можно отключить и сэкономить

### Шаги

1. Создайте контейнер с поддержкой веб-приложений
2. Зайдите по SSH
3. Установите Node.js 22:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
4. Следуйте инструкции из «Вариант 2»

---

## Переменные окружения

| Переменная | Обязательно | Описание |
|---|---|---|
| `DATABASE_URL` | ✅ | Путь к SQLite файлу, например `file:/app/data/production.db` |
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
docker compose -f docker-compose.simple.yml logs -f app

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
docker build -f Dockerfile.sqlite -t 30-0-app .
docker compose -f docker-compose.simple.yml up -d

# PM2
npm install
cp prisma/schema.sqlite.prisma prisma/schema.prisma
npx prisma generate
NODE_ENV=production npm run build
pm2 restart 30-0-app
```

---

## Бэкапы

SQLite — это просто файл. Бэкап:

```bash
# Docker
docker cp 30-0-app:/app/data/production.db ./backup-$(date +%Y%m%d).db

# Прямой запуск
cp data/production.db ./backup-$(date +%Y%m%d).db
```

Восстановление:

```bash
# Docker
docker cp ./backup-20250101.db 30-0-app:/app/data/production.db
docker compose -f docker-compose.simple.yml restart

# Прямой запуск
cp ./backup-20250101.db data/production.db
pm2 restart 30-0-app
```
