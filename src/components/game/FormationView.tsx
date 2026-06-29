'use client';

import { useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { POSITION_CATEGORY, POSITION_COLOR, canFillSlot, getCompatiblePositions } from '@/lib/positions';
import type { PositionCategory, Position } from '@/lib/positions';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Formation position layout coordinates (percentage-based)
const FORMATION_LAYOUTS: Record<string, { row: number; col: number }[]> = {
  '4-3-3': [
    { row: 90, col: 50 },  // ВР
    { row: 70, col: 20 },  // ПЗ
    { row: 70, col: 40 },  // ЦЗ
    { row: 70, col: 60 },  // ЦЗ
    { row: 70, col: 80 },  // ЛЗ
    { row: 50, col: 25 },  // ЦП
    { row: 50, col: 50 },  // ЦП
    { row: 50, col: 75 },  // ЦП
    { row: 25, col: 20 },  // ПВ
    { row: 25, col: 50 },  // НП
    { row: 25, col: 80 },  // ЛВ
  ],
  '4-4-2': [
    { row: 90, col: 50 },
    { row: 70, col: 20 },
    { row: 70, col: 40 },
    { row: 70, col: 60 },
    { row: 70, col: 80 },
    { row: 45, col: 20 },
    { row: 45, col: 40 },
    { row: 45, col: 60 },
    { row: 45, col: 80 },
    { row: 22, col: 35 },
    { row: 22, col: 65 },
  ],
  '4-2-3-1': [
    { row: 90, col: 50 },
    { row: 70, col: 20 },
    { row: 70, col: 40 },
    { row: 70, col: 60 },
    { row: 70, col: 80 },
    { row: 53, col: 35 },
    { row: 53, col: 65 },
    { row: 35, col: 20 },
    { row: 35, col: 50 },
    { row: 35, col: 80 },
    { row: 18, col: 50 },
  ],
  '3-5-2': [
    { row: 90, col: 50 },
    { row: 70, col: 25 },
    { row: 70, col: 50 },
    { row: 70, col: 75 },
    { row: 48, col: 10 },
    { row: 48, col: 35 },
    { row: 48, col: 50 },
    { row: 48, col: 65 },
    { row: 48, col: 90 },
    { row: 22, col: 35 },
    { row: 22, col: 65 },
  ],
  '3-4-3': [
    { row: 90, col: 50 },
    { row: 70, col: 25 },
    { row: 70, col: 50 },
    { row: 70, col: 75 },
    { row: 45, col: 20 },
    { row: 45, col: 40 },
    { row: 45, col: 60 },
    { row: 45, col: 80 },
    { row: 22, col: 20 },
    { row: 22, col: 50 },
    { row: 22, col: 80 },
  ],
  '5-3-2': [
    { row: 90, col: 50 },
    { row: 70, col: 10 },
    { row: 70, col: 30 },
    { row: 70, col: 50 },
    { row: 70, col: 70 },
    { row: 70, col: 90 },
    { row: 45, col: 25 },
    { row: 45, col: 50 },
    { row: 45, col: 75 },
    { row: 22, col: 35 },
    { row: 22, col: 65 },
  ],
  '5-4-1': [
    { row: 90, col: 50 },
    { row: 70, col: 10 },
    { row: 70, col: 30 },
    { row: 70, col: 50 },
    { row: 70, col: 70 },
    { row: 70, col: 90 },
    { row: 45, col: 15 },
    { row: 45, col: 38 },
    { row: 45, col: 62 },
    { row: 45, col: 85 },
    { row: 20, col: 50 },
  ],
  '4-1-4-1': [
    { row: 90, col: 50 },
    { row: 70, col: 20 },
    { row: 70, col: 40 },
    { row: 70, col: 60 },
    { row: 70, col: 80 },
    { row: 53, col: 50 },
    { row: 38, col: 15 },
    { row: 38, col: 38 },
    { row: 38, col: 62 },
    { row: 38, col: 85 },
    { row: 18, col: 50 },
  ],
  '4-5-1': [
    { row: 90, col: 50 },
    { row: 70, col: 20 },
    { row: 70, col: 40 },
    { row: 70, col: 60 },
    { row: 70, col: 80 },
    { row: 45, col: 15 },
    { row: 45, col: 35 },
    { row: 45, col: 50 },
    { row: 45, col: 65 },
    { row: 45, col: 85 },
    { row: 20, col: 50 },
  ],
  '4-4-1-1': [
    { row: 90, col: 50 },
    { row: 70, col: 20 },
    { row: 70, col: 40 },
    { row: 70, col: 60 },
    { row: 70, col: 80 },
    { row: 48, col: 15 },
    { row: 48, col: 38 },
    { row: 48, col: 62 },
    { row: 48, col: 85 },
    { row: 30, col: 50 },
    { row: 16, col: 50 },
  ],
  '3-4-1-2': [
    { row: 90, col: 50 },
    { row: 70, col: 25 },
    { row: 70, col: 50 },
    { row: 70, col: 75 },
    { row: 48, col: 15 },
    { row: 48, col: 38 },
    { row: 48, col: 62 },
    { row: 48, col: 85 },
    { row: 32, col: 50 },
    { row: 18, col: 35 },
    { row: 18, col: 65 },
  ],
  '4-2-2-2': [
    { row: 90, col: 50 },
    { row: 70, col: 20 },
    { row: 70, col: 40 },
    { row: 70, col: 60 },
    { row: 70, col: 80 },
    { row: 50, col: 30 },
    { row: 50, col: 70 },
    { row: 33, col: 30 },
    { row: 33, col: 70 },
    { row: 18, col: 35 },
    { row: 18, col: 65 },
  ],
};

function getRatingColor(rating: number): string {
  if (rating >= 78) return '#22c55e';
  if (rating >= 73) return '#3b82f6';
  if (rating >= 68) return '#f97316';
  return '#ef4444';
}

function getInitials(name: string | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Last name initial + first name initial
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function FormationView() {
  const {
    config,
    slots,
    selectedPlayer,
    movingPlayerSlotIndex,
    assignToSlot,
    movePlayer,
    screen,
    rerollsLeft,
  } = useGameStore();

  const [shakingSlot, setShakingSlot] = useState<number | null>(null);

  const layout = FORMATION_LAYOUTS[config.formation] ?? FORMATION_LAYOUTS['4-3-3'];

  const filledCount = slots.filter((s) => s.playerId).length;
  const openCount = 11 - filledCount;

  const maxRerolls = config.difficulty === 'easy' ? 3 : config.difficulty === 'normal' ? 1 : 0;

  // Get compatible positions for the selected player
  const compatiblePositions = selectedPlayer
    ? getCompatiblePositions(selectedPlayer.mainPosition as Position)
    : [];

  const triggerShake = useCallback((index: number) => {
    setShakingSlot(index);
    setTimeout(() => setShakingSlot(null), 400);
  }, []);

  const handleSlotClick = (index: number) => {
    const slot = slots[index];
    if (!slot) return;

    // If we have a selected player and the slot is empty, try to assign
    if (selectedPlayer && !slot.playerId) {
      const { canFill } = canFillSlot(
        selectedPlayer.mainPosition as Position,
        selectedPlayer.otherPositions as Position[],
        slot.position as Position,
      );
      if (canFill) {
        toast.success(`✅ ${selectedPlayer.fullName} назначен на ${slot.positionLabel}`);
        assignToSlot(index);
      } else {
        // Trigger shake animation on incompatible slot
        triggerShake(index);
        toast.error(`❌ ${selectedPlayer.fullName} не может играть на позиции ${slot.positionLabel}`);
      }
      return;
    }

    // If the slot is filled and we're in squad-complete or position-assign, start moving
    if (slot.playerId && (screen === 'squad-complete' || screen === 'position-assign')) {
      if (movingPlayerSlotIndex === null) {
        useGameStore.setState({ movingPlayerSlotIndex: index });
      } else if (movingPlayerSlotIndex !== index) {
        movePlayer(movingPlayerSlotIndex, index);
      }
    }
  };

  return (
    <div className="relative w-full">
      {/* Compatible positions info bar — only shown when a player is selected */}
      {selectedPlayer && compatiblePositions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 px-3 py-2 rounded-xl bg-[#1a1a2e] border border-[#22c55e]/20 flex items-center gap-2 flex-wrap"
        >
          <span className="text-xs text-[#94a3b8] shrink-0">Совместимые позиции:</span>
          <div className="flex gap-1.5 flex-wrap">
            {compatiblePositions.map((pos) => (
              <span
                key={pos}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22c55e]/15 text-[#22c55e]"
              >
                {pos}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Header with formation name and rerolls */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#94a3b8]">
          Формация: <span className="text-[#e2e8f0] font-bold">{config.formation}</span>
        </span>
        <span className="text-xs font-bold text-[#94a3b8] bg-[#1a1a2e] px-3 py-1 rounded-full">
          Перебросы: <span className="text-[#22c55e]">{rerollsLeft}</span>/{maxRerolls}
        </span>
      </div>

      {/* Pitch */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-[#1a5c30]/50 pitch-elevated"
        style={{ paddingBottom: '130%' }}
      >
        {/* Pitch stripe pattern */}
        <div
          className="absolute inset-0 pitch-stripes"
        />

        {/* Pitch grass texture lines */}
        <div className="absolute inset-0 pitch-grass-lines" />

        {/* Pitch gradient overlay for depth */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.15) 100%)',
          }}
        />

        {/* Pitch vignette overlay — darker at edges */}
        <div className="absolute inset-0 pitch-vignette pointer-events-none" />

        {/* Pitch border outline */}
        <div className="absolute inset-3 sm:inset-4 rounded-sm border-2 border-white/20" />

        {/* Center line */}
        <div className="absolute inset-x-3 sm:inset-x-4 top-1/2 h-px bg-white/20" />

        {/* Center circle */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-white/20"
        />

        {/* Center dot */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/30" />

        {/* Top penalty box */}
        <div className="absolute left-1/2 -translate-x-1/2 top-3 sm:top-4 w-36 sm:w-44 h-16 sm:h-20 border-b border-x border-white/20" />
        {/* Top goal box */}
        <div className="absolute left-1/2 -translate-x-1/2 top-3 sm:top-4 w-20 sm:w-24 h-8 border-b border-x border-white/20" />
        {/* Top penalty arc */}
        <div
          className="absolute left-1/2 -translate-x-1/2 border-b border-white/15 rounded-b-full"
          style={{ top: 'calc(12px + 64px - 10px)', width: '60px', height: '20px' }}
        />

        {/* Bottom penalty box */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4 w-36 sm:w-44 h-16 sm:h-20 border-t border-x border-white/20" />
        {/* Bottom goal box */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4 w-20 sm:w-24 h-8 border-t border-x border-white/20" />
        {/* Bottom penalty arc */}
        <div
          className="absolute left-1/2 -translate-x-1/2 border-t border-white/15 rounded-t-full"
          style={{ bottom: 'calc(12px + 64px - 10px)', width: '60px', height: '20px' }}
        />

        {/* Corner arcs */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 w-4 h-4 border-b border-r border-white/15 rounded-br-full" />
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 w-4 h-4 border-b border-l border-white/15 rounded-bl-full" />
        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 w-4 h-4 border-t border-r border-white/15 rounded-tr-full" />
        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 w-4 h-4 border-t border-l border-white/15 rounded-tl-full" />

        {/* Position Slots */}
        {slots.map((slot, index) => {
          const pos = layout[index];
          if (!pos) return null;

          const category = POSITION_CATEGORY[slot.position as Position] ?? 'mid' as PositionCategory;
          const color = POSITION_COLOR[category];
          const isFilled = !!slot.playerId;
          const isSelected = movingPlayerSlotIndex === index;
          const isCompatible = selectedPlayer
            ? canFillSlot(
                selectedPlayer.mainPosition as Position,
                selectedPlayer.otherPositions as Position[],
                slot.position as Position,
              ).canFill
            : false;
          const isIncompatible = selectedPlayer && !isFilled && !isCompatible;
          const isShaking = shakingSlot === index;

          return (
            <motion.button
              key={index}
              onClick={() => handleSlotClick(index)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                isSelected ? 'z-10' : ''
              } ${isShaking ? 'animate-shake' : ''}`}
              style={{
                top: `${pos.row}%`,
                left: `${pos.col}%`,
              }}
              whileTap={isFilled || isCompatible ? { scale: 0.92 } : undefined}
              layout
            >
              <div
                className={`flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'border-white/50 shadow-lg backdrop-blur-sm player-inner-glow animate-subtle-pulse'
                    : isIncompatible
                    ? 'border-[#ef4444]/40 border-dashed'
                    : isCompatible && !isFilled
                    ? 'border-[#22c55e] border-dashed animate-strong-pulse-green'
                    : 'border-white/25 border-dashed'
                } ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#1a5c30]' : ''}`}
                style={{
                  backgroundColor: isFilled ? `${color}dd` : isIncompatible ? `${color}15` : `${color}22`,
                }}
              >
                {isFilled ? (
                  <>
                    <span className="text-[10px] sm:text-xs font-black text-white leading-tight text-center" style={{maxWidth: '56px'}}>
                      {getInitials(slot.playerName)}
                    </span>
                    {slot.playerRating ? (
                      <span
                        className="text-[9px] sm:text-[10px] font-bold px-1.5 rounded-sm mt-0.5"
                        style={{ color: getRatingColor(slot.playerRating), backgroundColor: 'rgba(0,0,0,0.3)' }}
                      >
                        {slot.playerRating}
                      </span>
                    ) : null}
                  </>
                ) : isIncompatible ? (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] sm:text-xs font-bold text-[#ef4444]/60">{slot.positionLabel}</span>
                    <span className="text-[8px] leading-none">❌</span>
                  </div>
                ) : (
                  <span className="text-[10px] sm:text-xs font-bold text-white/60">{slot.positionLabel}</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Open positions counter */}
      <div className="flex items-center justify-center mt-3">
        <span className="text-xs text-[#94a3b8]">
          Заполнено: <span className="font-bold text-[#22c55e]">{filledCount}</span>/11
          {openCount > 0 && <span className="ml-1">· Осталось: {openCount} поз.</span>}
        </span>
      </div>
    </div>
  );
}
