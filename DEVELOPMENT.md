# Локальная разработка

Актуализировано 1 октября 2026 года. Требуются Node.js 22+, npm и Git.

```bash
git clone https://github.com/kr1sanov/30-0.git
cd 30-0
npm ci
cp .env.example .env
npm run schema:sqlite
npm run db:push
npm run db:seed
npm run dev
```

Откройте <http://localhost:3000>. Не добавляйте `.env` или токены в git. В `.env.example` перечислены доступные параметры; для локального SQLite используется `DATABASE_URL="file:./local.db"`. Telegram OAuth, бот и защищённые операции требуют соответствующих секретов и настроек домена, но не нужны для проверки общедоступного игрового интерфейса.

## Проверка

```bash
npm run lint
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.ts
npm run build
```

Production CI перед сборкой переключается на `prisma/schema.mysql.prisma`; локальный `npm run schema:sqlite` меняет рабочий `prisma/schema.prisma`, поэтому перед проверкой изменений в Git убедитесь, что не коммитите случайное переключение схемы. Запуск `npm run db:reset` удаляет локальные данные. Не направляйте команды синхронизации схемы на production БД.

`npm run data:audit` анализирует старые JSON-кандидаты из `scripts/data`; `npm run data:audit:strict` специально отклоняет записи без источника или с недостаточным составом. Это **не** оценка импортированных в production карточек 2019–2021. Их ограничения изложены в [отчёте](docs/research/rpl-2019-2021/README.md).

Для импорта новых составов используйте предпросмотр CSV в админке, а не автоматическую генерацию игроков. Архитектура и механики: [ARCHITECTURE.md](ARCHITECTURE.md). Развёртывание: [DEPLOYMENT.md](DEPLOYMENT.md). Состояние проекта: [PROJECT_STATUS.md](PROJECT_STATUS.md).
