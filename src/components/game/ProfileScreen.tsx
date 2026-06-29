'use client';

import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState } from 'react';

const TROPHIES = [
  { id: 'champion', icon: '🏆', name: 'Чемпион', desc: 'Выиграть чемпионат' },
  { id: 'perfect', icon: '✨', name: '30-0', desc: 'Идеальный сезон' },
  { id: 'goal_machine', icon: '⚡', name: 'Голевая машина', desc: '60+ голов за сезон' },
  { id: 'iron_defense', icon: '🧱', name: 'Железная оборона', desc: 'Разница +50' },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Легко',
  normal: 'Нормально',
  hard: 'Сложно',
};

export default function ProfileScreen() {
  const { profileStats, resetGame, setScreen } = useGameStore();
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl mb-2"
        >
          👤
        </motion.div>
        <h2 className="text-xl font-bold text-[#e2e8f0]">Профиль игрока</h2>
        <p className="text-sm text-[#94a3b8] mt-1">История, трофеи и серии</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#1a1a2e] p-5 text-center border border-[#1a1a2e] card-glow">
          <div className="text-3xl font-black text-[#22c55e]">{profileStats.totalSeasons}</div>
          <div className="text-xs text-[#94a3b8]">Сезонов</div>
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-5 text-center border border-[#1a1a2e] card-glow">
          <div className="text-3xl font-black text-[#e2e8f0]">{profileStats.bestPoints}</div>
          <div className="text-xs text-[#94a3b8]">Лучшие очки</div>
          {profileStats.bestRecord !== '0-0-0' && (
            <div className="text-[10px] text-[#94a3b8]/60 mt-0.5">{profileStats.bestRecord}</div>
          )}
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-5 text-center border border-[#1a1a2e] card-glow">
          <div className="text-3xl font-black text-[#f97316]">{profileStats.titles}</div>
          <div className="text-xs text-[#94a3b8]">Титулы</div>
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-5 text-center border border-[#1a1a2e] card-glow">
          <div className="text-3xl font-black text-yellow-400">{profileStats.perfect}</div>
          <div className="text-xs text-[#94a3b8]">30-0 сезоны</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-2xl font-black text-[#3b82f6]">{profileStats.totalWins}</div>
          <div className="text-xs text-[#94a3b8]">Всего побед</div>
        </div>
        <div className="rounded-2xl bg-[#1a1a2e] p-4 text-center border border-[#1a1a2e]">
          <div className="text-2xl font-black text-[#8b5cf6]">{profileStats.totalGoals}</div>
          <div className="text-xs text-[#94a3b8]">Всего голов</div>
        </div>
      </div>

      {/* Favorite Formation */}
      <div className="rounded-2xl bg-[#1a1a2e] p-4 flex items-center justify-between border border-[#1a1a2e]">
        <div>
          <div className="text-xs text-[#94a3b8]">Любимая формация</div>
          <div className="text-lg font-bold text-[#e2e8f0]">{profileStats.favoriteFormation}</div>
        </div>
        <div className="text-3xl">⚽</div>
      </div>

      {/* Trophy Cabinet */}
      <div className="rounded-2xl bg-[#1a1a2e] p-5 border border-[#1a1a2e]">
        <h3 className="text-sm font-bold text-[#e2e8f0] mb-3">🏆 Витрина трофеев</h3>
        <div className="grid grid-cols-2 gap-3">
          {TROPHIES.map((trophy) => {
            const earned = profileStats.achievements.includes(trophy.id);
            return (
              <div
                key={trophy.id}
                className={`rounded-xl p-3 text-center border transition-all ${
                  earned
                    ? 'bg-[#22c55e]/10 border-[#22c55e]/30'
                    : 'bg-[#0a0a0f]/50 border-[#1a1a2e] opacity-50'
                }`}
              >
                <div className={`text-2xl mb-1 ${earned ? '' : 'grayscale'}`}>{trophy.icon}</div>
                <div className={`text-xs font-bold ${earned ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
                  {trophy.name}
                </div>
                <div className="text-[10px] text-[#94a3b8] mt-0.5">{trophy.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {profileStats.history.length > 0 && (
        <div className="rounded-2xl bg-[#1a1a2e] border border-[#1a1a2e] overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#0a0a0f]/30 transition-colors"
          >
            <span className="text-sm font-bold text-[#e2e8f0]">📜 История ({profileStats.history.length})</span>
            <motion.span animate={{ rotate: showHistory ? 180 : 0 }} className="text-[#94a3b8]">
              ▼
            </motion.span>
          </button>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-3 pb-3 max-h-96 overflow-y-auto custom-scrollbar"
            >
              <div className="space-y-2">
                {[...profileStats.history].reverse().map((h) => (
                  <div key={h.id} className="rounded-xl bg-[#0a0a0f]/30 p-3 border border-[#1a1a2e]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#e2e8f0]">
                        {h.formation} · {DIFFICULTY_LABELS[h.difficulty] || h.difficulty}
                      </span>
                      <span className={`text-xs font-bold ${
                        h.position === 1 ? 'text-[#22c55e]' :
                        h.position <= 3 ? 'text-[#3b82f6]' : 'text-[#94a3b8]'
                      }`}>
                        {h.position} место
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#94a3b8]">
                        {h.wins}В {h.draws}Н {h.losses}П
                      </span>
                      <span className="font-bold text-[#e2e8f0]">{h.points} очков</span>
                    </div>
                    {h.managerName && (
                      <div className="text-[10px] text-[#94a3b8]/60 mt-1">
                        👨‍💼 {h.managerName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Action */}
      <Button
        onClick={() => { resetGame(); setScreen('setup'); }}
        className="w-full h-14 text-lg font-bold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl shadow-lg shadow-[#22c55e]/20"
      >
        🎮 Новый сезон
      </Button>
    </div>
  );
}
