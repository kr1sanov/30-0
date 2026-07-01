'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY, POSITION_COLOR } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { canFillSlot } from '@/lib/positions';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerOption } from '@/lib/types';

type SortMode = 'rating' | 'position' | 'compatibility';
type FilterCategory = 'all' | 'gk' | 'def' | 'mid' | 'att';

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: 'Все',
  gk: 'ВР',
  def: 'ЗЩ',
  mid: 'ПЗ',
  att: 'НП',
};

/** Position category gradient backgrounds */
const CATEGORY_GRADIENT: Record<PositionCategory, string> = {
  gk: 'linear-gradient(135deg, #f97316, #ea580c)',
  def: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  mid: 'linear-gradient(135deg, #22c55e, #16a34a)',
  att: 'linear-gradient(135deg, #ef4444, #dc2626)',
};

function getRatingBadgeColor(rating: number): string {
  if (rating >= 78) return '#22c55e';
  if (rating >= 73) return '#3b82f6';
  if (rating >= 68) return '#f97316';
  return '#ef4444';
}

function getCategoryColor(pos: string): string {
  const category = POSITION_CATEGORY[pos as Position] ?? 'mid' as PositionCategory;
  return POSITION_COLOR[category];
}

/** Get player initials from full name */
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

/** Nationality to flag emoji mapping (common RPL countries) */
const NATIONALITY_FLAGS: Record<string, string> = {
  'Россия': '🇷🇺',
  'Бразилия': '🇧🇷',
  'Аргентина': '🇦🇷',
  'Сербия': '🇷🇸',
  'Хорватия': '🇭🇷',
  'Узбекистан': '🇺🇿',
  'Парагвай': '🇵🇾',
  'Колумбия': '🇨🇴',
  'Чили': '🇨🇱',
  'Уругвай': '🇺🇾',
  'Венесуэла': '🇻🇪',
  'Эквадор': '🇪🇨',
  'Перу': '🇵🇪',
  'Мексика': '🇲🇽',
  'Гана': '🇬🇭',
  'Нигерия': '🇳🇬',
  'Камерун': '🇨🇲',
  'Сенегал': '🇸🇳',
  'Кот-д\'Ивуар': '🇨🇮',
  'Марокко': '🇲🇦',
  'Тунис': '🇹🇳',
  'Алжир': '🇩🇿',
  'Египет': '🇪🇬',
  'ЮАР': '🇿🇦',
  'Германия': '🇩🇪',
  'Франция': '🇫🇷',
  'Испания': '🇪🇸',
  'Италия': '🇮🇹',
  'Англия': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Португалия': '🇵🇹',
  'Нидерланды': '🇳🇱',
  'Бельгия': '🇧🇪',
  'Швеция': '🇸🇪',
  'Норвегия': '🇳🇴',
  'Дания': '🇩🇰',
  'Финляндия': '🇫🇮',
  'Польша': '🇵🇱',
  'Чехия': '🇨🇿',
  'Словакия': '🇸🇰',
  'Словения': '🇸🇮',
  'Венгрия': '🇭🇺',
  'Румыния': '🇷🇴',
  'Болгария': '🇧🇬',
  'Греция': '🇬🇷',
  'Турция': '🇹🇷',
  'Израиль': '🇮🇱',
  'Украина': '🇺🇦',
  'Беларусь': '🇧🇾',
  'Казахстан': '🇰🇿',
  'Грузия': '🇬🇪',
  'Армения': '🇦🇲',
  'Азербайджан': '🇦🇿',
  'Молдова': '🇲🇩',
  'Литва': '🇱🇹',
  'Латвия': '🇱🇻',
  'Эстония': '🇪🇪',
  'Китай': '🇨🇳',
  'Япония': '🇯🇵',
  'Южная Корея': '🇰🇷',
  'Иран': '🇮🇷',
  'Ирак': '🇮🇶',
  'Сирия': '🇸🇾',
  'Иордания': '🇯🇴',
  'Таиланд': '🇹🇭',
  'Вьетнам': '🇻🇳',
  'Коста-Рика': '🇨🇷',
  'Ямайка': '🇯🇲',
  'Доминикана': '🇩🇴',
};

