# Локальная разработка

Актуализировано 22 октября 2026. CI использует **Node.js 22**; аудит также прошёл на Node.js 24.19.0. Зависимости устанавливаются из lockfile через `npm ci`.

## Запуск

```bash
git clone https://github.com/kr1sanov/30-0.git
cd 30-0
npm ci
cp .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

Рабочая схема в репозитории — SQLite; `.env.example` задаёт `file:./local.db`. Откройте <http://localhost:3000>. Если ранее переключали провайдер, `npm run schema:sqlite` копирует SQLite-вариант в `prisma/schema.prisma` и перегенерирует клиент. Не коммитьте случайное переключение провайдера.

Пустая БД даёт интерфейс, но не историческую игровую базу. Старый `db:seed` не заменяет актуальные проверенные источники. Импорт сначала выполняется без `--apply`:

```bash
node scripts/import-rpl-2006-2009.mjs
node scripts/import-rpl-2010-2018.mjs
node scripts/import-rpl-2019-2021.mjs
node scripts/import-rpl-2022-2025.mjs
```

Для записи в **локальную** БД используйте соответствующий импортёр с `--apply --backup=/absolute/private/path/unique-backup.json` и загруженным локальным `DATABASE_URL`. Каждый путь должен быть новым. Не публикуйте резервные копии. [Ограничения источников](docs/DATA_QUALITY.md).

Для запуска новой игры требуется Telegram-вход. Без настроенного провайдера можно изучать общедоступные страницы; локальная подмена личности не является production-механизмом входа. Секреты генерируйте отдельно для каждого окружения, например `openssl rand -hex 32`, и храните вне git.

## Проверки качества

```bash
npm run lint
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.ts tests/*.test.mjs
npm run build
npm audit --omit=dev
```

MySQL и PostgreSQL проверяйте явно через `npx prisma validate --schema prisma/schema.mysql.prisma` и `prisma/schema.postgresql.prisma`, задав фиктивные валидные строки подключения. Валидация схемы не проверяет реальную миграцию или соединение с сервером БД.

## Изолированные интеграционные сценарии

Сценарий **удаляет тестовые записи в переданной БД**. Он разрешает только локальный сервер и имя БД с `30-0-regression`. Никогда не используйте production URL. Сначала создайте отдельный SQLite-файл и схему:

```bash
export DATABASE_URL='file:/tmp/30-0-regression-local.db'
node -e "require('node:fs').closeSync(require('node:fs').openSync('/tmp/30-0-regression-local.db', 'a'))"
npx prisma db push
export TELEGRAM_SESSION_SECRET="$(openssl rand -hex 32)"
export ADMIN_SESSION_SECRET="$(openssl rand -hex 32)"
export TELEGRAM_SERVERLESS_BRIDGE_SECRET="$(openssl rand -hex 32)"
npm run build
node tests/integration/project-regressions.mjs
```

Тест запускает локальный standalone-сервер на `127.0.0.1:3400` и использует собственные фикстуры. Не задавайте реальные Telegram-токены: сетевую доставку этот сценарий не подтверждает. Для обычной разработки откройте новый shell или восстановите `DATABASE_URL` локальной рабочей базы.

Покрытие: права, драфт и продолжение, исторические соперники, статистика, мультиплеер и технические поражения, архив, очередь и отмена доставки, редактор игроков, копирование карточек, объединение дублей, модерация и пользовательские челленджи.

## Работа с данными и изменениями

Игрок редактируется как личность; рейтинг и позиции — в сезонной карточке. Перед объединением проверьте клубы, годы и имена: совпадающая фамилия не доказывает дубль. Состав можно дополнять поиском, новыми или скопированными карточками. CSV-импорт в админке закрыт.

`npm run data:audit:strict` проверяет **старые JSON-кандидаты** из `scripts/data`, а не текущую production-базу. Его 40 ошибок на дату аудита не следует приписывать новым импортёрам.

Перед PR проверьте diff на секреты, дампы, случайную смену схемы и тестовые файлы. Для API проверяйте права сервера, для результатов — сохранение истории, для имени — RU/EN, для layout — узкий экран и reduced motion. Изменения сверяйте с [актуальным аудитом](docs/audits/2026-10-22.md).
