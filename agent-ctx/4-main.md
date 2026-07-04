# Task 4: Full refactor of all game screens to match 38-0.app video reference

## Agent: main

## Changes Made

### 1. FormationView.tsx — Position Legend
- Added colored dots legend below the pitch:
  - 🟠 ВР (Keeper) — #f97316
  - 🔵 Защита (Defence) — #3b82f6
  - 🟢 Полузащита (Midfield) — #22c55e
  - 🔴 Атака (Attack) — #ef4444
  - ⚫ Не может играть (Can't play there) — #64748b
- Each dot has a subtle glow via boxShadow

### 2. page.tsx — DraftScreen
- "Move a player" button: added subtitle "Переместите задрафтованного игрока, чтобы освободить слот"
- Squad Stats Panel: Redesigned with big OVERALL number (3xl/4xl) on the left, category bars on the right
- Added "Начать заново" link below SpinWheel

### 3. SpinWheel.tsx — Complete idle state redesign
- Idle: "КРУТИТЬ СОСТАВ" header + position count + empty Club×Season fields + "Крутить колесо" button + "или нажмите Пробел"
- Spinning: "КРУТИТЬ СОСТАВ" header + reels + spinning indicator
- Result: "СОСТАВ ВЫПАЛ" header + Club×Season result + instruction + reroll/skip buttons
- Added spacebar keyboard shortcut

### 4. GameSetup.tsx — Simplified
- Advanced settings (Draft Mode, Rating Mode, Era Filter, Show Ratings) moved into collapsible section
- Main screen: Formation + Difficulty + "Крутить колесо" start button
- Subtitle changed to "Выберите схему и сложность"

### 5. HomePage — CTA
- Changed "Играть →" to "Играть 30-0 →"

### 6. SimulationResult.tsx — Bug fix
- Removed stale `setIsPlaying(false)` reference

## Lint Status
- Passes with no errors
