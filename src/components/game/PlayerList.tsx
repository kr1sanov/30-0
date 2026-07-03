'use client';

import { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY, POSITION_COLOR, canFillSlot } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';
import { getNationalityFlag, isForeignPlayer } from '@/lib/nationality';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerOption } from '@/lib/types';

/** Position category gradient backgrounds */
const CATEGORY_BG: Record<PositionCategory, string> = {
  gk: '#f97316',
  def: '#3b82f6',
  mid: '#22c55e',
  att: '#ef4444',
};

function getCategoryColor(pos: string): string {
  const category = POSITION_CATEGORY[pos as Position] ?? 'mid' as PositionCategory;
  return POSITION_COLOR[category];
}

function getCategory(pos: string): PositionCategory {
  return POSITION_CATEGORY[pos as Position] ?? 'mid';
}

/** Get player's last name from full name (Russian convention: Фамилия Имя) */
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  // In Russian naming convention, the first word is the last name (Фамилия)
  return parts[0];
}

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  // In Russian naming convention, the last word(s) are the first name (Имя)
  if (parts.length >= 2) {
    return parts.slice(1).join(' ');
  }
  return '';
}

interface ProcessedPlayer extends PlayerOption {
  canFillAny: boolean;
  availableSlots: number[]; // slot indices where player can be placed
}

export default function PlayerList() {
  const { currentSpin, slots, config, assignToSlot, selectedPlayer } = useGameStore();
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const isHard = config.difficulty === 'hard';

  const openPositions = useMemo(() =>
    slots
      .map((s, i) => ({ position: s.position, index: i }))
      .filter((s) => !slots[s.index].playerId),
    [slots]
  );

  // Process players: add compatibility info and sort by rating then alphabet
  const processedPlayers = useMemo(() => {
    if (!currentSpin) return [];

    const players = currentSpin.players.map((player) => {
      const availableSlots: number[] = [];
      let canFillAny = false;

      for (const openSlot of openPositions) {
        const result = canFillSlot(
          player.mainPosition as Position,
          player.otherPositions as Position[],
          openSlot.position as Position,
        );
        if (result.canFill) {
          canFillAny = true;
          availableSlots.push(openSlot.index);
        }
      }

      return { ...player, canFillAny, availableSlots };
    });

    // Sort by rating descending, then alphabetically by name
    return [...players].sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.fullName.localeCompare(b.fullName, 'ru');
    });
  }, [currentSpin, openPositions]);

  const handlePlayerClick = (player: ProcessedPlayer) => {
    if (!player.canFillAny) return;

    // If player can fill exactly one slot, assign directly
    if (player.availableSlots.length === 1) {
      useGameStore.setState({ selectedPlayer: player as PlayerOption });
      assignToSlot(player.availableSlots[0]);
      setExpandedPlayerId(null);
      return;
    }

    // Multiple positions — toggle expanded state
    if (expandedPlayerId === player.playerSeasonId) {
      // Collapse — deselect player
      setExpandedPlayerId(null);
      useGameStore.setState({ selectedPlayer: null });
      return;
    }

    // Set selectedPlayer so the pitch highlights compatible slots
    useGameStore.setState({ selectedPlayer: player as PlayerOption });
    setExpandedPlayerId(player.playerSeasonId);
  };

  const handlePositionSelect = (player: ProcessedPlayer, slotIndex: number) => {
    useGameStore.setState({ selectedPlayer: player as PlayerOption });
    assignToSlot(slotIndex);
    setExpandedPlayerId(null);
  };

  // Clear selected player when component unmounts or spin changes
  const handleClearSelection = () => {
    useGameStore.setState({ selectedPlayer: null });
    setExpandedPlayerId(null);
  };

  if (!currentSpin) return null;

  return (
    <div className="space-y-2">
      {/* Selected player info — prompt to click on pitch */}
      {selectedPlayer && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0d2d0d] border border-[#22c55e]/20"
        >
          <span className="text-xs text-[#22c55e] font-bold shrink-0">
            {selectedPlayer.rating}
          </span>
          <span className="text-xs text-[#e2e8f0] font-medium truncate flex-1">
            {selectedPlayer.fullName}
          </span>
          <span className="text-[10px] text-[#94a3b8] shrink-0">
            Нажмите на позицию ↓
          </span>
          <button
            onClick={handleClearSelection}
            className="text-[#94a3b8] hover:text-[#e2e8f0] transition-colors shrink-0 ml-1"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Player list */}
      <div className="space-y-1.5">
        {processedPlayers.map((player, idx) => {
          const isExpanded = expandedPlayerId === player.playerSeasonId;
          const isSelected = selectedPlayer?.playerSeasonId === player.playerSeasonId;
          const posCategory = getCategory(player.mainPosition);
          const posColor = CATEGORY_BG[posCategory];
          const flagEmoji = getNationalityFlag(player.nationality);
          const foreign = isForeignPlayer(player.nationality);

          return (
            <div key={player.playerSeasonId}>
              <motion.button
                onClick={() => handlePlayerClick(player)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left ${
                  !player.canFillAny
                    ? 'opacity-50'
                    : isSelected
                    ? 'bg-[#0d2d0d] border border-[#22c55e]/40 ring-1 ring-[#22c55e]/20'
                    : 'bg-[#0d2d0d]/60 border border-transparent hover:border-[#22c55e]/20'
                }`}
              >
                {/* Rating square with position color */}
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-sm font-black text-white"
                  style={{ backgroundColor: posColor }}
                >
                  {isHard ? '?' : player.rating}
                </div>

                {/* Name and positions */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#e2e8f0] truncate">
                    {foreign ? player.fullName : (player.lastName || getLastName(player.fullName))}{' '}
                    {!foreign && <span className="font-normal text-[#94a3b8]">{getFirstName(player.fullName)}</span>}
                    {flagEmoji && <span className="ml-1.5">{flagEmoji}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {[player.mainPosition, ...player.otherPositions].map((pos, posIdx) => (
                      <span
                        key={`${pos}-${posIdx}`}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white/90"
                        style={{ backgroundColor: `${getCategoryColor(pos)}88` }}
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow indicator if multiple positions */}
                {player.canFillAny && player.availableSlots.length > 1 && (
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[#94a3b8] text-xs shrink-0"
                  >
                    ▼
                  </motion.span>
                )}

                {/* Checkmark if can fill */}
                {player.canFillAny && player.availableSlots.length === 1 && (
                  <span className="text-[#22c55e] text-sm shrink-0">✓</span>
                )}
              </motion.button>

              {/* Expanded position selection */}
              <AnimatePresence>
                {isExpanded && player.availableSlots.length > 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 px-3 py-2 bg-[#0a1a0a] rounded-b-xl border border-t-0 border-[#22c55e]/15">
                      <span className="text-[10px] text-[#94a3b8] w-full mb-1">Выберите позицию:</span>
                      {player.availableSlots.map((slotIdx) => {
                        const slot = slots[slotIdx];
                        if (!slot) return null;
                        const slotCat = getCategory(slot.position);
                        return (
                          <motion.button
                            key={slotIdx}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePositionSelect(player, slotIdx);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110"
                            style={{ backgroundColor: CATEGORY_BG[slotCat] }}
                          >
                            {slot.positionLabel}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
