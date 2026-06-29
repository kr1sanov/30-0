'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GameSetup from '@/components/game/GameSetup';
import FormationView from '@/components/game/FormationView';
import SpinWheel from '@/components/game/SpinWheel';
import PlayerList from '@/components/game/PlayerList';
import SquadStats from '@/components/game/SquadStats';
import SimulationResult from '@/components/game/SimulationResult';
import ManagerChoice from '@/components/game/ManagerChoice';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import ProfileScreen from '@/components/game/ProfileScreen';

/* ─── Icon helpers (inline SVGs) ─── */
function RotateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" /><path d="M21 3v9h-9" />
    </svg>
  );
}
function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

/* ─── Step data ─── */
const STEPS = [
  { icon: RotateIcon, title: 'Крути колесо', desc: 'Колесо фортуны выбирает реальный клуб и сезон РПЛ' },
  { icon: UserPlusIcon, title: 'Выбери игрока', desc: 'Бери игрока из состава этого клуба в свою команду' },
  { icon: UsersIcon, title: 'Собери XI', desc: 'Повторяй, пока все 11 позиций не будут заполнены' },
  { icon: TrophyIcon, title: 'Сыграй сезон', desc: 'Симулируй 30 матчей — сможешь ли добиться 30-0?' },
];

const CHALLENGES = [
  { emoji: '🔥', title: '30-0', desc: 'Выиграйте все 30 матчей сезона' },
  { emoji: '🛡️', title: 'Железная защита', desc: 'Пропустите менее 15 голов за сезон' },
  { emoji: '⚡', title: 'Голая атака', desc: 'Забейте 60+ голов за сезон' },
  { emoji: '🎯', title: 'Минималист', desc: 'Соберите состав без перебросов' },
];

const FAQ_ITEMS = [
  { q: 'Что такое 30-0?', a: '30-0 — это футбольный драфт-симулятор РПЛ. Вы крутите колесо, получаете случайный клуб и сезон, выбираете игрока в свой состав, а затем симулируете сезон. Цель — выиграть все 30 матчей и достичь идеального результата 30-0.' },
  { q: 'Как работают позиции?', a: 'У каждого игрока есть основная и дополнительные позиции. Игрок может играть на совместимых позициях без штрафов, на частично совместимых — с понижением рейтинга на 20%, а на несовместимых — не может быть поставлен вообще.' },
  { q: 'Что такое перебросы?', a: 'Перебросы позволяют вам крутить колесо заново, если вам не понравился выпавший клуб. На лёгкой сложности — 3 переброса, на нормальной — 1, на сложной — 0.' },
  { q: 'Как считается рейтинг состава?', a: 'Рейтинг каждого игрока зависит от выбранного режима: сезонный (рейтинг в конкретном сезоне) или прайм (лучший рейтинг за карьеру). Общий рейтинг команды — среднее всех игроков.' },
  { q: 'Сложно ли достичь 30-0?', a: 'Очень сложно! Это требует идеального подбора игроков и немного удачи. Даже с лучшим составом РПЛ есть вероятность неожиданных результатов. Это и делает игру увлекательной!' },
];

