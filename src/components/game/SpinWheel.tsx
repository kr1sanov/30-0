"use client";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Loader2 } from "lucide-react";
import { useUiTranslation } from "@/hooks/use-ui-translation";
import { useGameStore } from "@/store/gameStore";
import { useTelegram } from "@/hooks/use-telegram";
import { useFootballNames } from "@/hooks/use-football-names";
import { Metrics } from "@/lib/metrics";
import type { SpinResult } from "@/lib/types";

export const RPL_CLUBS = [
  "Крылья Советов",
  "Локомотив",
  "Анжи",
  "Спартак",
  "Торпедо",
  "Зенит",
  "Кубань",
  "СКА-Хабаровск",
  "Спартак-Нальчик",
  "Мордовия",
  "Ахмат",
  "Сатурн",
  "Рубин",
  "Москва",
  "Алания",
  "Ростов",
  "Томь",
  "Амкар",
  "Химки",
  "Арсенал Тула",
  "Уфа",
  "Урал",
  "Сибирь",
  "Волга",
  "Краснодар",
  "Оренбург",
  "Тосно",
  "Енисей",
  "Тамбов",
  "Сочи",
  "Пари НН",
  "Динамо",
  "ЦСКА",
  "Шинник",
  "Луч-Энергия",
  "Терек",
  "Торпедо",
  "Москва",
  "Химки",
  "Ростов",
  "Зенит",
  "Крылья Советов",
];

export const RPL_SEASONS = [
  "2006",
  "2007",
  "2008",
  "2009",
  "2010",
  "2011",
  "2012",
  "2013",
  "2014",
  "2015",
  "2016",
  "2017",
  "2018",
  "2019",
  "2020",
  "2021",
  "2022",
  "2023",
  "2024",
  "2025",
  "2026",
];

