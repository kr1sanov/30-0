# Telegram Mini Apps Audit — 30-0 RPL

Дата: 2026-07-09  
Документация: https://core.telegram.org/bots/webapps

---

## Обзор проекта

**30-0 RPL** — Telegram Mini App, футбольный драфт-симулятор РПЛ.  
Пользователь крутит колесо, выбирает игроков, собирает состав из 11 человек и проходит сезон.

---

## Найденные возможности Telegram Mini Apps SDK

| # | Возможность | Использовалась до аудита | Внедрена | Статус |
|---|-------------|--------------------------|----------|--------|
| 1 | **WebApp.ready()** | ✅ Да | ✅ Да | Инициализация при запуске |
| 2 | **WebApp.expand()** | ✅ Да | ✅ Да | Автоматическое раскрытие |
| 3 | **WebApp.close()** | ❌ Нет | ✅ Да | Доступна через хук |
| 4 | **Init Data / Auth** | ✅ Да | ✅ Да | Авторизация через initData |
| 5 | **MainButton** | ✅ Частично | ✅ Полностью | Полный жизненный цикл + cleanup |
| 6 | **BackButton** | ✅ Частично | ✅ Полностью | Навигация между экранами |
| 7 | **SecondaryButton** | ❌ Нет | ✅ Да | Для кнопки «Поделиться» |
| 8 | **HapticFeedback** | ✅ Частично | ✅ Полностью | impactOccurred + notificationOccurred + selectionChanged |
| 9 | **Closing Confirmation** | ✅ Да | ✅ Да | Включение/выключение по контексту |
| 10 | **Fullscreen API** | ❌ Нет | ✅ Да | При старте игры |
| 11 | **Theme / ColorScheme** | ✅ Частично | ✅ Полностью | Слушатель themeChanged + ре-применение цветов |
| 12 | **Safe Area Insets** | ❌ Нет | ✅ Да | Учёт safe_area_changed |
| 13 | **Content Safe Area** | ❌ Нет | ✅ Да | Учёт content_safe_area_changed |
| 14 | **Viewport** | ❌ Нет | ✅ Да | Слушатель viewportChanged |
| 15 | **showAlert()** | ❌ Нет | ✅ Да | Нативные алерты в Telegram, fallback в браузере |
| 16 | **showConfirm()** | ❌ Нет | ✅ Да | Нативные конфирмы, fallback в браузере |
| 17 | **showPopup()** | ❌ Нет | ✅ Да | Кастомные попапы с кнопками |
| 18 | **openTelegramLink()** | ✅ Да | ✅ Да | Обмен ссылками |
| 19 | **openLink()** | ❌ Нет | ✅ Да | Внешние ссылки |
| 20 | **CloudStorage** | ❌ Нет | ✅ Да | setItem/getItem/getKeys/removeItem + localStorage fallback |
| 21 | **Home Screen API** | ❌ Нет | ✅ Да | addToHomeScreen + checkHomeScreenStatus |
| 22 | **switchInlineQuery()** | ❌ Нет | ✅ Да | Шеринг через inline mode |
| 23 | **Clipboard API** | ❌ Нет | ✅ Да | readTextFromClipboard |
| 24 | **setHeaderColor()** | ✅ Да | ✅ Да | Тёмный заголовок |
| 25 | **setBackgroundColor()** | ✅ Да | ✅ Да | Тёмный фон |
| 26 | **setBottomBarColor()** | ❌ Нет | ✅ Да | Тёмный нижний бар |
| 27 | **Start Parameters** | ✅ Да | ✅ Да | Реферальная система через start_param |
| 28 | **Events system** | ❌ Нет | ✅ Да | onEvent/offEvent для всех типов событий |
| 29 | **Platform detection** | ❌ Нет | ✅ Да | Определение android/ios/desktop |
| 30 | **Version detection** | ❌ Нет | ✅ Да | Проверка версии SDK |

---

## Что уже использовалось до аудита

- `WebApp.ready()` — вызывался при инициализации
- `WebApp.expand()` — автo-раскрытие
- `MainButton` — базовые show/hide/setText/onClick (без cleanup обработчиков)
- `BackButton` — базовые show/hide/onClick (без cleanup)
- `HapticFeedback` — impactOccurred и notificationOccurred (не selectionChanged)
- `enableClosingConfirmation()` — всегда включено, без контекстного управления
- `setHeaderColor('#0A0A0A')` / `setBackgroundColor('#0A0A0A')` — тёмная тема
- `openTelegramLink()` — для шеринга
- Авторизация через `initData` — отправка на сервер для верификации
- `start_param` — для реферальной системы

---

## Что внедрено в ходе аудита

### 1. Полная типизация Telegram WebApp SDK
- Comprehensive TypeScript интерфейсы для всех компонентов SDK
- TelegramUser, Chat, ChatMember, InitDataUnsafe, ThemeParams, SafeAreaInset
- MainButton, SecondaryButton, BackButton с полными API
- HapticFeedback, CloudStorage, BiometricManager, Popup API
- Event types для всех событий

### 2. SecondaryButton
- Полный жизненный цикл: show/hide/setText/onClick
- Cleanup обработчиков при unmount
- Используется для кнопки «Поделиться» на экране результатов

### 3. Fullscreen API
- `requestFullscreen()` при старте игры
- `exitFullscreen()` при завершении
- Обработка событий fullscreen_changed / fullscreen_failed

