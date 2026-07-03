# Task 4: Homepage Updater

## Summary
Updated `/home/z/my-project/src/app/page.tsx` with the following changes:

### Changes Made

1. **Hidden Challenges section**: Removed the entire rendering of the "Челленджи" section (the motion.div with CHALLENGES.map and its preceding section divider). The CHALLENGES constant array at the top of the file is preserved for future use.

2. **Replaced Stats Section**: Changed from database stats (clubs, player-seasons, seasons, players) fetched from `/api/stats` to GAME analytics from `profileStats`:
   - "Сыграно сезонов" (totalSeasons)
   - "Всего побед" (totalWins)
   - "Забито голов" (totalGoals)
   - "Титулов" (titles)
   - Removed `appStats` state and the `useEffect` fetch to `/api/stats`

3. **Removed Recent Results section**: Deleted the `RecentResults` function component entirely and removed its rendering (`<RecentResults />`) and the section divider before it.

4. **Updated FAQ rerolls answer**: Changed from "На лёгкой сложности — 3 переброса, на нормальной — 1, на сложной — 0" to "На лёгкой сложности — 3 переброса, на нормальной — 5, на сложной — 1"

5. **Updated STEPS data**: Changed step 1 title from 'Крути колесо' to 'Крути слот' and desc from 'Колесо фортуны выбирает реальный клуб и сезон РПЛ' to 'Слот-машина выбирает реальный клуб и сезон РПЛ'

### Additional Cleanup
- Removed `AnimatePresence` from framer-motion import (no longer used in JSX)
- Lint passes cleanly with no errors
