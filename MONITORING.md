# Мониторинг и наблюдение (Observability)

Документация по системе мониторинга приложения на https://30-0.рф

---

## Health Check Endpoint

### Эндпоинт

```
GET /api/health
```

### Ответ при нормальной работе

```json
{
  "status": "ok",
  "timestamp": "2025-03-04T12:00:00.000Z",
  "uptime": 86400,
  "version": "1.2.0",
  "services": {
    "database": "connected",
    "websocket": "running"
  }
}
```

### Ответ при проблемах

```json
{
  "status": "degraded",
  "timestamp": "2025-03-04T12:00:00.000Z",
  "uptime": 86400,
  "version": "1.2.0",
  "services": {
    "database": "error: connection refused",
    "websocket": "running"
  }
}
```

```json
{
  "status": "error",
  "timestamp": "2025-03-04T12:00:00.000Z",
  "error": "Database unreachable"
}
```

### Коды ответов

| Код | Значение                              |
|-----|---------------------------------------|
| 200 | Все сервисы работают (`status: ok`)   |
| 503 | Один или более сервисов недоступны (`status: degraded` или `status: error`) |

### Использование

```bash
# Простая проверка
curl -f https://30-0.рф/api/health

# Подробная проверка с выводом JSON
curl -s https://30-0.рф/api/health | jq .

# Проверка только статуса БД
curl -s https://30-0.рф/api/health | jq '.services.database'
# Ожидаемый результат: "connected"

# Мониторинг с интервалом
watch -n 30 'curl -s https://30-0.рф/api/health | jq "{status, uptime, services}"'
```

### Реализация эндпоинта

Эндпоинт расположен в `src/app/api/health/route.ts` и проверяет:

1. **Доступность базы данных** — выполняет простой запрос `SELECT 1` через Prisma
2. **Работоспособность процесса** — проверяет `process.uptime()` и использование памяти
3. **WebSocket-сервис** — опционально проверяет доступность мини-сервиса на порту 3003

---

## Yandex.Metrika — События

Все события отправляются через Yandex.Metrika JavaScript API и отслеживаются в отчёте **«Конверсии»** (Цели).

### Список отслеживаемых событий

| # | Имя события (goal)      | Описание                                   | Когда срабатывает                          |
|---|--------------------------|--------------------------------------------|--------------------------------------------|
| 1 | `pageView`              | Просмотр виртуальной страницы (SPA)        | При каждой навигации между экранами        |
| 2 | `userLogin`             | Успешная авторизация                       | Пользователь вошёл через Telegram         |
| 3 | `userLogout`            | Выход из аккаунта                          | Пользователь нажал «Выйти»                |
| 4 | `gameCreate`            | Создание новой игры                        | Игрок создал игровую сессию               |
| 5 | `gameStart`             | Начало игры                                | Все игроки подключились, игра началась     |
| 6 | `gameFinish`            | Завершение игры                            | Игра завершена, показаны результаты        |
| 7 | `gameJoin`              | Подключение к существующей игре            | Игрок присоединился к игре по ссылке       |
| 8 | `gameLeave`             | Выход из игры до завершения                | Игрок покинул игру досрочно                |
| 9 | `roundComplete`         | Завершение раунда                          | Раунд игры завершён                        |
| 10| `shareClick`            | Нажатие кнопки «Поделиться»                | Пользователь нажал «Поделиться»           |
| 11| `shareTelegram`         | Шеринг в Telegram                          | Шеринг выполнен через Telegram             |
| 12| `shareVK`               | Шеринг во ВКонтакте                        | Шеринг выполнен через VK                   |
| 13| `shareLink`             | Копирование ссылки                         | Пользователь скопировал ссылку на игру     |
| 14| `settingsOpen`          | Открытие настроек                          | Пользователь открыл экран настроек         |
| 15| `profileView`           | Просмотр профиля                           | Пользователь открыл свой профиль           |
| 16| `rulesView`             | Просмотр правил игры                       | Пользователь открыл правила                |
| 17| `errorJs`               | JavaScript-ошибка                          | Необработанная ошибка в браузере           |
| 18| `errorApi`              | Ошибка API-запроса                         | API вернул ошибку 4xx/5xx                  |

