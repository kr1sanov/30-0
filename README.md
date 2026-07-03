# ⚽ 30-0 RPL — Футбольный драфт-симулятор

<p align="center">
  <strong>Собери величайшую сборную российского футбола всех времён. Добейся идеального сезона 30-0!</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## 🎮 О проекте

**30-0 RPL** — мобильная игра-драфт для Telegram Mini Apps и Web, созданная по образцу вирусного хита [38-0.app](https://38-0.app/) (3.5M+ игроков), но адаптированная под **российский футбольный чемпионат** (Высшая лига / РФПЛ / РПЛ) с 2000 по 2026 год.

### Как играть

1. 🎡 **Крути колесо** — колесо фортуны выбирает реальный клуб и сезон РПЛ
2. 👤 **Выбери игрока** — бери игрока из состава этого клуба в свою команду
3. 🔄 **Собери XI** — повторяй, пока все 11 позиций не будут заполнены
4. 🏆 **Сыграй сезон** — симулируй 30 матчей — сможешь ли добиться 30-0?

---

## ✅ Реализованные возможности

### Игровые режимы
- ⚔️ **Классика** — собери величайшую сборную РПЛ всех времён
- 🏟️ **Один клуб** — собери лучшую сборную из истории одного клуба *(скоро)*
- ⚽ **Ежедневный челлендж** — новая головоломка каждый день *(скоро)*
- 🏆 **Кубок наций** — собери сборную одной нации и выиграй кубок *(скоро)*

### Игровая механика
- 🎡 Анимированное колесо фортуны (Canvas, 14 сегментов, замедление, звук тиков)
- 📋 Выбор игроков с совместимостью позиций
- ⚽ 12 формаций с визуализацией на футбольном поле (4-4-2, 4-3-3, 3-5-2, и др.)
- 🎯 3 уровня сложности (Легко / Нормально / Сложно) с перебросами
- 🧑‍💼 22 российских тренера (слот-машина анимация выбора)
- 🧪 Химия команды (0-100 с визуальным индикатором)
- 📊 Быстрый старт (⚡ — случайные настройки)

### Симуляция и результаты
- 🏟️ Симуляция сезона (30 матчей, реальные результаты, турнирная таблица)
- 📈 Повтор сезона с анимацией матчей
- 🏅 Система достижений (8 трофеев с попапом разблокировки)
- 📱 Профиль со статистикой, трофеями, историей сезонов
- 🏆 Глобальный лидерборд

### UI / UX
- 🌑 Тёмно-зелёная тема в стиле 38-0.app (#0a1a0a, #0d2d0d, #22c55e)
- ✨ Framer Motion анимации на всех экранах
- 🔔 Тост-уведомления (Sonner)
- 📱 Адаптивный мобильный дизайн
- 🎵 Звуковые эффекты (8 типов)
- 🫨 Telegram WebApp SDK (хаптика, шеринг, тема)
- 📲 PWA манифест для установки
- 🔤 Кириллическая поддержка шрифта Geist
- 💾 Zustand persist — сохранение состояния драфта в localStorage

---

## 🛠️ Технологический стек

| Категория | Технология |
|-----------|-----------|
| **Фреймворк** | Next.js 16 (App Router) |
| **Язык** | TypeScript 5 |
| **Стилизация** | Tailwind CSS 4 + shadcn/ui |
| **Анимации** | Framer Motion |
| **Состояние** | Zustand (с persist) |
| **База данных** | Prisma ORM (SQLite — dev, PostgreSQL — prod) |
| **Иконки** | Lucide React |
| **Звук** | Web Audio API |
| **Деплой** | Vercel |

---

## 📁 Структура проекта

```
src/
├── app/
│   ├── page.tsx              # Главная страница + все игровые экраны
│   ├── globals.css           # Глобальные стили, тёмно-зелёная тема
│   ├── layout.tsx            # Root layout
│   └── api/
│       ├── clubs/route.ts    # API клубов РПЛ
│       ├── formations/route.ts # API формаций
│       ├── leaderboard/route.ts # API лидерборда
│       ├── runs/[runId]/route.ts # API игровых сессий
│       └── seasons/route.ts  # API сезонов и игроков
├── components/
│   ├── game/
│   │   ├── GameSetup.tsx     # Настройка драфта (формация, сложность)
│   │   ├── SpinWheel.tsx     # Колесо фортуны (Canvas)
│   │   ├── FormationView.tsx # Визуализация формации на поле
│   │   ├── PlayerList.tsx    # Список игроков для выбора
│   │   ├── SquadStats.tsx    # Статистика состава
│   │   ├── ManagerChoice.tsx # Выбор тренера (слот-машина)
│   │   ├── SimulationResult.tsx # Результаты симуляции сезона
│   │   ├── SeasonAwards.tsx  # Награды сезона
│   │   ├── PreMatchAnalysis.tsx # Предматчевый анализ
│   │   ├── ProfileScreen.tsx # Профиль игрока
│   │   ├── HowToPlayModal.tsx # Модалка «Как играть»
│   │   ├── DraftProgressTracker.tsx # Трекер прогресса драфта
│   │   └── AchievementUnlocked.tsx # Попап разблокировки достижения
│   ├── layout/
│   │   ├── Header.tsx        # Навигация
│   │   └── Footer.tsx        # Футер
│   └── ui/                   # shadcn/ui компоненты (30+)
├── store/
│   └── gameStore.ts          # Zustand store с persistence
├── lib/
│   ├── positions.ts          # Позиции, формации, совместимость
│   ├── types.ts              # TypeScript типы
│   ├── simulation.ts         # Движок симуляции матчей
│   └── db.ts                 # Prisma клиент
└── prisma/
    ├── schema.prisma         # Текущая схема БД
    ├── schema.sqlite.prisma  # Схема для SQLite (dev)
    ├── schema.postgresql.prisma # Схема для PostgreSQL (prod)
    └── seed.ts               # 5278 записей PlayerSeason
```

---

## 🚀 Запуск локально

### Предварительные требования
- [Bun](https://bun.sh/) или Node.js 18+
- Git

### Установка

```bash
# Клонируйте репозиторий
git clone https://github.com/ВАШ_ЮЗЕРНЕЙМ/30-0-rpl.git
cd 30-0-rpl

# Установите зависимости
bun install

# Настройте базу данных (SQLite для разработки)
bun run db:push

# Заполните базу данными (5278 записей)
bun run db:seed

# Запустите dev-сервер
bun run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

---

## 🌐 Деплой на Vercel

### Через GitHub (рекомендуется)

1. Создайте репозиторий на GitHub и запушьте код
2. Зайдите на [vercel.com/new](https://vercel.com/new)
3. Выберите репозиторий `30-0-rpl`
4. Vercel автоматически определит Next.js
5. Настройки сборки:
   - **Build Command:** `cp prisma/schema.postgresql.prisma prisma/schema.prisma && npx prisma generate && next build`
   - **Install Command:** `npm install`
6. Добавьте Environment Variable: `DATABASE_URL` (PostgreSQL строка подключения)
7. Нажмите **Deploy**

### Через CLI

```bash
vercel login
vercel --prod
```

---

## 🎯 Игровые данные

База содержит **5278 записей** PlayerSeason, охватывающих:
- **~15 клубов** РПЛ (Зенит, Спартак, ЦСКА, Локомотив, Краснодар, и др.)
- **5000+ игроков** с рейтингами по сезонам
- **1992–2026** — полная история российского чемпионата
- **30 матчей** в сезоне для симуляции

---

## 📊 API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/clubs` | Список всех клубов РПЛ |
| `GET` | `/api/formations` | Доступные формации (12 схем) |
| `GET` | `/api/seasons?clubId=X&season=Y` | Игроки клуба в сезоне |
| `GET` | `/api/leaderboard` | Глобальный лидерборд |
| `GET` | `/api/runs/[runId]` | Данные игровой сессии |
| `POST` | `/api/runs` | Создание новой игровой сессии |

---

## 🎨 Дизайн-система

| Элемент | Значение |
|---------|----------|
| Фон | `#0a1a0a` (тёмно-зелёный) |
| Карточки | `#0d2d0d` (зелёный) |
| Акцент | `#22c55e` (ярко-зелёный) |
| Текст | `#e2e8f0` / `#94a3b8` |
| Шрифт | Geist Sans (с кириллицей) |
| Анимации | Framer Motion (fade, slide, scale) |

---

## 📝 Скрипты

```bash
bun run dev          # Dev-сервер (порт 3000)
bun run build        # Production сборка
bun run lint         # ESLint проверка
bun run db:push      # Пуш схемы в БД
bun run db:seed      # Заполнение БД данными
bun run db:studio    # Prisma Studio (GUI для БД)
bun run schema:sqlite   # Переключить на SQLite
bun run schema:postgres # Переключить на PostgreSQL
```

---

## 📜 Лицензия

MIT License — свободное использование, модификация и распространение.

---

<p align="center">
  Сделано с ❤️ для фанатов российского футбола
</p>