interface SlotReelProps {
  items: string[];
  targetItem: string | null;
  isSpinning: boolean;
  hasResult: boolean;
  accentColor: string;
  label: string;
  resultColor?: string;
  onSettled?: () => void;
  duration?: number;
}
export function SlotReel({
  items,
  targetItem,
  isSpinning,
  hasResult,
  accentColor,
  label,
  resultColor = "#ffffff",
  onSettled,
  duration = 0.65,
}: SlotReelProps) {
  const t = useUiTranslation();
  const { club: clubName } = useFootballNames();
  const reduced = useReducedMotion();
  const result = hasResult && !isSpinning && targetItem !== null;
  useEffect(() => {
    if (reduced && result) onSettled?.();
  }, [reduced, result, onSettled]);
  // One continuous vertical strip: no overlapping entering/exiting text nodes.
  const rows = [...items.slice(0, 8), result ? targetItem : items[0]];
  return (
    <div data-no-translate className="min-w-0 flex-1">
      <div className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {t(label)}
      </div>
      <div
        className="relative h-14 overflow-hidden rounded-lg border border-white/15 bg-[#101019]"
        style={{ borderColor: result ? accentColor + "60" : undefined }}
      >
        {reduced || (!isSpinning && !hasResult) ? (
          <div
            className="flex h-14 items-center justify-center px-2 text-center text-sm font-bold"
            style={{ color: resultColor }}
          >
            {result ? clubName(targetItem) : "—"}
          </div>
        ) : (
          <motion.div
            key={result ? "result:" + targetItem : "rolling"}
            initial={{ y: 0 }}
            animate={{ y: -8 * 56 }}
            transition={
              result
                ? { duration, ease: [0.12, 0.65, 0.2, 1] }
                : { duration: 0.5, ease: "linear", repeat: Infinity }
            }
            onAnimationComplete={result ? onSettled : undefined}
            style={{ willChange: "transform" }}
          >
            {rows.map((item, index) => (
              <div
                key={index}
                className="flex h-14 items-center justify-center px-2 text-center text-sm font-bold leading-tight"
                style={{
                  color: index === 8 && result ? resultColor : "#94a3b8",
                }}
              >
                {clubName(item)}
              </div>
            ))}
          </motion.div>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-[#101019] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-[#101019] to-transparent"
        />
      </div>
    </div>
  );
}

export default function SpinWheel({
  multiplayer,
  children,
}: {
  children?: ReactNode;
  multiplayer?: {
    currentSpin: SpinResult | null;
    isSpinning: boolean;
    rerollsLeft: number;
    openCount: number;
    disabled: boolean;
    onSpin: () => Promise<void>;
    onReroll: () => Promise<void>;
  };
}) {
  const t = useUiTranslation();
  const store = useGameStore();
  const currentSpin = multiplayer ? multiplayer.currentSpin : store.currentSpin;
  const isSpinning = multiplayer ? multiplayer.isSpinning : store.isSpinning;
  const spin = multiplayer?.onSpin ?? store.spin;
  const reroll = multiplayer?.onReroll ?? store.reroll;
  const rerollsLeft = multiplayer ? multiplayer.rerollsLeft : store.rerollsLeft;
  const openCount = multiplayer
    ? multiplayer.openCount
    : store.slots.filter((slot) => !slot.playerId).length;
  const { haptic } = useTelegram();
  const spinKey = currentSpin
    ? JSON.stringify([
        currentSpin.clubSeasonId,
        currentSpin.seasonLabel,
        currentSpin.players.map((player) => player.playerSeasonId),
      ])
    : "";
  const [settled, setSettled] = useState<{ key: string; mask: number }>({
    key: "",
    mask: 0,
  });
  const clubSettled = useCallback(
    () =>
      setSettled((previous) => ({
        key: spinKey,
        mask: (previous.key === spinKey ? previous.mask : 0) | 1,
      })),
    [spinKey],
  );
  const seasonSettled = useCallback(
    () =>
      setSettled((previous) => ({
        key: spinKey,
        mask: (previous.key === spinKey ? previous.mask : 0) | 2,
      })),
    [spinKey],
  );
  const ready =
    !!currentSpin &&
    !isSpinning &&
    settled.key === spinKey &&
    settled.mask === 3;
  const animating = isSpinning || (!!currentSpin && !ready);
  const handleSpin = useCallback(async () => {
    if (animating || multiplayer?.disabled) return;
    setSettled({ key: "", mask: 0 });
    haptic("medium");
    await spin();
    const result =
      multiplayer?.currentSpin ?? useGameStore.getState().currentSpin;
    if (result) Metrics.spinWheel(result.clubName, result.seasonLabel);
  }, [animating, multiplayer, spin, haptic]);
  const handleReroll = async () => {
    if (animating || rerollsLeft <= 0 || multiplayer?.disabled) return;
    setSettled({ key: "", mask: 0 });
    haptic("light");
    await reroll();
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest("button,input,textarea,select,a") ||
          event.target.isContentEditable)
      )
        return;
      if (
        event.code === "Space" &&
        !currentSpin &&
        !animating &&
        !multiplayer?.disabled
      ) {
        event.preventDefault();
        void handleSpin();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [currentSpin, animating, multiplayer?.disabled, handleSpin]);
  return (
    <div className="space-y-4">
      <section
        data-no-translate
        aria-busy={animating}
        className="rounded-xl border border-white/10 bg-[#101014] p-4 sm:p-5"
      >
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {t(ready ? "СОСТАВ ВЫПАЛ" : "КРУТИТЕ КОЛЕСО")}
        </h2>
        <p className="mt-1 text-sm font-semibold text-white">
          {t("Позиций осталось")}: {openCount}/11
        </p>
        <div className="mx-auto my-5 flex w-full max-w-md items-end gap-3">
          <SlotReel
            items={RPL_CLUBS}
            targetItem={currentSpin?.clubName ?? null}
            isSpinning={isSpinning}
            hasResult={!!currentSpin}
            accentColor="#3b82f6"
            label="Клуб"
            onSettled={clubSettled}
          />
          <span aria-hidden className="pb-4 text-slate-600">
            ×
          </span>
          <SlotReel
            items={RPL_SEASONS}
            targetItem={currentSpin?.seasonLabel ?? null}
            isSpinning={isSpinning}
            hasResult={!!currentSpin}
            accentColor="#fbbf24"
            label="Сезон"
            resultColor="#fbbf24"
            duration={0.8}
            onSettled={seasonSettled}
          />
        </div>
        <div className="min-h-[76px] text-center">
          {animating ? (
            <div
              role="status"
              className="flex h-11 items-center justify-center gap-2 text-sm text-slate-300"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("Крутим...")}
            </div>
          ) : ready ? (
            <>
              <p className="mb-2 text-xs text-slate-400">
                {t("Выбери игрока и позицию, куда его поставить")}
              </p>
              {rerollsLeft > 0 && (
                <button
                  onClick={handleReroll}
                  disabled={multiplayer?.disabled}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-400/30 px-4 text-xs font-bold text-amber-300 disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("Переброс")} · {rerollsLeft}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleSpin}
                disabled={multiplayer?.disabled || openCount === 0}
                className="min-h-11 rounded-lg px-7 text-sm font-bold disabled:opacity-40"
                style={{
                  backgroundColor: "var(--club-primary)",
                  color: "var(--club-on-primary)",
                }}
              >
                {t("🎰 Крутить")}
              </button>
              <p className="mt-2 text-[11px] text-slate-500">
                {t("Нажми «Крутить» или пробел")}
              </p>
            </>
          )}
        </div>
      </section>
      <div className="draft-player-panel mt-3 h-[380px] overflow-y-auto overscroll-contain rounded-xl lg:mt-0 lg:h-auto lg:overflow-visible" aria-live="polite">{ready && children}</div>
    </div>
  );
}