### 4. Улучшенная HapticFeedback
- `selectionChanged()` — при выборе игрока, формации
- `impactOccurred()` — при ключевых действиях (спин, назначение)
- `notificationOccurred()` — при победе/поражении

### 5. Alerts & Popups
- `showAlert()` — нативные Telegram алерты с браузерным fallback
- `showConfirm()` — нативные конфирмы (используется при перезапуске)
- `showPopup()` — кастомные попапы с кнопками

### 6. Closing Confirmation (контекстное)
- Включается во время игры (draft, simulation)
- Выключается на домашнем экране и в профиле
- Предотвращает случайные выходы во время геймплея

### 7. Theme Handling
- Слушатель `themeChanged` — ре-применение тёмных цветов при смене темы Telegram
- Отслеживание `colorScheme` и `themeParams`

### 8. Safe Area & Viewport
- Отслеживание `safeAreaInset` и `contentSafeAreaInset`
- Слушатели `safeAreaChanged` и `contentSafeAreaChanged`
- Используется в Header для позиционирования кнопки профиля

### 9. CloudStorage
- Полная реализация: setItem/getItem/getKeys/removeItem
- Автоматический fallback на localStorage когда не в Telegram
- Готово для синхронизации профиля между устройствами

### 10. Home Screen API
- `addToHomeScreen()` — добавление на главный экран
- `checkHomeScreenStatus()` — проверка статуса

### 11. Улучшенный BackButton
- Навигация между экранами: Profile → Home, Rules → Home
- Полный cleanup обработчиков

### 12. Улучшенный MainButton
- `updateMainButton()` — обновление текста, цвета, прогресса
- Cleanup обработчиков при unmount

### 13. Share API улучшения
- `switchInlineQuery()` — шеринг через inline mode
- `openLink()` — открытие внешних ссылок
- Интеграция haptic + notify в ShareModal

### 14. Platform & Version Detection
- `platform` — android/ios/tdesktop/webk/webz/macos/web
- `version` — версия Telegram WebApp SDK

### 15. Clipboard API
- `readTextFromClipboard()` — чтение из буфера обмена

### 16. setBottomBarColor()
- Установка тёмного цвета нижнего бара

### 17. Интеграция в компоненты

| Компонент | Что добавлено |
|-----------|---------------|
| `page.tsx` | BackButton навигация, closing confirmation по контексту, fullscreen, safe area |
| `Header.tsx` | Haptic на кнопку профиля, safe area для позиционирования |
| `ShareModal.tsx` | Интеграция с `shareToTelegram()`, haptic + notify |
| `SimulationResult.tsx` | SecondaryButton для шеринга, showConfirm для рестарта, haptic |
| `ProfileScreen.tsx` | Haptic на сохранение имени, notify на шеринг |
| `SpinWheel.tsx` | Haptic на спин и переролл |
| `FormationView.tsx` | Haptic + notify на назначение игрока |
| `PlayerList.tsx` | selectionChanged() на выбор игрока |
| `GameSetup.tsx` | Haptic на старт, selectionChanged() на формацию |
| `ManagerChoice.tsx` | Haptic на спин и выбор менеджера |
| `SeasonAwards.tsx` | Haptic на навигацию |

---

## Что намеренно НЕ внедрено и почему

| Возможность | Причина |
|-------------|---------|
| **BiometricManager** | В приложении нет чувствительных данных, требующих биометрической аутентификации |
| **QR Scanner** | Нет сценария использования QR-кодов в игре |
| **Invoice API / Payments** | Монетизация через Telegram Payments не реализована |
| **sendData()** | Нет необходимости отправлять данные обратно в чат бота |
| **SettingsButton** | Нет экрана настроек |
| **Emoji Status API** | Не релевантно для игрового процесса |
| **Accelerometer / Gyroscope / Device Orientation** | Не используется в геймплее (колесо крутится кнопкой, а не наклоном) |
| **Geolocation** | Нет географических функций в игре |
| **OAuth** | Авторизация уже реализована через initData |
| **Files API / Download API** | Нет файлов для скачивания |
| **Prepared Messages** | Достаточно стандартного шеринга через openTelegramLink |
| **Device Storage** | Уже используем localStorage через Zustand persist и CloudStorage |

---

## Рекомендации на будущее

1. **Монетизация через Invoice API** — когда появятся платные функции (крутые анимации, эксклюзивные формации)
2. **Accelerometer для колеса** — можно использовать гироскоп для «физического» вращения колеса
3. **CloudStorage синхронизация** — перенести хранение профиля из localStorage в CloudStorage для кросс-девайсного опыта
4. **Home Screen промпт** — показать подсказку добавить на главный экран после N сезонов
5. **Prepared Messages** — для автоматической отправки результатов в чат
6. **Emoji Status** — установить эмодзи-статус 🏆 при достижении 30-0
7. **Widget** — когда Telegram добавит виджеты для Mini Apps

---

## Технические детали

### Хук useTelegram()
- Файл: `src/hooks/use-telegram.ts`
- ~985 строк полного TypeScript кода
- Автоинициализация в Telegram контексте
- Graceful fallback когда НЕ в Telegram
- Все кнопки с cleanup обработчиков (refs для offClick)
- Event listeners с cleanup при unmount
- Promise-based API для async операций (CloudStorage, showConfirm, showPopup)

### Совместимость
- Android: полная поддержка
- iOS: полная поддержка
- Desktop (tdesktop): полная поддержка
- Web (webk/webz): частичная (не все API доступны)
- Вне Telegram: fallback на браузерные API (alert, confirm, localStorage)
