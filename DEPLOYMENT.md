# Руководство по развёртыванию

## Обзор

| Параметр        | Значение                        |
|-----------------|---------------------------------|
| Домен           | https://30-0.рф                 |
| Хостинг         | Jino (VPS)                      |
| База данных     | MySQL 8.x                       |
| Runtime         | Node.js 22 LTS                  |
| Менеджер процес.| PM2                             |
| Веб-сервер      | Nginx (обратный прокси)         |
| CI/CD           | GitHub Actions                  |
| Мониторинг      | Yandex.Metrika + uptime-сервисы |

---

## Архитектура

```
┌──────────────────────────────────────────────────────────────────┐
│                        Внешний мир                               │
│                    https://30-0.рф                               │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │  HTTPS (443)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Nginx                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  SSL-терминация (Let's Encrypt)                             │ │
│  │  gzip-сжатие                                                │ │
│  │  Статика → /var/www/30-0.рф/public                         │ │
│  │  Проксирование → http://127.0.0.1:3000                      │ │
│  │  WebSocket → ws://127.0.0.1:3003                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Next.js App    │ │  Mini-service│ │  MySQL           │
│  (port 3000)    │ │  WS (3003)   │ │  (3306)          │
│                 │ │              │ │                  │
│  - SSR/SSG      │ │  - Socket.io │ │  - Игровые данные│
│  - API Routes   │ │  - Real-time │ │  - Пользователи  │
│  - Static       │ │              │ │  - Сессии        │
└────────┬────────┘ └──────────────┘ └──────────────────┘
         │
         │  Prisma ORM
         └──────────────────────────────────────────────►
```

---

## GitHub Actions CI/CD Pipeline

### Схема пайплайна

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
   Ошибка →       Ошибка →       Ошибка →         Ошибка →
   Стоп           Стоп           Откат            Уведомление
```

### Файл `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bunx tsc --noEmit

  build:
    name: Build Application
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .next/

  deploy:
    name: Deploy to Jino
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .next/

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.JINO_HOST }}
          username: ${{ secrets.JINO_USERNAME }}
          key: ${{ secrets.JINO_SSH_KEY }}
          port: ${{ secrets.JINO_SSH_PORT }}
          script: |
            cd ${{ secrets.JINO_APP_DIR }}
            git pull origin main
            bun install --frozen-lockfile
            bun run build
            cd mini-services/chat-service && bun install && cd ../..
            pm2 reload ecosystem.config.js --env production
            sleep 5
            curl -f http://localhost:3000/api/health || exit 1

      - name: Notify Telegram on Failure
        if: failure()
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            ❌ Деплой на 30-0.рф провалился!
            Коммит: ${{ github.sha }}
            Автор: ${{ github.actor }}

  verify:
    name: Verify Deployment
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Health Check
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://30-0.рф/api/health)
          if [ "$STATUS" != "200" ]; then
            echo "❌ Health check failed: HTTP $STATUS"
            exit 1
          fi
          echo "✅ Health check passed"

      - name: Notify Telegram on Success
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            ✅ Деплой на 30-0.рф успешен!
            Коммит: ${{ github.sha }}
```

---

## Обязательные GitHub Secrets

Настройте в **Settings → Secrets and variables → Actions**:

| Secret             | Описание                                    | Пример                        |
|--------------------|---------------------------------------------|-------------------------------|
| `JINO_HOST`        | IP-адрес или хост VPS Jino                  | `123.45.67.89`                |
| `JINO_USERNAME`    | SSH-пользователь на сервере                 | `root`                        |
| `JINO_SSH_KEY`     | Приватный SSH-ключ для подключения          | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `JINO_SSH_PORT`    | SSH-порт (нестандартный для безопасности)   | `2222`                        |
| `JINO_APP_DIR`     | Путь к приложению на сервере                | `/var/www/30-0.рф`            |
| `TELEGRAM_BOT_TOKEN` | Токен бота для уведомлений               | `123456:ABC-DEF...`           |
| `DATABASE_URL`     | Строка подключения к MySQL                  | `mysql://user:pass@localhost:3306/dbname` |

> **Важно:** Никогда не коммитьте значения секретов в репозиторий. Используйте только GitHub Secrets.

---

## Настройка сервера Jino

### 1. Установка Node.js 22

```bash
# Установка Node.js 22 LTS через NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка
node --version  # v22.x.x
npm --version   # 10.x.x
```

### 2. Установка Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### 3. Установка PM2

```bash
sudo npm install -g pm2
pm2 startup
# Выполните команду, которую выведет pm2 startup
```

### 4. Установка и настройка Nginx

```bash
sudo apt install -y nginx
```

Конфигурация `/etc/nginx/sites-available/30-0.рф`:

```nginx
server {
    listen 80;
    server_name 30-0.рф www.30-0.рф;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 30-0.рф www.30-0.рф;

    # SSL-сертификат Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/30-0.рф/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/30-0.рф/privkey.pem;

    # Настройки SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru; connect-src 'self' wss://30-0.рф https://mc.yandex.ru;" always;

    # Gzip-сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    # Статика Next.js
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket (мини-сервис)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Проксирование на Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/30-0.рф /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL-сертификат Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d 30-0.рф -d www.30-0.рф
# Сертификат будет автоматически обновляться через cron/certbot renew
```

### 6. Настройка MySQL

```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Создание базы и пользователя
sudo mysql -e "CREATE DATABASE game_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'game_user'@'localhost' IDENTIFIED BY 'СИЛЬНЫЙ_ПАРОЛЬ';"
sudo mysql -e "GRANT ALL PRIVILEGES ON game_db.* TO 'game_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

---

## Первый деплой

### Пошаговая инструкция

```bash
# 1. Подключитесь к серверу по SSH
ssh -p 2222 root@123.45.67.89