### Отправка событий — реализация

```typescript
// Отправка цели (goal) в Yandex.Metrika
function reachGoal(goalName: string, params?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(METRIKA_ID, 'reachGoal', goalName, params);
  }
}

// Отправка виртуального просмотра страницы (SPA-навигация)
function trackPageView(url: string) {
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(METRIKA_ID, 'hit', url);
  }
}
```

### Примеры вызовов

```typescript
// Авторизация
reachGoal('userLogin', { method: 'telegram' });

// Создание игры
reachGoal('gameCreate', { maxPlayers: 4, gameType: 'classic' });

// SPA-навигация
trackPageView('/game/lobby');
trackPageView('/game/play');
trackPageView('/game/results');

// Шеринг
reachGoal('shareClick', { target: 'telegram' });
```

---

## Отслеживание ошибок

### JavaScript-ошибки

Все необработанные ошибки автоматически отправляются в Yandex.Metrika:

```typescript
// Глобальный обработчик JS-ошибок
window.addEventListener('error', (event) => {
  if (window.ym) {
    window.ym(METRIKA_ID, 'reachGoal', 'errorJs', {
      message: event.message?.substring(0, 200),
      filename: event.filename?.substring(0, 100),
      lineno: event.lineno,
    });
  }
});
```

### Необработанные Promise-отклонения

```typescript
window.addEventListener('unhandledrejection', (event) => {
  if (window.ym) {
    window.ym(METRIKA_ID, 'reachGoal', 'errorJs', {
      type: 'unhandledRejection',
      message: String(event.reason)?.substring(0, 200),
    });
  }
});
```

### Ошибки API-запросов

```typescript
// Обёртка для fetch с отслеживанием ошибок
async function monitoredFetch(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      reachGoal('errorApi', {
        url: url.substring(0, 100),
        status: response.status,
      });
    }
    return response;
  } catch (error) {
    reachGoal('errorApi', {
      url: url.substring(0, 100),
      status: 0, // Сетевая ошибка
    });
    throw error;
  }
}
```

### Просмотр ошибок в Metrika

