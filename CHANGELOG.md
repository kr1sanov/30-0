# 📋 CHANGELOG — 30-0 RPL

Все значимые изменения проекта документируются в этом файле.
Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/).
Версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

---

## [1.1.0] — 2026-03-04

### Added
- **Prisma Schema**: Added `referralCode`, `referredBy`, `referralCount` fields to User model
- **Prisma Schema**: Added `eraStartYear`, `eraEndYear`, `clubFilter` fields to GameRun model
- **CI/CD**: Complete GitHub Actions pipeline — lint → build → deploy → verify
- **CI/CD**: Production deploy script with backup, rollback, and health check
- **CI/CD**: PM2 ecosystem configuration for process management
- **CI/CD**: Automatic deployment on push to main branch
- **Types**: Added `DailyChallenge` and `NationalityRequirement` interfaces
- **Store**: Added `startDailyChallenge`, `setError`, `clearError` actions to gameStore
- **Store**: Added `dailyChallenge` and `error` state to gameStore
- **Config**: Added `scripts/`, `examples/`, `skills/`, `supabase/` to tsconfig exclude
- **Docs**: ARCHITECTURE.md, DEVELOPMENT.md, DEPLOYMENT.md, PRODUCTION.md

### Fixed
- **TypeScript**: Removed `ignoreBuildErrors` from next.config.ts — all TS errors now cause build failure
- **TypeScript**: Fixed DailyChallengeScreen missing types and store methods
- **TypeScript**: Fixed ErrorToast missing store properties (error, clearError)
- **TypeScript**: Fixed Header unreachable code comparison
- **TypeScript**: Fixed referral API routes accessing non-existent Prisma fields
- **TypeScript**: Fixed era API routes accessing non-existent Prisma fields
- **ESLint**: Added eslint-disable for require-imports in legacy JS scripts
- **CI/CD**: Removed `|| echo` bailouts — quality gates now properly fail the pipeline
- **CI/CD**: Removed `DEPLOY_ENABLED` variable requirement — deploy is automatic on main push
- **CI/CD**: Deploy uses build artifacts instead of rebuilding from scratch
- **CI/CD**: Added concurrency group to prevent simultaneous deployments

### Security
- **Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy
- **Config**: `poweredByHeader: false` in Next.js config
- **Config**: Static asset caching (1 year immutable)
- **Schema**: `referralCode` field has `@unique` constraint

---

## [02.07.2026] — Изменения 02.07.2026 - 1

### Главный экран
- **Подзаголовок**: Изменён текст на «Составь символическую сборную лучших **российских** команд всех времен» (было «русских»)
- **Описание**: Удалён текст «Собери состав из игроков Российской Премьер-Лиги, крутя колесо фортуны...»
- **Игровые режимы**: Классика и Один клуб — активны (кликабельны). Ежедневный челлендж и Кубок наций — с бейджем «СКОРО» в правом верхнем углу
- **Блок аналитики**: Только 3 показателя: 16 клубов, 5000+ игроков, 1992-2026 сезонов. Убраны «~15 клубов» и «30 матчей»
- **Последние результаты**: Блок скрыт (закомментирован)
- **Заголовки блоков**: Унифицированы — все крупные белые `text-2xl sm:text-3xl font-black text-[#e2e8f0]` (были: зелёные мелкие uppercase для режимов, челленджей, FAQ)

### Нижний тулбар
- **Табы**: Только 3 — Главная, Играть, Профиль (убраны Лидерборд и Помощь)
- **Кнопка «Играть»**: Центрированная, округлая (`rounded-full`), выделяющаяся с зелёным градиентом и тенью, приподнята вверх (`-mt-5`)
- **Десктоп**: Кнопка «Играть» тоже `rounded-full` вместо `rounded-xl`

---

## [01.07.2026] — Изменения 01.07.2026

### Главный экран
1. ✅ Подзаголовок жирный: «Составь символическую сборную лучших русских команд всех времен»
2. ✅ Кнопка «Играть 30-0» — статичная, внутри шиммер-эффект (не скачет при наведении)
3. ✅ Компактная мобильная адаптация (уменьшены отступы, gap, padding)
4. ✅ Тулбар скрыт на главной, полупрозрачные кнопки Домой/Профиль во время игры
5. ✅ Полупрозрачное футбольное поле на фоне (opacity 0.03)
6. ✅ Ускоренные анимации появления (0.15-0.3s вместо 0.5-0.6s)
7. ✅ Эмодзи ⚽ на фоне с opacity 0.12 (еле заметно)
8. ✅ Кнопка «Продолжить драфт» при возврате на главную во время игры

### Деплой
- Исправлен Git email: `z@container` → `kr1sanov@users.noreply.github.com`
- Убран невалидный регион `hel1` из vercel.json
- Проект привязан к `30-0.app` на Vercel
- Автодеплой с GitHub работает

---

## [Ранее] — MVP Round 6+

### Реализованные возможности
- Полный игровой цикл: Главная → Настройка → Драфт → Симуляция → Результаты
- 12 формаций с визуализацией на футбольном поле
- 3 уровня сложности (Легко/Нормально/Сложно) с перебросами
- Анимированное колесо фортуны (Canvas, 14 сегментов)
- Выбор игроков с совместимостью позиций
- 22 российских тренера (слот-машина анимация)
- Симуляция сезона (30 матчей)
- Профиль со статистикой, трофеями, историей
- Лидерборд
- 5278 записей PlayerSeason в БД
- Тёмно-зелёная тема (#0a1a0a, #0d2d0d, #22c55e)
- Framer Motion анимации
- Telegram WebApp SDK
- PWA манифест
- Звуковые эффекты (8 типов)
