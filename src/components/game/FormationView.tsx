'use client';

import { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  POSITION_CATEGORY,
  POSITION_COLOR,
  canFillSlot,
} from '@/lib/positions';
import type { PositionCategory, Position } from '@/lib/positions';
import { getNationalityFlag } from '@/lib/nationality';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Formation position layout coordinates (percentage-based)
// ---------------------------------------------------------------------------
const FORMATION_LAYOUTS: Record<string, { row: number; col: number }[]> = {
  '4-3-3': [
    { row: 88, col: 50 },  // ВР
    { row: 68, col: 18 },  // ПЗ
    { row: 68, col: 39 },  // ЦЗ
    { row: 68, col: 61 },  // ЦЗ
    { row: 68, col: 82 },  // ЛЗ
    { row: 48, col: 24 },  // ЦП
    { row: 48, col: 50 },  // ЦП
    { row: 48, col: 76 },  // ЦП
    { row: 24, col: 18 },  // ПВ
    { row: 24, col: 50 },  // НП
    { row: 24, col: 82 },  // ЛВ
  ],
  '4-4-2': [
    { row: 88, col: 50 },
    { row: 68, col: 18 },
    { row: 68, col: 39 },
    { row: 68, col: 61 },
    { row: 68, col: 82 },
    { row: 44, col: 18 },
    { row: 44, col: 39 },
    { row: 44, col: 61 },
    { row: 44, col: 82 },
    { row: 22, col: 35 },
    { row: 22, col: 65 },
  ],
  '4-2-3-1': [
    { row: 88, col: 50 },
    { row: 68, col: 18 },
    { row: 68, col: 39 },
    { row: 68, col: 61 },
    { row: 68, col: 82 },
    { row: 52, col: 35 },
    { row: 52, col: 65 },
    { row: 35, col: 18 },
    { row: 35, col: 50 },
    { row: 35, col: 82 },
    { row: 16, col: 50 },
  ],
  '3-5-2': [
    { row: 88, col: 50 },
    { row: 68, col: 25 },
    { row: 68, col: 50 },
    { row: 68, col: 75 },
    { row: 46, col: 10 },
    { row: 46, col: 33 },
    { row: 46, col: 50 },
    { row: 46, col: 67 },
    { row: 46, col: 90 },
    { row: 22, col: 35 },
    { row: 22, col: 65 },
  ],
  '3-4-3': [
    { row: 88, col: 50 },
    { row: 68, col: 25 },
    { row: 68, col: 50 },
    { row: 68, col: 75 },
    { row: 44, col: 18 },
    { row: 44, col: 39 },
    { row: 44, col: 61 },
    { row: 44, col: 82 },
    { row: 22, col: 18 },
    { row: 22, col: 50 },
    { row: 22, col: 82 },
  ],
  '5-3-2': [
    { row: 88, col: 50 },
    { row: 68, col: 10 },
    { row: 68, col: 30 },
    { row: 68, col: 50 },
    { row: 68, col: 70 },
    { row: 68, col: 90 },
    { row: 44, col: 25 },
    { row: 44, col: 50 },
    { row: 44, col: 75 },
    { row: 22, col: 35 },
    { row: 22, col: 65 },
  ],
  '5-4-1': [
    { row: 88, col: 50 },
    { row: 68, col: 10 },
    { row: 68, col: 30 },
    { row: 68, col: 50 },
    { row: 68, col: 70 },
    { row: 68, col: 90 },
    { row: 44, col: 15 },
    { row: 44, col: 38 },
    { row: 44, col: 62 },
    { row: 44, col: 85 },
    { row: 18, col: 50 },
  ],
  '4-1-4-1': [
    { row: 88, col: 50 },
    { row: 68, col: 18 },
    { row: 68, col: 39 },
    { row: 68, col: 61 },
    { row: 68, col: 82 },
    { row: 52, col: 50 },
    { row: 36, col: 15 },
    { row: 36, col: 38 },
    { row: 36, col: 62 },
    { row: 36, col: 85 },
    { row: 16, col: 50 },
  ],
  '4-5-1': [
    { row: 88, col: 50 },
    { row: 68, col: 18 },
    { row: 68, col: 39 },
    { row: 68, col: 61 },
    { row: 68, col: 82 },
    { row: 44, col: 15 },
    { row: 44, col: 35 },
    { row: 44, col: 50 },
    { row: 44, col: 65 },
    { row: 44, col: 85 },
    { row: 18, col: 50 },
  ],
  '4-4-1-1': [
    { row: 88, col: 50 },
    { row: 68, col: 18 },
    { row: 68, col: 39 },
    { row: 68, col: 61 },
    { row: 68, col: 82 },
    { row: 46, col: 15 },
    { row: 46, col: 38 },
    { row: 46, col: 62 },
    { row: 46, col: 85 },
    { row: 28, col: 50 },
    { row: 14, col: 50 },
  ],
  '3-4-1-2': [
    { row: 88, col: 50 },
    { row: 68, col: 25 },
    { row: 68, col: 50 },
    { row: 68, col: 75 },
    { row: 46, col: 15 },
    { row: 46, col: 38 },
    { row: 46, col: 62 },
    { row: 46, col: 85 },
    { row: 30, col: 50 },
    { row: 16, col: 35 },
    { row: 16, col: 65 },
  ],
  '4-2-2-2': [
    { row: 88, col: 50 },
    { row: 68, col: 18 },
    { row: 68, col: 39 },
    { row: 68, col: 61 },
    { row: 68, col: 82 },
    { row: 48, col: 30 },
    { row: 48, col: 70 },
    { row: 31, col: 30 },
    { row: 31, col: 70 },
    { row: 16, col: 35 },
    { row: 16, col: 65 },
  ],
};

