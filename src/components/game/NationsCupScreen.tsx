'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NationalityData {
  nationality: string;
  flag: string;
  playerCount: number;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const ACCENT = '#00C896';
const BG_PAGE = '#0A0A0A';
const BG_CARD = '#141414';

// ---------------------------------------------------------------------------
// Gradient backgrounds for nationality cards
// ---------------------------------------------------------------------------
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #1a1a1a 0%, #2d1b30 100%)',
  'linear-gradient(135deg, #1a2a1a 0%, #1b302d 100%)',
  'linear-gradient(135deg, #2a1a1a 0%, #302d1b 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #1b2d30 100%)',
  'linear-gradient(135deg, #2a1a2e 0%, #1b3025 100%)',
];

function getGradient(index: number): string {
  return CARD_GRADIENTS[index % CARD_GRADIENTS.length];
}

// ---------------------------------------------------------------------------
// Nationality Card
// ---------------------------------------------------------------------------
function NationalityCard({
  nationality,
  flag,
  playerCount,
  isSelected,
  onClick,
  index,
}: {
  nationality: string;
  flag: string;
  playerCount: number;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.3 }}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      className="relative rounded-xl p-3 text-center transition-all duration-200 border-2 overflow-hidden"
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${ACCENT}20 0%, ${ACCENT}10 100%)`
          : getGradient(index),
        borderColor: isSelected ? ACCENT : '#2a2a2a',
        boxShadow: isSelected ? `0 0 20px ${ACCENT}30` : 'none',
      }}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: ACCENT }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
      {/* Flag */}
      <div
        className="w-12 h-12 rounded-lg mx-auto mb-1.5 flex items-center justify-center text-2xl"
        style={{
          backgroundColor: isSelected ? `${ACCENT}20` : '#1f1f1f',
        }}
      >
        {flag}
      </div>
      {/* Nationality name */}
      <div
        className="text-xs font-bold leading-tight mb-1"
        style={{ color: isSelected ? ACCENT : '#FFFFFF' }}
      >
        {nationality}
      </div>
      {/* Player count */}
      <div className="text-[10px] text-[#9CA3AF]">
        {playerCount} игроков
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl p-3 text-center animate-pulse"
          style={{ backgroundColor: BG_CARD, border: '1px solid #2a2a2a' }}
        >
          <div className="w-12 h-12 rounded-lg mx-auto mb-1.5 bg-[#1f1f1f]" />
          <div className="h-3 bg-[#1f1f1f] rounded mx-auto w-16 mb-1" />
          <div className="h-2 bg-[#1f1f1f] rounded mx-auto w-10" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main NationsCupScreen Component
// ---------------------------------------------------------------------------
export default function NationsCupScreen() {
  const { setConfig, setScreen } = useGameStore();
  const [nationalities, setNationalities] = useState<NationalityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedNationality, setSelectedNationality] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Fetch nationalities
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/nationalities')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data: NationalityData[]) => {
        setNationalities(data);
      })
      .catch((err) => {
        console.error('Failed to load nationalities:', err);
        setError('Не удалось загрузить список наций');
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter nationalities by search
  const filteredNationalities = nationalities.filter((n) =>
    n.nationality.toLowerCase().includes(search.toLowerCase())
  );

  // Handle start
  const handleStart = useCallback(async () => {
    if (!selectedNationality) return;
    setStarting(true);
    setConfig({
      gameMode: 'nations_cup',
      nationalityFilter: selectedNationality,
      clubFilter: undefined,
    });
    // Small delay for visual feedback
    setTimeout(() => {
      setScreen('setup');
      setStarting(false);
    }, 200);
  }, [selectedNationality, setConfig, setScreen]);

  // Get selected nationality data
  const selectedData = nationalities.find((n) => n.nationality === selectedNationality);

  return (
    <div className="space-y-4 pb-6" style={{ background: BG_PAGE }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-4xl mb-2">🏆</div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          Кубок наций
        </h2>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Выберите нацию — все спины будут содержать только игроков этой национальности
        </p>
      </motion.div>

      {/* Selected nationality banner */}
      <AnimatePresence>
        {selectedData && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="rounded-2xl p-4 border-2 overflow-hidden"
            style={{
              backgroundColor: `${ACCENT}10`,
              borderColor: `${ACCENT}40`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">{selectedData.flag}</div>
              <div className="flex-1">
                <div className="text-lg font-bold" style={{ color: ACCENT }}>
                  {selectedData.nationality}
                </div>
                <div className="text-xs text-[#9CA3AF]">
                  {selectedData.playerCount} игроков доступно
                </div>
              </div>
              <Button
                onClick={handleStart}
                disabled={starting}
                className="h-10 px-6 text-sm font-bold rounded-xl"
                style={{
                  backgroundColor: ACCENT,
                  color: '#0A0A0A',
                }}
              >
                {starting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full"
                  />
                ) : (
                  'Начать →'
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск нации..."
          className="w-full h-11 pl-10 pr-4 rounded-xl text-sm font-medium bg-[#141414] border border-[#2a2a2a] text-white placeholder-[#64748b] focus:outline-none focus:border-[#00C896]/50 transition-colors"
        />
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
          <span>
            {filteredNationalities.length} {filteredNationalities.length === 1 ? 'нация' : 'наций'} доступно
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-[#00C896] font-medium hover:underline"
            >
              Сбросить поиск
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="rounded-2xl bg-[#141414] p-8 text-center border border-[#1E1E1E]">
          <div className="text-3xl mb-2">😔</div>
          <div className="text-sm text-[#9CA3AF] mb-3">{error}</div>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-[#00C896]/30 text-[#00C896] hover:bg-[#00C896]/10 hover:text-[#00C896] rounded-xl"
          >
            Попробовать снова
          </Button>
        </div>
      ) : filteredNationalities.length === 0 ? (
        <div className="rounded-2xl bg-[#141414] p-8 text-center border border-[#1E1E1E]">
          <div className="text-3xl mb-2">🔍</div>
          <div className="text-sm text-[#9CA3AF]">
            {search ? `Нация «${search}» не найдена` : 'Нет доступных наций'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
          {filteredNationalities.map((nat, index) => (
            <NationalityCard
              key={nat.nationality}
              nationality={nat.nationality}
              flag={nat.flag}
              playerCount={nat.playerCount}
              isSelected={selectedNationality === nat.nationality}
              onClick={() =>
                setSelectedNationality(
                  selectedNationality === nat.nationality ? null : nat.nationality,
                )
              }
              index={index}
            />
          ))}
        </div>
      )}

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-4 border border-[#1E1E1E]"
        style={{ backgroundColor: BG_CARD }}
      >
        <div className="flex items-start gap-3">
          <div className="text-xl">💡</div>
          <div>
            <div className="text-sm font-bold text-[#FFFFFF] mb-1">Как это работает</div>
            <div className="text-xs text-[#9CA3AF] leading-relaxed">
              Вы выбираете национальность, и все спины колеса будут содержать только игроков
              этой нации из разных клубов и сезонов РПЛ. Чем больше игроков доступно, тем
              легче собрать сильный состав!
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
