'use client';

import { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  POSITION_CATEGORY,
  POSITION_COLOR,
  canFillSlot,
  getCompatiblePositions,
} from '@/lib/positions';
import type { PositionCategory, Position } from '@/lib/positions';
import { motion, AnimatePresence } from 'framer-motion';
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

// Updated rating color tiers (Task 1c):
//   78+: Gold, 73-77: Green, 68-72: Orange, <68: Red
function getRatingColor(rating: number): string {
  if (rating >= 78) return '#fbbf24';
  if (rating >= 73) return '#22c55e';
  if (rating >= 68) return '#f97316';
  return '#ef4444';
}

// Position category ring colors (Task 1a)
const CATEGORY_RING_COLOR: Record<PositionCategory, string> = {
  gk: '#f97316', // orange
  def: '#3b82f6', // blue
  mid: '#22c55e', // green
  att: '#ef4444', // red
};

// Chemistry color mapping (Task 3d)
function getChemistryColor(chem: number): string {
  if (chem >= 100) return '#22c55e';
  if (chem >= 80) return '#a3e635';
  if (chem >= 60) return '#facc15';
  if (chem >= 40) return '#f97316';
  return '#ef4444';
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
  } = useGameStore();

  const [shakingSlot, setShakingSlot] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const layout = FORMATION_LAYOUTS[config.formation] ?? FORMATION_LAYOUTS['4-3-3'];

  const filledCount = slots.filter((s) => s.playerId).length;
  const openCount = 11 - filledCount;

  // Get compatible positions for the selected player
  const compatiblePositions = selectedPlayer
    ? getCompatiblePositions(selectedPlayer.mainPosition as Position)
    : [];

  // Average rating of filled players (with penalty applied)
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

    // If we have a selected player and the slot is empty, try to assign
    if (selectedPlayer && !slot.playerId) {
      const { canFill } = canFillSlot(
        selectedPlayer.mainPosition as Position,
        selectedPlayer.otherPositions as Position[],
        slot.position as Position,
      );
      if (canFill) {
        toast.success(`${selectedPlayer.fullName} назначен на ${slot.positionLabel}`);
        assignToSlot(index);
      } else {
        // Trigger shake animation on incompatible slot
        triggerShake(index);
        toast.error(`${selectedPlayer.fullName} не может играть на позиции ${slot.positionLabel}`);
      }
      return;
    }

    // Move mode logic
    if (movingPlayerSlotIndex !== null) {
      if (movingPlayerSlotIndex === -1) {
        // Move mode active but no player selected yet — select this filled player
        if (slot.playerId) {
          useGameStore.setState({ movingPlayerSlotIndex: index });
        }
        return;
      }

      if (movingPlayerSlotIndex === index) {
        // Deselect — cancel move for this player
        useGameStore.setState({ movingPlayerSlotIndex: -1 });
        return;
      }

      // A player is selected and we clicked another slot
      if (slot.playerId) {
        // Swap the two players
        movePlayer(movingPlayerSlotIndex, index);
      } else {
        // Empty slot — check if the moving player can fill it
        const sourceSlot = slots[movingPlayerSlotIndex];
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
            toast.error(`${sourceSlot.playerName} не может играть на позиции ${slot.positionLabel}`);
          }
        }
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

  // ----- Task 2c: Connection lines from moving source to valid swap/move targets -----
  const swapTargets = useMemo(() => {
    if (movingPlayerSlotIndex === null || movingPlayerSlotIndex < 0) return [];
    const source = layout[movingPlayerSlotIndex];
    if (!source) return [];
    const sourceSlot = slots[movingPlayerSlotIndex];
    const targets: { from: { row: number; col: number }; to: { row: number; col: number }; isEmpty?: boolean }[] = [];
    slots.forEach((s, i) => {
      if (i === movingPlayerSlotIndex) return;
      const to = layout[i];
      if (!to) return;
      if (s.playerId) {
        // Filled slot — swap
        targets.push({ from: source, to });
      } else if (sourceSlot?.playerPosition) {
        // Empty slot — can move if compatible
        const { canFill } = canFillSlot(
          sourceSlot.playerPosition as Position,
          (sourceSlot.playerOtherPositions ?? []) as Position[],
          s.position as Position,
        );
        if (canFill) {
          targets.push({ from: source, to, isEmpty: true });
        }
      }
    });
    return targets;
  }, [movingPlayerSlotIndex, slots, layout]);

  return (
    <div className="relative w-full">
      {/* Compatible positions info bar — only shown when a player is selected */}
      {selectedPlayer && compatiblePositions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 px-3 py-2 rounded-xl bg-[#0d2d0d] border border-[#22c55e]/20 flex items-center gap-2 flex-wrap"
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

      {/* Pitch */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-[#1a5c30]/50 pitch-elevated"
        style={{ paddingBottom: '130%' }}
      >
        {/* Pitch stripe pattern */}
        <div
          className="absolute inset-0 pitch-stripes"
        />

        {/* V-shaped mowing pattern */}
        <div className="absolute inset-0 pitch-mowing-pattern pointer-events-none" aria-hidden />

        {/* Pitch grass texture lines (vertical) */}
        <div className="absolute inset-0 pitch-grass-lines" />

        {/* ===== Task 4a: Diagonal mowing pattern overlay ===== */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(60deg, transparent 0px, transparent 36px, rgba(255,255,255,0.025) 36px, rgba(255,255,255,0.025) 72px)',
          }}
          aria-hidden
        />

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
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-white/20 flex items-center justify-center">
        </div>

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
        {/* ===== Task 4d: Top penalty spot ===== */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/40"
          style={{ top: 'calc(12px + 42px)' }}
          aria-hidden
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
        {/* ===== Task 4d: Bottom penalty spot ===== */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/40"
          style={{ bottom: 'calc(12px + 42px)' }}
          aria-hidden
        />

        {/* Corner arcs */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 w-4 h-4 border-b border-r border-white/15 rounded-br-full" />
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 w-4 h-4 border-b border-l border-white/15 rounded-bl-full" />
        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 w-4 h-4 border-t border-r border-white/15 rounded-tr-full" />
        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 w-4 h-4 border-t border-l border-white/15 rounded-tl-full" />

        {/* ===== Task 2c: SVG connection lines from source slot to valid swap targets ===== */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 130"
          preserveAspectRatio="none"
          aria-hidden
        >
          {swapTargets.map((t, i) => (
            <motion.line
              key={i}
              x1={t.from.col}
              y1={t.from.row * 1.3}
              x2={t.to.col}
              y2={t.to.row * 1.3}
              stroke="rgba(250, 204, 21, 0.7)"
              strokeWidth={0.4}
              strokeDasharray="1.5 1"
              className="animate-swap-line-glow"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
            />
          ))}
        </svg>

        {/* Position Slots */}
        {slots.map((slot, index) => {
          const pos = layout[index];
          if (!pos) return null;

          const category = POSITION_CATEGORY[slot.position as Position] ?? ('mid' as PositionCategory);
          const color = POSITION_COLOR[category];
          const ringColor = CATEGORY_RING_COLOR[category];
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

          // Valid swap target = another filled slot while a move is in progress
          // Also highlight empty slots where the moving player can be placed
          const isSwapTarget =
            movingPlayerSlotIndex !== null &&
            movingPlayerSlotIndex >= 0 &&
            movingPlayerSlotIndex !== index &&
            isFilled;

          // Empty slot that the moving player can fill
          const isMoveTarget =
            movingPlayerSlotIndex !== null &&
            movingPlayerSlotIndex >= 0 &&
            movingPlayerSlotIndex !== index &&
            !isFilled &&
            (() => {
              const sourceSlot = slots[movingPlayerSlotIndex];
              if (!sourceSlot?.playerPosition) return false;
              return canFillSlot(
                sourceSlot.playerPosition as Position,
                (sourceSlot.playerOtherPositions ?? []) as Position[],
                slot.position as Position,
              ).canFill;
            })();

          // ===== Task 1b: Compatibility info for filled slot =====
          let compatKind: 'full' | 'partial' | null = null;
          let effectiveRating = slot.playerRating;
          let baseRating = slot.playerRating;
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

          // Tooltip direction: above if slot is in bottom half, below if in top half
          const tooltipBelow = pos.row < 50;

          // All positions the assigned player can play (for tooltip)
          const playerAllPositions: string[] = isFilled && slot.playerPosition
            ? [slot.playerPosition, ...(slot.playerOtherPositions ?? [])]
            : [];

          return (
            <motion.button
              key={index}
              onClick={() => handleSlotClick(index)}
              onMouseEnter={() => isFilled && setHoveredSlot(index)}
              onMouseLeave={() => setHoveredSlot((prev) => (prev === index ? null : prev))}
              onFocus={() => isFilled && setHoveredSlot(index)}
              onBlur={() => setHoveredSlot((prev) => (prev === index ? null : prev))}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                isSelected ? 'z-20' : isSwapTarget ? 'z-10' : ''
              } ${isShaking ? 'animate-shake' : ''}`}
              style={{
                top: `${pos.row}%`,
                left: `${pos.col}%`,
              }}
              whileTap={isFilled || isCompatible ? { scale: 0.92 } : undefined}
              aria-label={
                isFilled
                  ? `${slot.playerName ?? 'Игрок'}, ${slot.positionLabel}, рейтинг ${slot.playerRating ?? '?'}`
                  : `Пустая позиция ${slot.positionLabel}`
              }
              layout
            >
              <div
                className={`relative flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'border-white/60 backdrop-blur-sm player-inner-glow player-circle-3d animate-subtle-pulse'
                    : isIncompatible
                    ? 'border-[#ef4444]/40 border-dashed animate-empty-slot-pulse'
                    : isMoveTarget
                    ? 'border-[#22c55e] border-dashed animate-strong-pulse-green'
                    : isCompatible && !isFilled
                    ? 'border-[#22c55e] border-dashed animate-strong-pulse-green'
                    : 'border-white/25 border-dashed animate-empty-slot-pulse'
                } ${
                  isSelected
                    ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#1a5c30]'
                    : isSwapTarget
                    ? 'ring-2 ring-yellow-400/70 ring-offset-1 ring-offset-[#1a5c30]'
                    : isMoveTarget
                    ? 'ring-2 ring-[#22c55e]/70 ring-offset-1 ring-offset-[#1a5c30]'
                    : ''
                }`}
                style={{
                  backgroundColor: isFilled
                    ? `${color}dd`
                    : isIncompatible
                    ? `${color}15`
                    : isMoveTarget
                    ? `${color}33`
                    : `${color}22`,
                  // ===== Task 1a: Position color ring (3px outside) on filled slots =====
                  boxShadow: isFilled
                    ? `0 0 0 3px ${ringColor}, 0 4px 10px rgba(0,0,0,0.45)`
                    : undefined,
                }}
              >
                {/* ===== Compatibility badge (top-right) ===== */}
                {isFilled && compatKind && (
                  <div
                    className={`absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black border-2 border-[#0f0f1e] ${
                      compatKind === 'full'
                        ? 'bg-[#22c55e] text-white'
                        : 'bg-[#facc15] text-black'
                    }`}
                    aria-label={
                      compatKind === 'full'
                        ? 'Полная совместимость'
                        : 'Частичная совместимость (-20% к рейтингу)'
                    }
                  >
                    {compatKind === 'full' ? '✓' : '⚠'}
                  </div>
                )}

                {isFilled ? (
                  <>
                    {/* Position label inside circle */}
                    <span
                      className="text-[9px] sm:text-[10px] font-bold text-white/80 leading-none"
                    >
                      {slot.positionLabel}
                    </span>
                    {/* Rating inside circle */}
                    {slot.playerRating ? (
                      <span
                        className="text-[10px] sm:text-xs font-black leading-none mt-0.5"
                        style={{
                          color: getRatingColor(effectiveRating ?? slot.playerRating),
                          opacity: compatKind === 'partial' ? 0.78 : 1,
                        }}
                      >
                        {effectiveRating ?? slot.playerRating}
                      </span>
                    ) : null}
                    {/* Player last name below the circle */}
                    {slot.playerName && (
                      <span
                        className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-bold text-white/80 whitespace-nowrap max-w-[70px] truncate"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                      >
                        {slot.playerLastName || (() => {
                          const parts = slot.playerName!.trim().split(/\s+/);
                          if (parts.length >= 2 && parts[0] === parts[parts.length - 1]) {
                            return parts[0];
                          }
                          return parts[parts.length - 1];
                        })()}
                      </span>
                    )}
                  </>
                ) : isIncompatible ? (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] sm:text-xs font-bold text-[#ef4444]/60 position-label-pill">
                      {slot.positionLabel}
                    </span>
                    <span className="text-[8px] leading-none">❌</span>
                  </div>
                ) : (
                  <span className="text-[10px] sm:text-xs font-bold text-white/60 position-label-pill">
                    {slot.positionLabel}
                  </span>
                )}
              </div>

              {/* ===== Task 1d: Hover Info Tooltip ===== */}
              <AnimatePresence>
                {hoveredSlot === index && isFilled && (
                  <motion.div
                    initial={{ opacity: 0, y: tooltipBelow ? -4 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: tooltipBelow ? -4 : 4 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute left-1/2 -translate-x-1/2 z-30 w-max max-w-[200px] pointer-events-none ${
                      tooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                    }`}
                  >
                    <div className="px-2.5 py-2 rounded-lg bg-[#0f0f1e]/95 border border-white/15 shadow-xl backdrop-blur-sm text-left">
                      {/* Full name */}
                      <div className="text-[11px] font-bold text-white leading-tight mb-1 truncate">
                        {slot.playerName ?? 'Игрок'}
                      </div>

                      {/* All positions they can play */}
                      {playerAllPositions.length > 0 && (
                        <div className="flex items-center gap-1 mb-1 flex-wrap">
                          <span className="text-[9px] text-[#94a3b8]">Позиции:</span>
                          {playerAllPositions.map((p) => (
                            <span
                              key={p}
                              className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                                p === slot.position
                                  ? 'bg-[#22c55e]/25 text-[#4ade80]'
                                  : 'bg-white/5 text-white/60'
                              }`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Rating line — current vs base if penalty applies */}
                      {slot.playerRating && (
                        <div className="text-[9px] text-[#94a3b8]">
                          Рейтинг:{' '}
                          {compatKind === 'partial' && baseRating ? (
                            <>
                              <span className="line-through text-white/40">{baseRating}</span>
                              <span className="ml-1" style={{ color: getRatingColor(effectiveRating ?? slot.playerRating) }}>
                                → {effectiveRating}
                              </span>
                              <span className="ml-1 text-[#facc15]">(-20%)</span>
                            </>
                          ) : (
                            <span className="font-bold" style={{ color: getRatingColor(slot.playerRating) }}>
                              {slot.playerRating}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Arrow */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0f0f1e] border-white/15 ${
                        tooltipBelow
                          ? 'top-0 -translate-y-1/2 -rotate-45 border-t border-l'
                          : 'bottom-0 translate-y-1/2 -rotate-45 border-b border-r'
                      }`}
                      aria-hidden
                    />
                  </motion.div>
                )}
              </AnimatePresence>
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

      {/* Move Player button */}
      {filledCount > 0 && (
        <div className="flex justify-center mt-2">
          <button
            onClick={() => {
              if (movingPlayerSlotIndex !== null) {
                // Cancel move mode
                useGameStore.setState({ movingPlayerSlotIndex: null });
              } else {
                // Enter move mode — next click on a filled slot will select that player
                useGameStore.setState({ movingPlayerSlotIndex: -1 });
              }
            }}
            className="text-xs font-bold px-4 py-2 rounded-xl border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
          >
            {movingPlayerSlotIndex !== null ? '↩ Отменить перемещение' : 'Переместить игрока'}
          </button>
        </div>
      )}

      {/* Squad Info Panel */}
      {filledCount > 0 && (
        <div className="mt-3 rounded-xl bg-[#0d2d0d] p-3 border border-[#1a3a1a]/50">
          <div className="grid grid-cols-5 gap-2 text-center">
            {/* Overall */}
            <div>
              <div className="text-[10px] text-[#94a3b8] mb-0.5">Рейтинг</div>
              <div className="text-sm font-black text-[#e2e8f0]">{avgRating ?? '—'}</div>
            </div>
            {/* Attack */}
            <div>
              <div className="text-[10px] text-[#94a3b8] mb-0.5">Атака</div>
              <div className="text-sm font-black text-[#ef4444]">
                {(() => {
                  const attSlots = slots.filter(s => s.playerId && POSITION_CATEGORY[s.position as Position] === 'att');
                  return attSlots.length > 0 ? Math.round(attSlots.reduce((a, s) => a + (s.playerRating ?? 0), 0) / attSlots.length) : '—';
                })()}
              </div>
            </div>
            {/* Midfield */}
            <div>
              <div className="text-[10px] text-[#94a3b8] mb-0.5">Полузащита</div>
              <div className="text-sm font-black text-[#22c55e]">
                {(() => {
                  const midSlots = slots.filter(s => s.playerId && POSITION_CATEGORY[s.position as Position] === 'mid');
                  return midSlots.length > 0 ? Math.round(midSlots.reduce((a, s) => a + (s.playerRating ?? 0), 0) / midSlots.length) : '—';
                })()}
              </div>
            </div>
            {/* Defense */}
            <div>
              <div className="text-[10px] text-[#94a3b8] mb-0.5">Защита</div>
              <div className="text-sm font-black text-[#3b82f6]">
                {(() => {
                  const defSlots = slots.filter(s => s.playerId && POSITION_CATEGORY[s.position as Position] === 'def');
                  return defSlots.length > 0 ? Math.round(defSlots.reduce((a, s) => a + (s.playerRating ?? 0), 0) / defSlots.length) : '—';
                })()}
              </div>
            </div>
            {/* GK */}
            <div>
              <div className="text-[10px] text-[#94a3b8] mb-0.5">Вратарь</div>
              <div className="text-sm font-black text-[#f97316]">
                {(() => {
                  const gkSlots = slots.filter(s => s.playerId && POSITION_CATEGORY[s.position as Position] === 'gk');
                  return gkSlots.length > 0 ? gkSlots[0].playerRating ?? '—' : '—';
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