/* ─── Home Page ─── */
function HomePage() {
  const { setScreen } = useGameStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="space-y-16 pb-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center justify-center text-center space-y-6 pt-8"
      >
        <div className="relative">
          <h1 className="text-7xl sm:text-9xl font-black text-gradient-green leading-none">
            30-0
          </h1>
          <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 text-3xl sm:text-4xl animate-bounce">
            ⚽
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-[#e2e8f0]">
          Футбольный драфт РПЛ
        </p>
        <p className="text-[#94a3b8] max-w-lg leading-relaxed text-base sm:text-lg">
          Собери состав из игроков Российской Премьер-Лиги, крутя колесо фортуны.
          Заполни все 11 позиций и сыграй сезон — сможешь ли ты добиться 30-0?
        </p>

        <Button
          onClick={() => setScreen('setup')}
          className="h-16 px-14 text-xl font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl shadow-lg shadow-[#22c55e]/25 transition-all hover:shadow-[#22c55e]/40 hover:scale-105 active:scale-95"
        >
          Играть 30-0
        </Button>

        <button
          onClick={() => setShowHowToPlay(true)}
          className="text-sm text-[#94a3b8] hover:text-[#22c55e] transition-colors underline underline-offset-4 decoration-[#94a3b8]/30 hover:decoration-[#22c55e]/50"
        >
          Как играть?
        </button>
      </motion.div>

      {/* How to Play Steps */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="space-y-6"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0]">
          Как играть
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-2xl bg-[#1a1a2e] p-5 text-center border border-[#1a1a2e] card-glow"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#22c55e]/15 flex items-center justify-center">
                <step.icon className="w-6 h-6 text-[#22c55e]" />
              </div>
              <div className="text-xs text-[#22c55e] font-bold mb-1">Шаг {i + 1}</div>
              <div className="text-sm font-bold text-[#e2e8f0] mb-1">{step.title}</div>
              <div className="text-xs text-[#94a3b8] leading-relaxed">{step.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap"
      >
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-black text-[#22c55e]">~15</div>
          <div className="text-xs text-[#94a3b8]">клубов</div>
        </div>
        <div className="w-px h-8 bg-[#1a1a2e]" />
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-black text-[#e2e8f0]">5000+</div>
          <div className="text-xs text-[#94a3b8]">игроков</div>
        </div>
        <div className="w-px h-8 bg-[#1a1a2e]" />
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-black text-[#f97316]">1992-2026</div>
          <div className="text-xs text-[#94a3b8]">сезонов</div>
        </div>
      </motion.div>

      {/* Popular Challenges */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="space-y-6"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0]">
          Челленджи
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {CHALLENGES.map((ch) => (
            <button
              key={ch.title}
              onClick={() => setScreen('setup')}
              className="rounded-2xl bg-[#1a1a2e] p-5 text-left border border-[#1a1a2e] card-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="text-2xl mb-2">{ch.emoji}</div>
              <div className="text-sm font-bold text-[#e2e8f0] mb-1">{ch.title}</div>
              <div className="text-xs text-[#94a3b8]">{ch.desc}</div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* FAQ Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="space-y-4"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-center text-[#e2e8f0]">
          Частые вопросы
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-2xl bg-[#1a1a2e] border border-[#1a1a2e] overflow-hidden px-5 card-glow"
            >
              <AccordionTrigger className="text-sm font-bold text-[#e2e8f0] hover:text-[#22c55e] hover:no-underline py-4">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[#94a3b8] leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>

      <HowToPlayModal open={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}

/* ─── Draft Screen ─── */
function DraftScreen() {
  return (
    <div className="space-y-6 animate-fade-in">
      <FormationView />
      <SpinWheel />
      <PlayerList />
    </div>
  );
}

/* ─── Position Assign Screen ─── */
function PositionAssignScreen() {
  const { selectedPlayer, setScreen, slots } = useGameStore();

  const openCount = slots.filter((s) => !s.playerId).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 rounded-xl bg-[#1a1a2e] p-3 border border-[#22c55e]/20">
        <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-[#e2e8f0]">
            Выберите позицию для <span className="text-[#22c55e] font-bold">{selectedPlayer?.fullName}</span>
          </p>
          <p className="text-xs text-[#94a3b8]">Нажмите на свободную позицию на поле ({openCount} осталось)</p>
        </div>
      </div>
      <FormationView />
    </div>
  );
}

/* ─── Squad Complete Screen ─── */
function SquadCompleteScreen() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-5xl mb-3"
        >
          ✅
        </motion.div>
        <h2 className="text-2xl font-black text-[#e2e8f0]">Состав готов!</h2>
        <p className="text-sm text-[#94a3b8] mt-1">Все 11 позиций заполнены</p>
      </div>

      <FormationView />
      <SquadStats />
      <ManagerChoice />
    </div>
  );
}

/* ─── Simulation Screen ─── */
function SimulationScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="text-6xl"
      >
        ⚽
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-[#e2e8f0]"
      >
        Симуляция сезона...
      </motion.div>
      <div className="text-sm text-[#94a3b8]">30 туров, 16 команд, 1 чемпион</div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Profile Screen ─── (moved to component) */

/* ─── Leaderboard Screen ─── */
function LeaderboardScreen() {
  const { leaderboard, resetGame } = useGameStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#e2e8f0]">Лидерборд</h2>
        <p className="text-sm text-[#94a3b8] mt-1">Лучшие результаты</p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="rounded-2xl bg-[#1a1a2e] p-8 text-center border border-[#1a1a2e]">
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-[#94a3b8]">Пока нет результатов</div>
          <div className="text-xs text-[#94a3b8]/60 mt-1">Сыграйте первый сезон!</div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#1a1a2e] overflow-hidden border border-[#1a1a2e]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#94a3b8] border-b border-[#0a0a0f]">
                  <th className="py-3 px-3 text-left">#</th>
                  <th className="py-3 px-3 text-left">Формация</th>
                  <th className="py-3 px-3 text-center">Сложность</th>
                  <th className="py-3 px-3 text-center">Очки</th>
                  <th className="py-3 px-3 text-center">Место</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr key={entry.id} className="border-b border-[#0a0a0f]/50">
                    <td className="py-3 px-3 text-[#94a3b8]">{idx + 1}</td>
                    <td className="py-3 px-3 font-medium text-[#e2e8f0]">{entry.formation}</td>
                    <td className="py-3 px-3 text-center text-[#94a3b8]">{entry.difficulty}</td>
                    <td className="py-3 px-3 text-center font-bold text-[#22c55e]">{entry.seasonPoints}</td>
                    <td className="py-3 px-3 text-center text-[#e2e8f0]">{entry.seasonPosition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Button
        onClick={resetGame}
        className="w-full h-14 text-lg font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20"
      >
        Играть
      </Button>
    </div>
  );
}

/* ─── Main Home Component ─── */
export default function Home() {
  const { screen } = useGameStore();

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <HomePage />;
      case 'setup':
        return <GameSetup />;
      case 'draft':
        return <DraftScreen />;
      case 'position-assign':
        return <PositionAssignScreen />;
      case 'squad-complete':
        return <SquadCompleteScreen />;
      case 'simulation':
        return <SimulationScreen />;
      case 'result':
        return <SimulationResult />;
      case 'profile':
        return <ProfileScreen />;
      case 'leaderboard':
        return <LeaderboardScreen />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