function getNationalityFlag(nationality?: string): string {
  if (!nationality) return '';
  return NATIONALITY_FLAGS[nationality] || '';
}

/** Compatibility label for popup */
function getCompatibilityLabel(compat: 'none' | 'partial' | 'full'): { text: string; color: string } {
  switch (compat) {
    case 'full': return { text: 'Полная', color: '#22c55e' };
    case 'partial': return { text: 'Частичная (0.8×)', color: '#f97316' };
    case 'none': return { text: 'Недоступна', color: '#ef4444' };
  }
}

interface ProcessedPlayer extends PlayerOption {
  canFillAny: boolean;
  bestCompatibility: 'none' | 'partial' | 'full';
  bestSlotCategory: PositionCategory | null;
}

/** Player Detail Popup component */
function PlayerDetailPopup({
  player,
  onSelect,
  onClose,
  isHard,
}: {
  player: ProcessedPlayer;
  onSelect: () => void;
  onClose: () => void;
  isHard: boolean;
}) {
  const posCategory = POSITION_CATEGORY[player.mainPosition as Position] ?? 'mid';
  const compatInfo = getCompatibilityLabel(player.bestCompatibility);
  const initials = getInitials(player.fullName);
  const flag = getNationalityFlag(player.nationality);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Popup content */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl bg-[#0d2d0d] border border-[#2a2a4a] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div
          className="relative p-4 pb-3"
          style={{
            background: `${CATEGORY_GRADIENT[posCategory]}`,
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            {/* Large avatar */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white bg-white/20 border-2 border-white/40 shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">
                {player.fullName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold px-2 py-0.5 rounded-md bg-white/20 text-white">
                  {player.mainPosition}
                </span>
                {flag && <span className="text-lg">{flag}</span>}
              </div>
            </div>
            {/* Rating */}
            {!isHard && (
              <div className="text-3xl font-black text-white/90">
                {player.rating}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Positions */}
          <div>
            <p className="text-xs text-[#94a3b8] mb-1.5">Позиции</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-xs font-bold px-2 py-1 rounded-lg text-white"
                style={{ backgroundColor: getCategoryColor(player.mainPosition) }}
              >
                {player.mainPosition}
              </span>
              {player.otherPositions.map((pos) => (
                <span
                  key={pos}
                  className="text-xs font-medium px-2 py-1 rounded-lg text-white/80"
                  style={{ backgroundColor: `${getCategoryColor(pos)}88` }}
                >
                  {pos}
                </span>
              ))}
            </div>
          </div>

          {/* Compatibility */}
          <div>
            <p className="text-xs text-[#94a3b8] mb-1.5">Совместимость</p>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: compatInfo.color }}
              />
              <span className="text-sm font-medium" style={{ color: compatInfo.color }}>
                {compatInfo.text}
              </span>
            </div>
          </div>

          {/* Rating visual bar */}
          {!isHard && (
            <div>
              <p className="text-xs text-[#94a3b8] mb-1.5">Рейтинг</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-[#0a1a0a] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(player.rating, 99)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: CATEGORY_GRADIENT[posCategory] }}
                  />
                </div>
                <span className="text-sm font-black text-[#e2e8f0] w-8 text-right">
                  {player.rating}
                </span>
              </div>
            </div>
          )}

          {/* Nationality */}
          {player.nationality && (
            <div>
              <p className="text-xs text-[#94a3b8] mb-1.5">Гражданство</p>
              <div className="flex items-center gap-2">
                {flag && <span className="text-lg">{flag}</span>}
                <span className="text-sm text-[#e2e8f0]">{player.nationality}</span>
              </div>
            </div>
          )}

          {/* Select button */}
          {player.canFillAny ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onSelect}
              className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:brightness-110"
              style={{ background: CATEGORY_GRADIENT[posCategory] }}
            >
              Выбрать
            </motion.button>
          ) : (
            <div className="w-full py-3 rounded-xl text-sm font-bold text-[#94a3b8] text-center bg-[#0a1a0a] border border-[#2a2a4a]">
              Недоступен для текущих позиций
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PlayerList() {
  const { currentSpin, selectedPlayer, selectPlayer, slots, config } = useGameStore();
  const [sortMode, setSortMode] = useState<SortMode>('rating');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailPlayer, setDetailPlayer] = useState<ProcessedPlayer | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openPositions = useMemo(() =>
    slots
      .filter((s) => !s.playerId)
      .map((s) => s.position),
    [slots]
  );

  const isHard = config.difficulty === 'hard';

  // Process players: add compatibility info
  const processedPlayers = useMemo(() => {
    if (!currentSpin) return [];
    return currentSpin.players.map((player) => {
      const canFillAny = openPositions.some((slotPos) =>
        canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          slotPos as Position,
        ).canFill
      );

      const bestCompatibility = openPositions.reduce<'none' | 'partial' | 'full'>((best, slotPos) => {
        const result = canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          slotPos as Position,
        );
        if (result.canFill && result.penalty === 1) return 'full';
        if (result.canFill && best !== 'full') return 'partial';
        return best;
      }, 'none' as 'none' | 'partial' | 'full');

      // Get best compatible position category
      const bestSlotCategory = openPositions.reduce<PositionCategory | null>((cat, slotPos) => {
        const result = canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          slotPos as Position,
        );
        if (result.canFill && cat === null) {
          return POSITION_CATEGORY[slotPos as Position] ?? 'mid';
        }
        return cat;
      }, null);

      return { ...player, canFillAny, bestCompatibility, bestSlotCategory };
    });
  }, [currentSpin, openPositions]);

  // Filter and sort
  const filteredPlayers = useMemo(() => {
    let filtered = processedPlayers;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.fullName.toLowerCase().includes(q));
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => {
        const playerCat = POSITION_CATEGORY[p.mainPosition as Position];
        if (filterCategory === playerCat) return true;
        if (p.bestSlotCategory === filterCategory) return true;
        return false;
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortMode) {
        case 'rating':
          return b.rating - a.rating;
        case 'position': {
          const catOrder = { gk: 0, def: 1, mid: 2, att: 3 };
          const catA = catOrder[POSITION_CATEGORY[a.mainPosition as Position] ?? 'mid'];
          const catB = catOrder[POSITION_CATEGORY[b.mainPosition as Position] ?? 'mid'];
          if (catA !== catB) return catA - catB;
          return b.rating - a.rating;
        }
        case 'compatibility': {
          const compatOrder = { full: 0, partial: 1, none: 2 };
          const cA = compatOrder[a.bestCompatibility];
          const cB = compatOrder[b.bestCompatibility];
          if (cA !== cB) return cA - cB;
          return b.rating - a.rating;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [processedPlayers, searchQuery, filterCategory, sortMode]);

  // Close detail popup on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailPlayer(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentSpin) return null;

  return (
    <div className="space-y-3">
      {/* Header with club info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#e2e8f0]">
            Игроки <span className="text-[#94a3b8] font-normal">({currentSpin.players.length})</span>
          </h3>
          <p className="text-xs text-[#94a3b8]">
            {currentSpin.clubName} · {currentSpin.seasonLabel}
          </p>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск игрока..."
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#0d2d0d] border border-[#0d2d0d] text-sm text-[#e2e8f0] placeholder:text-[#94a3b8]/50 focus:border-[#22c55e]/40 focus:outline-none transition-colors search-focus-glow"
        />
      </div>

      {/* Sort and Filter Controls */}
      <div className="space-y-2">
        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(Object.entries(CATEGORY_LABELS) as [FilterCategory, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === key
                  ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20'
                  : 'bg-[#0d2d0d] text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#94a3b8] mr-1">Сортировка:</span>
          {[
            { mode: 'rating' as SortMode, label: 'Рейтинг' },
            { mode: 'position' as SortMode, label: 'Позиция' },
            { mode: 'compatibility' as SortMode, label: 'Совместимость' },
          ].map((s) => (
            <button
              key={s.mode}
              onClick={() => setSortMode(s.mode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                sortMode === s.mode
                  ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instruction text */}
      <div className="flex items-center gap-2 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 p-3">
        <svg className="w-4 h-4 text-[#22c55e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        <p className="text-xs text-[#22c55e]">Выберите игрока, затем укажите позицию на поле</p>
      </div>

      {/* Player List */}
      <div ref={listRef} className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-6 text-sm text-[#94a3b8]">
            <div className="text-2xl mb-2 animate-bounce-search">🔍</div>
            Игроки не найдены
            {searchQuery && <div className="text-xs mt-1">Попробуйте другой запрос</div>}
          </div>
        ) : (
          filteredPlayers.map((player, idx) => {
            const isSelected = selectedPlayer?.playerSeasonId === player.playerSeasonId;
            const posCategory = POSITION_CATEGORY[player.mainPosition as Position] ?? 'mid';
            const initials = getInitials(player.fullName);
            const flag = getNationalityFlag(player.nationality);

            return (
              <motion.button
                key={player.playerSeasonId}
                onClick={() => {
                  if (player.canFillAny) {
                    selectPlayer(player as PlayerOption);
                  } else {
                    // Show detail popup for incompatible players too
                    setDetailPlayer(player);
                  }
                }}
                disabled={false}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left relative group ${
                  isSelected
                    ? 'bg-[#22c55e]/15 border-2 border-[#22c55e] shadow-lg shadow-[#22c55e]/10 animate-green-pulse-ring'
                    : player.canFillAny
                    ? 'bg-gradient-to-r from-[#0d2d0d] to-[#0b240b] border-2 border-transparent hover:border-[#22c55e]/30'
                    : 'bg-[#0d2d0d]/30 border-2 border-transparent opacity-40'
                }`}
              >
                {/* Avatar Circle with Initials */}
                <div className="relative shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg border-2 border-white/20"
                    style={{ background: CATEGORY_GRADIENT[posCategory] }}
                  >
                    {initials}
                  </div>
                  {/* Rating badge overlapping bottom-right */}
                  {!isHard && (
                    <div
                      className="absolute -bottom-1 -right-1 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-[#0d2d0d] shadow-md px-1 rating-badge-shine"
                      style={{ backgroundColor: getRatingBadgeColor(player.rating) }}
                    >
                      {player.rating}
                    </div>
                  )}
                  {isHard && (
                    <div className="absolute -bottom-1 -right-1 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-black text-white bg-[#4a4a5a] border-2 border-[#0d2d0d] shadow-md">
                      ??
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#e2e8f0] truncate">
                      {player.fullName}
                    </span>
                    {flag && <span className="text-sm shrink-0">{flag}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md font-bold text-white"
                      style={{ backgroundColor: getCategoryColor(player.mainPosition) }}
                    >
                      {player.mainPosition}
                    </span>
                    {player.otherPositions.slice(0, 3).map((pos) => (
                      <span
                        key={pos}
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-medium text-white/80"
                        style={{ backgroundColor: `${getCategoryColor(pos)}88` }}
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Compatibility indicator */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  {player.canFillAny ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center animate-subtle-bounce">
                        <svg className="w-3.5 h-3.5 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {player.bestCompatibility === 'partial' && (
                        <span className="text-[8px] text-[#f97316] font-bold">0.8×</span>
                      )}
                    </>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center animate-subtle-bounce">
                      <svg className="w-3.5 h-3.5 text-[#ef4444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Detail popup trigger hint (visible on hover) */}
                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-[#94a3b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                  </svg>
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      {/* Player Detail Popup */}
      <AnimatePresence>
        {detailPlayer && (
          <PlayerDetailPopup
            player={detailPlayer}
            isHard={isHard}
            onSelect={() => {
              if (detailPlayer.canFillAny) {
                selectPlayer(detailPlayer as PlayerOption);
              }
              setDetailPlayer(null);
            }}
            onClose={() => setDetailPlayer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
