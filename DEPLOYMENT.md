# Развёртывание 30‑0 на Jino

Production работает на Jino shared hosting: Apache/Phusion Passenger запускает
Next.js standalone, приложение подключается к MySQL через Prisma. Vercel, PM2 и
отдельный VPS проекта `poigraem-bot` в этой схеме не используются.

Актуальные параметры Jino: пользователь `j97915155`, SSH-хост
`925c78adb421.hosting.myjino.ru:22`, каталог приложения
`/home/users/j/j97915155/domains/30-0.xn--p1ai`, Node.js 22 по пути
`/opt/alt/alt-nodejs22/root/usr/bin/node`, MariaDB 10.11 на `localhost:3306`.
DNS A-записи основного домена и wildcard должны указывать на «IP Пользователя»
из технической информации shared-хостинга, а не на отдельный VPS.

## Автодеплой

Каждый push в `main` запускает `.github/workflows/deploy.yml`:

1. ESLint, TypeScript и тесты Telegram-аутентификации.
2. Production-сборку Next.js с MySQL-схемой Prisma.
3. Упаковку standalone-приложения и загрузку на Jino по SSH/SCP.
4. Резервную копию предыдущей сборки, проверку старых идентификаторов
   пользователей и синхронизацию схемы MySQL.
5. Перезапуск Passenger через `tmp/restart.txt`.
6. Проверку `/api/health` и главной страницы извне.

Pull Request выполняет только проверки и сборку. Production меняется только
после попадания коммита в `main`. Повторный ручной запуск доступен через
GitHub Actions → CI/CD Pipeline → Run workflow на ветке `main`.

## GitHub Actions Secrets

В GitHub → Settings → Secrets and variables → Actions должны находиться:

| Secret | Назначение |
|---|---|
| `JINO_HOST` | SSH-хост Jino |
| `JINO_USERNAME` | SSH-пользователь Jino |
| `JINO_SSH_KEY` | приватный deploy-ключ |
| `JINO_SSH_PORT` | SSH-порт |
| `JINO_APP_DIR` | абсолютный каталог домена на Jino |
| `TELEGRAM_BOT_TOKEN` | токен бота для webhook и отправки сообщений, если функция настроена |
| `TELEGRAM_WEBHOOK_SECRET` | проверка входящих обновлений Telegram |

Pipeline передаёт токен бота в закрытом пакете деплоя и регистрирует webhook.
Если оба Telegram-секрета не заданы, существующие серверные значения сохраняются,
но webhook не может быть перенастроен. Секреты нельзя сохранять в git.

## Окружение приложения

В `${JINO_APP_DIR}/.env` обязателен существующий `DATABASE_URL` MySQL. Deployment
сохраняет этот файл между релизами и автоматически добавляет отсутствующие
runtime-переменные без вывода их значений в Actions log:

- `NODE_ENV=production`
- `NEXT_PUBLIC_BASE_URL=https://30-0.xn--p1ai`
- `TELEGRAM_CLIENT_ID=8197702906`
- `TELEGRAM_BOT_USERNAME=RPL30_bot`
- случайные `TELEGRAM_SESSION_SECRET` и `RUN_SESSION_SECRET`
- `ADMIN_SESSION_SECRET` для защищённой сессии админки

Браузерный вход проверяется по официальным JWKS Telegram, а Mini App — по
публичному Ed25519-ключу Telegram. Бот-токен нужен отдельным серверным
функциям (webhook и отправка), но не должен передаваться браузеру.

Для browser login домен `https://30-0.рф` должен быть разрешён в настройках бота
`@RPL30_bot` через BotFather. DNS домена должен вести на Jino-хостинг.

## Безопасная миграция MySQL

Перед `prisma db push` выполняется `scripts/prepare-production-users.cjs`.
Скрипт:

- добавляет отсутствующие колонки старой схемы;
- сохраняет затрагиваемые поля пользователей в закрытом каталоге
  `~/30-0-private-backups/` с ограниченными правами;
- переносит старые `telegramId` в формат `telegram_<id>`;
- не удаляет пользователей и `GameRun`;
- присваивает конфликтующим старым строкам стабильные `legacy_*` ID;
- проверяет отсутствие пустых и повторяющихся `providerId`.

Только после успешной проверки Prisma добавляет уникальный индекс. Если любой
шаг завершается ошибкой, Passenger не перезапускается, а standalone-сборка
откатывается к последней копии.

## Ручная проверка и откат

```bash
curl -fsS https://30-0.xn--p1ai/api/health
curl -I https://30-0.xn--p1ai/
```

Последние три копии приложения хранятся рядом с текущей сборкой как
`standalone-backup-*`. Deployment выполняет автоматический откат при ошибке
миграции или health check. Для ручного отката на Jino:

```bash
cd "$JINO_APP_DIR"
mv .next/standalone .next/standalone-failed
cp -r "$(ls -dt standalone-backup-* | head -1)" .next/standalone
touch tmp/restart.txt
```

## Диагностика

- Actions не подключается по SSH: проверить пять `JINO_*` secrets и доступность
  порта с GitHub-hosted runner.
- `DATABASE_URL is required`: восстановить `${JINO_APP_DIR}/.env`; pipeline
  намеренно не создаёт строку подключения к БД.
- Health check не проходит: посмотреть Passenger error log в панели Jino и
  проверить доступность MySQL.
- Telegram login сообщает, что вход не настроен: проверить `/api/auth/telegram`
  и разрешённый домен бота в BotFather.

## Данные РПЛ

Deployment проверяет и идемпотентно применяет подготовленные снимки FIFA 10,
2010–2018 и 2019–2021 с частным резервным снимком перед обновлением.
Старые генераторные файлы `scripts/data/*.json` не импортируются этой процедурой.
Статус и ограничения наборов описаны в `docs/DATA_QUALITY.md` и материалах
`docs/research/`. Перед ручным импортом нового CSV проверьте предпросмотр в
админке и наличие резервной копии MySQL.