1. Зайдите в [Yandex.Metrika](https://metrika.yandex.ru/)
2. Выберите счётчик **30-0.рф**
3. Перейдите в **Отчёты → Конверсии**
4. Найдите цель `errorJs` или `errorApi`
5. Для детального анализа: **Отчёты → Вебвизор** — посмотрите записи сессий с ошибками

---

## Мониторинг аптайма

### Рекомендуемые бесплатные сервисы

#### 1. UptimeRobot (рекомендуется)

- **Бесплатный план**: 50 мониторов, проверка каждые 5 минут
- **Уведомления**: Email, Telegram, Slack, вебхуки
- **Публичная страница статуса**: можно создать

**Настройка:**

1. Зарегистрируйтесь на [uptimerobot.com](https://uptimerobot.com)
2. Нажмите **+ Add New Monitor**
3. Настройки монитора:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: 30-0.рф — Main
   - **URL**: `https://30-0.рф`
   - **Monitoring Interval**: 5 minutes
4. Добавьте второй монитор для API:
   - **Monitor Type**: HTTP(s) — Keyword
   - **Friendly Name**: 30-0.рф — API Health
   - **URL**: `https://30-0.рф/api/health`
   - **Keyword**: `"status":"ok"`
   - **Keyword Case**: Case sensitive
   - **Monitoring Interval**: 5 minutes
5. Настройте уведомления → Telegram

#### 2. Hetrix Tools

- **Бесплатный план**: 15 мониторов, проверка каждую 1 минуту
- **Уведомления**: Email, Telegram, Slack, Discord
- **Чёрные списки IP**: мониторинг RBL

**Настройка:**

1. Зарегистрируйтесь на [hetrixtools.com](https://hetrixtools.com)
2. Добавьте **Uptime Monitor**:
   - **Monitor Name**: 30-0.рф
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://30-0.рф`
   - **Check Interval**: 1 minute
   - **Timeout**: 30 seconds
3. Добавьте монитор для API Health
4. Настройте **Contact Lists** → Telegram

### Настройка Telegram-уведомлений в UptimeRobot

1. Создайте Telegram-бота через @BotFather (или используйте существующего)
2. В UptimeRobot: **My Settings → Alert Contacts → Add Alert Contact**
3. Выберите **Telegram**
4. Следуйте инструкции для привязки бота
5. Назначьте контакт на мониторы

---

## Управление логами

### Логи PM2

#### Просмотр логов

```bash
# Все логи (последние 100 строк)
pm2 logs --lines 100

# Логи только Next.js-приложения
pm2 logs 30-0-app --lines 100

# Логи только WebSocket-сервиса
pm2 logs 30-0-ws --lines 100

# Только ошибки
pm2 logs --err --lines 50

# Только стандартный вывод
pm2 logs --out --lines 50

# Live-стриминг логов (Ctrl+C для выхода)
pm2 logs
```

#### Очистка логов

```bash
# Очистить все логи PM2
pm2 flush

# Очистить логи конкретного процесса
pm2 flush 30-0-app
```

#### Расположение файлов логов

```
/var/log/pm2/
├── 30-0-error.log      # Ошибки Next.js-приложения
├── 30-0-out.log        # Стандартный вывод Next.js
├── 30-0-ws-error.log   # Ошибки WebSocket-сервиса
└── 30-0-ws-out.log     # Стандартный вывод WebSocket
```

### Ротация логов

PM2 имеет встроенный модуль ротации логов:

```bash
# Установка модуля ротации
pm2 install pm2-logrotate

# Настройка
pm2 set pm2-logrotate:max_size 50M          # Максимальный размер файла
pm2 set pm2-logrotate:retain 10             # Количество хранимых файлов
pm2 set pm2-logrotate:compress true         # Gzip-сжатие старых логов
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss  # Формат даты в имени
pm2 set pm2-logrotate:rotateModule true     # Ротировать логи модулей PM2
pm2 set pm2-logrotate:workerInterval 30     # Интервал проверки (секунды)
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # Cron: ежедневно в полночь
```

### Логи Nginx

```bash
# Логи доступа
sudo tail -100 /var/log/nginx/access.log

# Логи ошибок
sudo tail -100 /var/log/nginx/error.log

# Логи конкретного сайта
sudo tail -100 /var/log/nginx/30-0.рф.access.log
sudo tail -100 /var/log/nginx/30-0.рф.error.log

# Live-стриминг
sudo tail -f /var/log/nginx/error.log
```

Ротация логов Nginx настроена автоматически через `logrotate`:

```bash
# Проверка конфигурации ротации
cat /etc/logrotate.d/nginx
```

### Логи MySQL

```bash
# Логи ошибок MySQL
sudo tail -100 /var/log/mysql/error.log

# Медленные запросы (если включено)
sudo tail -100 /var/log/mysql/slow.log

# Включить лог медленных запросов
sudo mysql -e "SET GLOBAL slow_query_log = 'ON';"
sudo mysql -e "SET GLOBAL long_query_time = 2;"  # Запросы дольше 2 сек
```

---

## Настройка алертов

### UptimeRobot — алерты при даунтайме

1. **Создайте Alert Contact** (если ещё не создан):
   - Зайдите в **Dashboard → My Settings → Alert Contacts**
   - Добавьте **Telegram** контакт
   - Следуйте инструкции бота для подтверждения

2. **Привяжите контакт к монитору**:
   - Зайдите в **Dashboard**
   - Нажмите на значок колокольчика рядом с монитором
   - Выберите созданный Telegram-контакт
   - Сохраните

3. **Настройте расписание алертов**:
   - **Notifications**: Send after 1 failure (отправлять после первого сбоя)
   - **Resend**: Every 5 minutes until recovery (повторять каждые 5 минут)
   - **On Recovery**: Send recovery notification (уведомлять о восстановлении)

### Hetrix Tools — алерты

1. **Contact Lists** → **Add New Contact List**
2. Добавьте **Telegram** контакт
3. **Uptime Monitors** → выберите монитор → **Edit** → **Alerts**
4. Выберите Contact List и настройки уведомлений

### Кастомные алерты через Telegram-бота

Можно создать простого бота, который периодически проверяет health check:

```bash
# Создайте скрипт /usr/local/bin/health-monitor.sh
cat > /usr/local/bin/health-monitor.sh << 'EOF'
#!/bin/bash

HEALTH_URL="http://localhost:3000/api/health"
BOT_TOKEN="ВАШ_TELEGRAM_BOT_TOKEN"
CHAT_ID="ВАШ_CHAT_ID"

response=$(curl -s -w "\n%{http_code}" $HEALTH_URL)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" != "200" ]; then
  message="🚨 ВНИМАНИЕ! Health check провалился!
URL: $HEALTH_URL
HTTP-код: $http_code
Ответ: $body
Время: $(date '+%d.%m.%Y %H:%M:%S')"

  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d chat_id="$CHAT_ID" \
    -d text="$message" \
    -d parse_mode="Markdown"
fi
EOF

chmod +x /usr/local/bin/health-monitor.sh

# Добавьте в cron (проверка каждую минуту)
(crontab -l 2>/dev/null; echo "* * * * * /usr/local/bin/health-monitor.sh") | crontab -
```

### Алерты при высокой нагрузке

```bash
# Скрипт проверки нагрузки /usr/local/bin/load-monitor.sh
cat > /usr/local/bin/load-monitor.sh << 'EOF'
#!/bin/bash

BOT_TOKEN="ВАШ_TELEGRAM_BOT_TOKEN"
CHAT_ID="ВАШ_CHAT_ID"

# Проверка загрузки CPU (порог: 80%)
CPU_THRESHOLD=80
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d. -f1)

if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d chat_id="$CHAT_ID" \
    -d text="⚠️ Высокая загрузка CPU: ${CPU_USAGE}%"
fi

# Проверка использования памяти (порог: 85%)
MEM_THRESHOLD=85
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')

if [ "$MEM_USAGE" -gt "$MEM_THRESHOLD" ]; then
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d chat_id="$CHAT_ID" \
    -d text="⚠️ Высокое использование памяти: ${MEM_USAGE}%"
fi

# Проверка свободного места на диске (порог: 90% занято)
DISK_THRESHOLD=90
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d chat_id="$CHAT_ID" \
    -d text="⚠️ Мало места на диске: занято ${DISK_USAGE}%"
fi
EOF

chmod +x /usr/local/bin/load-monitor.sh

# Проверка каждые 5 минут
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/load-monitor.sh") | crontab -
```

---

## Реагирование на инциденты

### Классификация инцидентов

| Уровень | Описание                  | Время реакции | Примеры                          |
|---------|---------------------------|---------------|----------------------------------|
| P1      | Критический (сайт недоступен) | < 15 мин  | Сайт не открывается, база упала  |
| P2      | Высокий (частичная неработоспособность) | < 1 час | API отдаёт 500, авторизация не работает |
| P3      | Средний (ухудшение функциональности) | < 4 часа | Медленная работа, некритичные баги |
| P4      | Низкий (косметические проблемы) | < 24 часа | Опечатка, мелкий UI-баг        |

### Шаги диагностики

#### 1. Сайт недоступен (P1)

```bash
# Шаг 1: Проверьте доступность сервера
ping 123.45.67.89

# Шаг 2: Проверьте SSH-доступ
ssh -p 2222 root@123.45.67.89

# Шаг 3: Проверьте статус сервисов
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql

# Шаг 4: Проверьте логи
pm2 logs --lines 50 --err
sudo tail -50 /var/log/nginx/error.log

# Шаг 5: Проверьте ресурсы
free -h
df -h
top -bn1 | head -20
```

#### 2. API возвращает ошибки (P1/P2)

```bash
# Проверьте health check
curl -s https://30-0.рф/api/health | jq .

# Если БД недоступна
sudo systemctl status mysql
sudo systemctl start mysql  # если остановлена

# Проверьте подключение к БД вручную
mysql -u game_user -p -e "SELECT 1"

# Перезапустите приложение
pm2 restart all

# Проверьте после перезапуска
curl -s https://30-0.рф/api/health | jq .
```

#### 3. WebSocket не работает (P2)

```bash
# Проверьте статус WS-сервиса
pm2 status 30-0-ws

# Перезапустите
pm2 restart 30-0-ws

# Проверьте логи
pm2 logs 30-0-ws --lines 30

# Проверьте порт
curl -s http://localhost:3003/socket.io/?EIO=4&transport=polling
# Должен вернуть что-то вроде: 0{"sid":"...","upgrades":["websocket"],...}
```

#### 4. Высокая нагрузка (P2/P3)

```bash
# Определите причину нагрузки
top -bn1 | head -20

# Проверьте количество процессов Node.js
ps aux | grep node | wc -l

# Проверьте количество соединений с MySQL
mysql -u game_user -p -e "SHOW PROCESSLIST;"

# Проверьте количество соединений с Nginx
ss -tunlp | grep :443 | wc -l

# При необходимости перезапустите
pm2 restart all
```

#### 5. Утечка памяти (P3)

```bash
# Проверьте использование памяти процессами
pm2 monit

# Подробная информация о процессе
pm2 describe 30-0-app

# Если память превышает лимит — перезапустите
pm2 restart 30-0-app

# Для долгосрочного решения увеличьте лимит в ecosystem.config.js:
# max_memory_restart: '1G'
```

### Процедура реагирования

```
1. Обнаружение
   └── Алерт от UptimeRobot / Hetrix / Telegram
       └── Или жалоба пользователя

2. Диагностика (5-15 минут)
   └── Проверить health check
   └── Проверить логи PM2
   └── Проверить логи Nginx
   └── Проверить ресурсы сервера

3. Восстановление
   └── Перезапуск PM2 (если приложение упало)
   └── Перезапуск Nginx (если прокси упал)
   └── Перезапуск MySQL (если база упала)
   └── Откат Git (если проблема в коде)

4. Верификация
   └── curl https://30-0.рф/api/health
   └── Открыть сайт в браузере
   └── Протестировать критический путь (авторизация → игра)

5. Постмортем (в течение 24 часов)
   └── Записать: что случилось, почему, как исправили
   └── Создать задачу на предотвращение
   └── Обновить мониторинг если нужно
```

### Шаблон постмортема

```markdown
## Постмортем: [Краткое описание]

**Дата инцидента:** DD.MM.YYYY HH:MM
**Длительность:** X часов Y минут
**Уровень:** P1/P2/P3
**Влияние:** [сколько пользователей затронуто]

### Что случилось
[Описание инцидента]

### Причина
[Корневая причина]

### Как исправили
[Действия по восстановлению]

### Как предотвратить
[Меры по предотвращению повторения]

### Действия
- [ ] Задача 1
- [ ] Задача 2
```

---

## Быстрые команды-шпаргалка

```bash
# === Статус ===
pm2 status                                    # Статус процессов
pm2 describe 30-0-app                        # Детали приложения
pm2 monit                                    # Мониторинг в реальном времени

# === Логи ===
pm2 logs --lines 100                         # Последние 100 строк логов
pm2 logs --err                               # Только ошибки
pm2 logs 30-0-ws --lines 50                  # Логи WebSocket-сервиса
pm2 flush                                    # Очистить логи

# === Рестарт ===
pm2 restart all                              # Перезапустить всё
pm2 restart 30-0-app                         # Перезапустить приложение
pm2 reload all                               # Мягкий перезапуск (zero-downtime)

# === Health Check ===
curl -s https://30-0.рф/api/health | jq .   # Проверка здоровья
curl -s http://localhost:3000/api/health     # Локальная проверка

# === Сервисы ===
sudo systemctl status nginx                  # Статус Nginx
sudo systemctl restart nginx                 # Перезапуск Nginx
sudo systemctl status mysql                  # Статус MySQL
sudo systemctl restart mysql                 # Перезапуск MySQL

# === Ресурсы ===
free -h                                      # Память
df -h                                        # Диск
top -bn1 | head -20                          # CPU и процессы

# === База данных ===
mysql -u game_user -p -e "SHOW PROCESSLIST;" # Активные соединения
mysqldump -u game_user -p game_db > backup.sql # Бэкап
```
