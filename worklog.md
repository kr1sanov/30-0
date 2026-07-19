---
Task ID: 1
Agent: Main Agent
Task: Redesign Header and Footer to match 38-0.app reference

Work Log:
- Analyzed reference site 38-0.app using VLM and web-reader tools
- Analyzed 4 uploaded reference screenshots (desktop/mobile header/footer)
- Examined current Header.tsx and Footer.tsx components
- Examined page.tsx, layout.tsx, gameStore.ts, use-telegram.ts hooks
- Redesigned Header.tsx with:
  - Desktop: Logo "30-0" left, nav links center (Home, Play, Multiplayer, How it works, Leaderboard), Account button right
  - Mobile: Logo left, Account icon right, Hamburger menu right
  - Slide-in mobile menu with spring animation (framer-motion)
  - Game screen mode with floating overlay buttons
  - Custom event listener for "open-how-to-play" from Footer
  - Escape key to close menu, body scroll lock when open
  - Proper safe-area handling for Telegram Mini App
- Redesigned Footer.tsx with:
  - Navigation links: Home, Play, Multiplayer (Скоро), How it works, Leaderboard, Story (Скоро), Telegram
  - Social links with icons and text: Telegram, Instagram
  - Description text about the app
  - Legal links: Privacy Policy, Terms of Use
  - Copyright: © 2026 30-0. Все права защищены.
  - Gradient top border (footer-gradient-border)
  - Telegram safe-area bottom padding
- Updated page.tsx: Added Footer import, integrated Footer component, removed old safe-area padding from main
- Tested with agent-browser at: 320px, 375px, 430px, 768px, 1440px
- Tested hamburger menu functionality
- Tested desktop header navigation
- Lint: clean (0 errors)
- Dev server: running without errors

Stage Summary:
- Header fully redesigned with desktop nav, mobile hamburger menu, and game screen overlay modes
- Footer fully redesigned with navigation, social, legal, copyright sections
- All breakpoints tested: 320px, 375px, 430px, 768px, 1440px
- No horizontal scroll, overflow, or layout issues
- Components follow 38-0.app UX patterns while being original implementation