// Rating color tiers
function getRatingColor(rating: number): string {
  if (rating >= 78) return '#fbbf24';
  if (rating >= 73) return '#22c55e';
  if (rating >= 68) return '#f97316';
  return '#ef4444';
}

// Get 2-letter initials from last name
function getInitials(lastName?: string, fullName?: string): string {
  if (lastName) {
    const parts = lastName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return lastName.slice(0, 2).toUpperCase();
  }
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return '??';
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function FormationView() {
  const {
    config,
    slots,
    selectedPlayer,
    movingPlayerSlotIndex,
    assignToSlot,
    movePlayer,
    finishMoving,
    screen,
    justAssignedSlotIndex,
  } = useGameStore();

  const [shakingSlot, setShakingSlot] = useState<number | null>(null);

  const layout = FORMATION_LAYOUTS[config.formation] ?? FORMATION_LAYOUTS['4-3-3'];

  const filledCount = slots.filter((s) => s.playerId).length;
  const openCount = 11 - filledCount;

  // Is the squad complete and we can move players?
  const canMove = screen === 'squad-complete' || screen === 'position-assign';

  // Average rating
  const avgRating = useMemo(() => {
    const filled = slots.filter((s) => s.playerId && s.playerRating);
    if (filled.length === 0) return null;
    const sum = filled.reduce((acc, s) => {
      let r = s.playerRating!;
      if (s.playerPosition) {
        const { penalty } = canFillSlot(
          s.playerPosition as Position,
          (s.playerOtherPositions ?? []) as Position[],
          s.position as Position,
        );
        r = Math.round(r * penalty);
      }
      return acc + r;
    }, 0);
    return Math.round(sum / filled.length);
  }, [slots]);

  const triggerShake = useCallback((index: number) => {
    setShakingSlot(index);
    setTimeout(() => setShakingSlot(null), 400);
  }, []);

  const handleSlotClick = (index: number) => {
    const slot = slots[index];
    if (!slot) return;

    // --- Moving mode: a player is selected for move ---
    if (movingPlayerSlotIndex !== null) {
      if (movingPlayerSlotIndex === index) {
        // Deselect — cancel move
        finishMoving();
        return;
      }

      const sourceSlot = slots[movingPlayerSlotIndex];
      if (slot.playerId) {
        // Swap two filled players
        movePlayer(movingPlayerSlotIndex, index);
      } else {
        // Move to empty slot — check compatibility
        if (sourceSlot?.playerPosition) {
          const { canFill } = canFillSlot(
            sourceSlot.playerPosition as Position,
            (sourceSlot.playerOtherPositions ?? []) as Position[],
            slot.position as Position,
          );
          if (canFill) {
            movePlayer(movingPlayerSlotIndex, index);
          } else {
            triggerShake(index);
            toast.error(`${sourceSlot.playerName} не может играть на ${slot.positionLabel}`);
          }
        }
      }
      return;
    }

    // --- Selected player: assign to empty compatible slot ---
    if (selectedPlayer && !slot.playerId) {
      const { canFill } = canFillSlot(
        selectedPlayer.mainPosition as Position,
        selectedPlayer.otherPositions as Position[],
        slot.position as Position,
      );
      if (canFill) {
        toast.success(`${selectedPlayer.fullName} → ${slot.positionLabel}`);
        assignToSlot(index);
      } else {
        triggerShake(index);
        toast.error('Несовместимая позиция');
      }
      return;
    }

    // --- Click filled player to start moving ---
    if (slot.playerId && canMove) {
      useGameStore.setState({ movingPlayerSlotIndex: index });
    }
  };

  // Determine which slots are valid targets for the moving player
  const movingTargets = useMemo(() => {
    if (movingPlayerSlotIndex === null || movingPlayerSlotIndex < 0) return new Set<number>();
    const sourceSlot = slots[movingPlayerSlotIndex];
    if (!sourceSlot?.playerPosition) return new Set<number>();
    const targets = new Set<number>();
    slots.forEach((s, i) => {
      if (i === movingPlayerSlotIndex) return;
      if (s.playerId) {
        // Any filled slot can be swapped
        targets.add(i);
      } else {
        const { canFill } = canFillSlot(
          sourceSlot.playerPosition as Position,
          (sourceSlot.playerOtherPositions ?? []) as Position[],
          s.position as Position,
        );
        if (canFill) targets.add(i);
      }
    });
    return targets;
  }, [movingPlayerSlotIndex, slots]);

  // Connection lines for moving mode
  const swapLines = useMemo(() => {
    if (movingPlayerSlotIndex === null || movingPlayerSlotIndex < 0) return [];
    const from = layout[movingPlayerSlotIndex];
    if (!from) return [];
    const lines: { from: { row: number; col: number }; to: { row: number; col: number } }[] = [];
    movingTargets.forEach((i) => {
      const to = layout[i];
      if (to) lines.push({ from, to });
    });
    return lines;
  }, [movingPlayerSlotIndex, movingTargets, layout]);

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Selected player prompt */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-2 px-3 py-1.5 rounded-lg bg-[#0d2d0d]/90 border border-[#22c55e]/25 flex items-center gap-1.5 flex-wrap"
          >
            <span className="text-[10px] text-[#94a3b8]">Нажмите на</span>
            <span className="text-[10px] font-bold text-[#22c55e]">зелёную</span>
            <span className="text-[10px] text-[#94a3b8]">позицию для</span>
            <span className="text-[10px] font-bold text-white">
              {selectedPlayer.fullName}
            </span>
            <span className="text-[10px] text-[#94a3b8]">({selectedPlayer.rating})</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moving player prompt */}
      <AnimatePresence>
        {movingPlayerSlotIndex !== null && movingPlayerSlotIndex >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-2 px-3 py-1.5 rounded-lg bg-[#2d1d0d]/90 border border-[#facc15]/25 flex items-center gap-1.5 flex-wrap"
          >
            <span className="text-[10px] text-[#94a3b8]">Выберите позицию для обмена с</span>
            <span className="text-[10px] font-bold text-[#facc15]">
              {slots[movingPlayerSlotIndex]?.playerName}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Compact Pitch ===== */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-[#1a5c30]/50"
        style={{ maxWidth: '400px', paddingBottom: '62%' }}
      >
        {/* Pitch base — dark green */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a6b2a] via-[#186326] to-[#145a20]" />

        {/* Subtle stripe pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0px, transparent 18px, rgba(255,255,255,0.4) 18px, rgba(255,255,255,0.4) 36px)',
          }}
        />

        {/* V-shaped mowing pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(60deg, transparent 0px, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 80px)',
          }}
        />

        {/* Pitch border outline */}
        <div className="absolute inset-2.5 sm:inset-3 rounded-sm border border-white/15" />

        {/* Center line */}
        <div className="absolute inset-x-2.5 sm:inset-x-3 top-1/2 h-px bg-white/12" />

        {/* Center circle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/12" />

        {/* Center dot */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />

        {/* Top penalty area */}
        <div className="absolute left-1/2 -translate-x-1/2 top-2.5 sm:top-3 w-24 sm:w-28 h-10 border-b border-x border-white/10" />
        <div className="absolute left-1/2 -translate-x-1/2 top-2.5 sm:top-3 w-12 sm:w-14 h-5 border-b border-x border-white/10" />

        {/* Bottom penalty area */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2.5 sm:bottom-3 w-24 sm:w-28 h-10 border-t border-x border-white/10" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2.5 sm:bottom-3 w-12 sm:w-14 h-5 border-t border-x border-white/10" />

        {/* SVG connection lines for move mode */}
        {swapLines.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 88"
            preserveAspectRatio="none"
            aria-hidden
          >
            {swapLines.map((l, i) => (
              <motion.line
                key={i}
                x1={l.from.col}
                y1={l.from.row * 0.88}
                x2={l.to.col}
                y2={l.to.row * 0.88}
                stroke="rgba(250, 204, 21, 0.6)"
                strokeWidth={0.4}
                strokeDasharray="1.5 1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
              />
            ))}
          </svg>
        )}

        {/* ===== Position Slots ===== */}
        {slots.map((slot, index) => {
          const pos = layout[index];
          if (!pos) return null;

          const category = POSITION_CATEGORY[slot.position as Position] ?? ('mid' as PositionCategory);
          const color = POSITION_COLOR[category];
          const isFilled = !!slot.playerId;
          const isMoving = movingPlayerSlotIndex === index;
          const isJustAssigned = justAssignedSlotIndex === index && isFilled;
          const isShaking = shakingSlot === index;

          // Can the selected player fill this empty slot?
          const isCompatible =
            selectedPlayer && !isFilled
              ? canFillSlot(
                  selectedPlayer.mainPosition as Position,
                  selectedPlayer.otherPositions as Position[],
                  slot.position as Position,
                ).canFill
              : false;

          // Is this an incompatible empty slot while a player is selected?
          const isIncompatible = !!selectedPlayer && !isFilled && !isCompatible;

          // Is this a valid target while moving?
          const isMoveTarget = movingTargets.has(index) && movingPlayerSlotIndex !== index;

          // Compatibility info for filled slot
          let compatKind: 'full' | 'partial' | null = null;
          let effectiveRating = slot.playerRating;
          if (isFilled && slot.playerPosition) {
            const { penalty } = canFillSlot(
              slot.playerPosition as Position,
              (slot.playerOtherPositions ?? []) as Position[],
              slot.position as Position,
            );
            if (penalty === 1) compatKind = 'full';
            else if (penalty === 0.8) {
              compatKind = 'partial';
              if (slot.playerRating) effectiveRating = Math.round(slot.playerRating * 0.8);
            }
          }

          return (
            <motion.button
              key={index}
              onClick={() => handleSlotClick(index)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                isMoving ? 'z-20' : isMoveTarget ? 'z-10' : ''
              } ${isShaking ? 'animate-shake' : ''} ${isJustAssigned ? 'z-30' : ''}`}
              style={{
                top: `${pos.row}%`,
                left: `${pos.col}%`,
              }}
              whileTap={isFilled || isCompatible || isMoveTarget ? { scale: 0.9 } : undefined}
              aria-label={
                isFilled
                  ? `${slot.playerName ?? 'Игрок'}, ${slot.positionLabel}, рейтинг ${effectiveRating ?? '?'}`
                  : `Пустая позиция ${slot.positionLabel}`
              }
            >
              {/* Just-assigned glow burst */}
              {isJustAssigned && (
                <motion.div
                  className="absolute inset-0 rounded-md"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: [0.7, 1.6, 2, 1.5], opacity: [0, 0.7, 0.3, 0] }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{
                    boxShadow: `0 0 16px 6px ${color}, 0 0 32px 12px ${color}44`,
                    border: `2px solid ${color}`,
                  }}
                />
              )}

              {/* Position card — small rounded rectangle */}
              <div
                className={`
                  relative flex flex-col items-center justify-center
                  rounded-md transition-all duration-200 cursor-pointer select-none
                  ${isJustAssigned ? 'animate-slot-assigned' : ''}
                  ${isShaking ? 'animate-shake' : ''}
                `}
                style={{
                  width: isFilled ? '48px' : '34px',
                  height: isFilled ? '36px' : '26px',
                  backgroundColor: isFilled
                    ? `${color}cc`
                    : isIncompatible
                    ? `${color}10`
                    : isCompatible || isMoveTarget
                    ? `${color}30`
                    : `${color}18`,
                  border: isFilled
                    ? `2px solid ${color}`
                    : isCompatible && !isFilled
                    ? '2px solid #22c55e'
                    : isMoveTarget
                    ? '2px solid #22c55e'
                    : isIncompatible
                    ? '1px dashed rgba(239,68,68,0.3)'
                    : '1px dashed rgba(255,255,255,0.2)',
                  boxShadow: isFilled
                    ? `0 0 0 2px ${color}88, 0 2px 6px rgba(0,0,0,0.4)`
                    : isCompatible && !isFilled
                    ? '0 0 8px 2px rgba(34,197,94,0.5), 0 0 16px 4px rgba(34,197,94,0.2)'
                    : isMoveTarget
                    ? '0 0 8px 2px rgba(34,197,94,0.5), 0 0 16px 4px rgba(34,197,94,0.2)'
                    : undefined,
                  animation: isCompatible && !isFilled
                    ? 'strongGreenPulse 1.2s ease-in-out infinite'
                    : isMoveTarget
                    ? 'strongGreenPulse 1.2s ease-in-out infinite'
                    : !isFilled && !isIncompatible
                    ? 'emptySlotPulse 3s ease-in-out infinite'
                    : undefined,
                }}
              >
                {isFilled ? (
                  <>
                    {/* Rating number — colored by rating tier */}
                    {slot.playerRating && (
                      <span
                        className="text-[9px] font-black leading-none"
                        style={{
                          color: getRatingColor(effectiveRating ?? slot.playerRating),
                          opacity: compatKind === 'partial' ? 0.8 : 1,
                        }}
                      >
                        {effectiveRating ?? slot.playerRating}
                      </span>
                    )}
                    {/* 2-letter initials + flag */}
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <span
                        className="text-[7px] font-bold text-white/90 leading-none"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
                      >
                        {getInitials(slot.playerLastName, slot.playerName)}
                      </span>
                      {getNationalityFlag(slot.playerNationality) && (
                        <span className="text-[6px] leading-none">
                          {getNationalityFlag(slot.playerNationality)}
                        </span>
                      )}
                    </div>
                    {/* Position tag */}
                    <span
                      className="text-[5px] font-semibold leading-none mt-px px-1 py-px rounded-sm"
                      style={{
                        backgroundColor: `${color}44`,
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {slot.positionLabel}
                    </span>
                    {/* Partial compatibility indicator */}
                    {compatKind === 'partial' && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#facc15] flex items-center justify-center text-[5px] font-black text-black border border-black/20">
                        !
                      </span>
                    )}
                  </>
                ) : isIncompatible ? (
                  <span className="text-[7px] font-bold text-[#ef4444]/40">{slot.positionLabel}</span>
                ) : (
                  <span
                    className={`text-[7px] font-bold ${
                      isCompatible || isMoveTarget ? 'text-[#22c55e]' : 'text-white/40'
                    }`}
                  >
                    {slot.positionLabel}
                  </span>
                )}

                {/* Moving indicator ring */}
                {isMoving && (
                  <div
                    className="absolute -inset-1 rounded-md border-2 border-[#facc15] animate-pulse"
                    style={{ boxShadow: '0 0 8px 2px rgba(250,204,21,0.4)' }}
                  />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Bottom info bar */}
      <div className="flex items-center justify-between w-full mt-2 px-1" style={{ maxWidth: '400px' }}>
        {/* Filled count */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#94a3b8]">
            <span className="font-bold text-[#22c55e]">{filledCount}</span>/11
          </span>
          {avgRating !== null && (
            <span className="text-[10px] text-[#94a3b8]">
              · Ср. <span className="font-bold text-white">{avgRating}</span>
            </span>
          )}
        </div>

        {/* Move player button */}
        {canMove && filledCount > 0 && movingPlayerSlotIndex === null && (
          <button
            onClick={() => useGameStore.setState({ movingPlayerSlotIndex: -1 })}
            className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors active:scale-95"
          >
            Переставить игрока
          </button>
        )}

        {/* Cancel moving */}
        {movingPlayerSlotIndex !== null && (
          <button
            onClick={() => finishMoving()}
            className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/20 transition-colors active:scale-95"
          >
            Отмена
          </button>
        )}
      </div>

      {/* Position Legend — matching 38-0 style */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mt-2 flex-wrap" style={{ maxWidth: '400px' }}>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316', boxShadow: '0 0 4px #f97316' }} />
          <span className="text-[9px] text-[#94a3b8]">ВР</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6', boxShadow: '0 0 4px #3b82f6' }} />
          <span className="text-[9px] text-[#94a3b8]">Защита</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
          <span className="text-[9px] text-[#94a3b8]">Полузащита</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444', boxShadow: '0 0 4px #ef4444' }} />
          <span className="text-[9px] text-[#94a3b8]">Атака</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#64748b', boxShadow: '0 0 4px #64748b' }} />
          <span className="text-[9px] text-[#94a3b8]">Не может играть</span>
        </div>
      </div>
    </div>
  );
}