# 2. Создайте директорию проекта
mkdir -p /var/www/30-0.рф
cd /var/www/30-0.рф

# 3. Клонируйте репозиторий
git clone https://github.com/YOUR_ORG/YOUR_REPO.git .

# 4. Установите зависимости
bun install

# 5. Создайте файл окружения
cp .env.example .env
nano .env  # Заполните все переменные

# 6. Примените миграции базы данных
bun run db:push

# 7. Соберите проект
bun run build

# 8. Установите зависимости мини-сервисов
cd mini-services/chat-service && bun install && cd ../..

# 9. Запустите через PM2
pm2 start ecosystem.config.js --env production

# 10. Сохраните конфигурацию PM2
pm2 save

# 11. Проверьте работоспособность
curl -f http://localhost:3000/api/health
```

### Файл `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: '30-0-app',
      script: 'bun',
      args: 'run start',
      cwd: '/var/www/30-0.рф',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/30-0-error.log',
      out_file: '/var/log/pm2/30-0-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: '30-0-ws',
      script: 'bun',
      args: 'run dev',
      cwd: '/var/www/30-0.рф/mini-services/chat-service',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
      max_memory_restart: '256M',
      error_file: '/var/log/pm2/30-0-ws-error.log',
      out_file: '/var/log/pm2/30-0-ws-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
```

---

## Процесс обновления

### Автоматический (push в main)

При каждом пуше в ветку `main` GitHub Actions автоматически:

1. **Lint** — проверяет код линтером и типами
2. **Build** — собирает Next.js-приложение
3. **Deploy** — подключается по SSH, обновляет код, пересобирает, перезапускает PM2
4. **Verify** — проверяет health check и отправляет уведомление в Telegram

### Ручной деплой

```bash
# Подключитесь к серверу
ssh -p 2222 root@123.45.67.89

# Перейдите в директорию проекта
cd /var/www/30-0.рф

# Получите последние изменения
git pull origin main

# Установите зависимости
bun install

# Примените миграции (если есть)
bun run db:push

# Соберите проект
bun run build

# Перезапустите приложение
pm2 reload ecosystem.config.js --env production

# Проверьте
pm2 status
curl -f http://localhost:3000/api/health
```

---

## Процедура отката

### Быстрый откат через Git

```bash
cd /var/www/30-0.рф

# 1. Посмотрите последние коммиты
git log --oneline -10

# 2. Откатитесь к предыдущему рабочему коммиту
git revert HEAD
# или (ОПАСНО — переписывает историю):
# git reset --hard <COMMIT_HASH>

# 3. Пересоберите и перезапустите
bun install
bun run build
pm2 reload ecosystem.config.js --env production

# 4. Проверьте
curl -f http://localhost:3000/api/health
```

### Откат через PM2

```bash
# PM2 не хранит бинарные снапшоты,
# поэтому откат всегда через Git revert/reset

# Если приложение упало и не поднимается:
pm2 stop all
git reset --hard <ПОСЛЕДНИЙ_РАБОЧИЙ_КОММИТ>
bun install
bun run build
pm2 start ecosystem.config.js --env production
```

### Резервное копирование базы данных перед откатом

```bash
# Создайте дамп перед любыми операциями
mysqldump -u game_user -p game_db > /var/backups/game_db_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из дампа
mysql -u game_user -p game_db < /var/backups/game_db_20250101_120000.sql
```

---

## Переменные окружения

Файл `.env` (на сервере `/var/www/30-0.рф/.env`):

```bash
# === Приложение ===
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://30-0.рф
PORT=3000

# === База данных ===
DATABASE_URL=mysql://game_user:СИЛЬНЫЙ_ПАРОЛЬ@localhost:3306/game_db

# === Telegram (уведомления и авторизация) ===
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
NEXT_PUBLIC_TELEGRAM_BOT_NAME=your_game_bot

# === Yandex.Metrika ===
NEXT_PUBLIC_YANDEX_METRIKA_ID=12345678

# === Мини-сервис WebSocket ===
WS_PORT=3003

# === Безопасность ===
NEXTAUTH_SECRET=СЛУЧАЙНАЯ_СТРОКА_32_СИМВОЛА
NEXTAUTH_URL=https://30-0.рф
```

> **Важно:** Файл `.env` добавлен в `.gitignore` и никогда не попадает в репозиторий.

---

## Настройка Telegram-бота

### Создание бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Укажите имя: **30-0 Игра** (или любое другое)
4. Укажите username: **your_game_bot** (должен заканчиваться на `bot`)
5. Скопируйте полученный токен в `TELEGRAM_BOT_TOKEN`

### Настройка Login Widget (авторизация через Telegram)

1. В @BotFather отправьте `/setdomain`
2. Выберите вашего бота
3. Укажите домен: `30-0.рф`

### Настройка уведомлений о деплое

1. Создайте группу или канал для уведомлений
2. Добавьте бота в группу и выдайте права администратора
3. Получите `chat_id` группы:
   ```bash
   # Отправьте сообщение в группу, затем:
   curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates" | jq '.result[-1].message.chat.id'
   ```
4. Добавьте `chat_id` в GitHub Secrets как `TELEGRAM_CHAT_ID`

### Проверка работоспособности

```bash
# Проверка токена
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"

# Отправка тестового сообщения
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d chat_id="CHAT_ID" \
  -d text="✅ Бот настроен правильно!"
```
