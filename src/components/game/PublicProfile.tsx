"use client";
import { russianClubName } from "@/lib/clubDisplayName";
import { useUiTranslation, useUiLanguage } from "@/hooks/use-ui-translation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TelegramAvatar from "./TelegramAvatar";
import { useTelegram } from "@/hooks/use-telegram";
import { sharePlayerProfile } from "@/lib/sharePlayerProfile";
import { playerPath } from "@/lib/profileLinks";
import { trophySections, trophySection } from "@/lib/trophySections";
import { TROPHIES } from "@/lib/trophyCatalog";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";

type Friend = {
  id: string;
  displayName: string;
  photoUrl?: string | null;
  username: string | null;
};
type Player = {
  id: string;
  path: string;
  displayName: string;
  photoUrl?: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  seasons: number;
  titles: number;
  perfectSeasons: number;
  bestPoints: number;
  totalWins: number;
  totalGoals: number;
  avgGoals: number;
  winRate: number;
  favoriteFormation: string | null;
  favoriteClub: {
    nameRu: string;
    nameEn: string | null;
    logoUrl: string | null;
    games: number;
    colors: { primary: string; secondary: string };
  } | null;
  achievements: string[];
  friends: Friend[];
  modes: Record<string, number>;
  friendshipStatus: "none" | "friends" | "incoming" | "outgoing";
  own: boolean;
};

export default function PublicProfile({ id }: { id: string }) {
  const t = useUiTranslation();
  const locale = useUiLanguage() === "en" ? "en-GB" : "ru-RU";
  const router = useRouter();
  const { showBackButton, hideBackButton } = useTelegram();
  const [player, setPlayer] = useState<Player | null>(null);
  const [preview, setPreview] = useState<Player | null>(null);
  const [allFriends, setAllFriends] = useState(false);
  const [section, setSection] = useState("all");
  const [allTrophies, setAllTrophies] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const openPreview = async (friend: Friend) => {
    try {
      const r = await fetch(
        `/api/social/players/${encodeURIComponent(friend.id)}`,
        { cache: "no-store" },
      );
      if (!r.ok) throw new Error();
      setPreview(await r.json());
    } catch {
      toast.error("Не удалось открыть игрока");
    }
  };
  const back = useCallback(() => {
    if (history.length > 1) router.back();
    else router.push("/");
  }, [router]);
  useEffect(() => {
    showBackButton(back);
    return () => hideBackButton(back);
  }, [back, showBackButton, hideBackButton]);
  const refresh = useCallback(() => {
    fetch(`/api/social/players/${encodeURIComponent(id)}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Игрок не найден");
        return r.json();
      })
      .then(setPlayer)
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (player?.path && location.pathname !== player.path)
      history.replaceState(null, "", player.path);
  }, [player?.path]);
  const friendAction = async (
    person: Pick<Player, "id" | "friendshipStatus">,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const status = person.friendshipStatus;
      const r = await fetch("/api/social/friends", {
        method:
          status === "friends" || status === "outgoing"
            ? "DELETE"
            : status === "incoming"
              ? "PATCH"
              : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          status === "incoming"
            ? { id: person.id, action: "accept" }
            : { id: person.id },
        ),
      });
      if (!r.ok)
        throw new Error(
          r.status === 401
            ? "Авторизуйся, чтобы отправить заявку"
            : "Не удалось сохранить заявку",
        );
      refresh();
      if (preview?.id === person.id)
        setPreview({
          ...preview,
          friendshipStatus:
            status === "incoming"
              ? "friends"
              : status === "none"
                ? "outgoing"
                : "none",
        });
      toast.success(
        status === "none"
          ? "Заявка в друзья отправлена"
          : status === "incoming"
            ? "Заявка принята"
            : status === "outgoing"
              ? "Заявка отменена"
              : "Друг удалён",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const invite = async (toId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/multiplayer/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Не удалось пригласить игрока");
      toast.success("Приглашение отправлено");
      router.push(`/multiplayer?room=${data.code}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };
  const share = async () => {
    if (player) await sharePlayerProfile(player);
  };
  const stats = player
    ? [
        [player.seasons, "Всего сезонов"],
        [player.bestPoints, "Лучший результат"],
        [player.titles, "Титулы"],
        [`${player.winRate}%`, "Процент побед"],
        [player.totalWins, "Всего побед"],
        [player.totalGoals, "Всего голов"],
        [player.avgGoals, "Среднее голов за сезон"],
        [player.favoriteFormation || "—", "Часто используемая схема"],
      ]
    : [];
  const trophies = player
    ? TROPHIES.filter(
        (t) =>
          player.achievements.includes(t.id) &&
          (section === "all" || trophySection(t.id) === section),
      )
    : [];
  return (
    <div className="min-h-screen bg-[#080b10] text-white">
      <Header
        onBack={back}
        onProfile={() => {
          useGameStore.getState().setScreen("profile");
          router.push("/");
        }}
      />
      <main
        data-no-translate
        className="mx-auto max-w-4xl space-y-5 px-4 py-8 pb-28 sm:py-10"
      >
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 p-4">
            {error}
          </p>
        )}
        {!player && !error && <p>{t("Загружаем профиль…")}</p>}
        {player && (
          <>
            <section className="rounded-3xl border border-white/10 bg-[#141414] p-6 text-center">
              <div className="relative mx-auto w-fit">
                <TelegramAvatar
                  id={player.id}
                  photoUrl={player.photoUrl}
                  username={player.username}
                  name={player.displayName}
                  size={92}
                />
              </div>
              <h1 className="mt-3 text-2xl font-black">
                {player.username ? `@${player.username}` : player.displayName}
              </h1>
              {(player.firstName || player.lastName) && (
                <p className="mt-1 text-slate-300">
                  {[player.firstName, player.lastName]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {t("В игре с")}{" "}
                {new Date(player.createdAt).toLocaleDateString(locale)}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {!player.own && (
                  <button
                    disabled={busy}
                    onClick={() => void friendAction(player)}
                    className="rounded-xl bg-[#00C896] px-4 py-2 font-bold text-black disabled:opacity-50"
                  >
                    {player.friendshipStatus === "friends"
                      ? t("✓ В друзьях · удалить")
                      : player.friendshipStatus === "incoming"
                        ? t("✓ Принять заявку")
                        : player.friendshipStatus === "outgoing"
                          ? t("Отменить заявку")
                          : t("+ Добавить в друзья")}
                  </button>
                )}
                <button
                  onClick={() => void share()}
                  className="rounded-xl border border-white/20 px-4 py-2"
                >
                  {t("Поделиться профилем")}
                </button>
                {!player.own && (
                  <button
                    disabled={busy}
                    onClick={() => void invite(player.id)}
                    className="rounded-xl border border-[#00C896]/50 px-4 py-2 text-[#00C896] disabled:opacity-50"
                  >
                    {t("Пригласить в игру")}
                  </button>
                )}
              </div>
            </section>
            {player.favoriteClub && (
              <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
                <div
                  className="flex items-center gap-4 p-5"
                  style={{
                    background: `linear-gradient(120deg, ${player.favoriteClub.colors.primary}55, ${player.favoriteClub.colors.secondary}44, #141414)`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/40 text-xl font-black shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${player.favoriteClub.colors.primary} 50%, ${player.favoriteClub.colors.secondary} 50%)`,
                    }}
                  >
                    {player.favoriteClub.logoUrl?.startsWith("https://") ? (
                      <img
                        src={player.favoriteClub.logoUrl}
                        alt={player.favoriteClub.nameRu}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      player.favoriteClub.nameRu.slice(0, 2).toLocaleUpperCase()
                    )}
                  </span>
                  <div>
                    <h2 className="font-bold">
                      {t("Любимый клуб ·")}{" "}
                      <span data-no-translate>
                        {t(russianClubName(player.favoriteClub.nameRu))}
                      </span>
                    </h2>
                    <p className="text-sm text-slate-300">
                      {player.favoriteClub.games}{" "}
                      {t(" сезонов в режиме «Один клуб»")}
                    </p>
                  </div>
                </div>
              </section>
            )}
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {stats.map(([value, label]) => (
                <div
                  key={t(String(label))}
                  className="rounded-xl border border-white/5 bg-[#141414] p-3 text-center"
                >
                  <strong className="block text-xl text-[#00C896]">
                    {value}
                  </strong>
                  <span className="text-xs text-slate-400">
                    {t(String(label))}
                  </span>
                </div>
              ))}
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h2 className="font-bold">
                {t("Друзья · ")}
                {player.friends.length}
              </h2>
              {player.friends.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {player.friends
                    .slice(0, allFriends ? undefined : 3)
                    .map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => void openPreview(friend)}
                        className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-[#00C896]"
                      >
                        <TelegramAvatar
                          id={friend.id}
                          photoUrl={friend.photoUrl}
                          username={friend.username}
                          name={friend.displayName}
                          size={32}
                        />
                        {friend.username
                          ? `@${friend.username}`
                          : friend.displayName}
                      </button>
                    ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  {t("Пока нет друзей.")}
                </p>
              )}
              {player.friends.length > 3 && (
                <button
                  type="button"
                  onClick={() => setAllFriends((value) => !value)}
                  aria-expanded={allFriends}
                  className="mt-3 text-sm font-semibold text-[#00C896]"
                >
                  {allFriends ? t("Скрыть") : t("Показать всех")}
                </button>
              )}
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h2 className="font-bold">
                {t("Достижения · ")}
                {trophies.length}
              </h2>
              <div
                aria-label={t("Категории достижений")}
                className="mt-3 flex gap-2 overflow-x-auto pb-2"
              >
                {trophySections.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSection(key);
                      setAllTrophies(false);
                    }}
                    className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-3 text-xs ${section === key ? "border-emerald-400 text-emerald-300" : "border-white/15 text-white/60"}`}
                  >
                    {t(String(label))}
                  </button>
                ))}
              </div>
              {trophies.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {trophies
                    .slice(0, allTrophies ? undefined : 6)
                    .map((trophy, index) => (
                      <div
                        key={trophy.id}
                        className={`${!allTrophies && index >= 4 ? "hidden sm:block" : ""} rounded-xl border border-amber-400/20 bg-amber-500/10 p-3`}
                      >
                        <span className="text-xl">{trophy.icon}</span>
                        <strong className="ml-2 text-sm text-white">
                          {t(trophy.name)}
                        </strong>
                        <p className="mt-1 text-xs text-slate-300">
                          {t(trophy.desc)}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  {t("Пока нет достижений.")}
                </p>
              )}
              {trophies.length > 4 && (
                <button
                  type="button"
                  onClick={() => setAllTrophies((value) => !value)}
                  aria-expanded={allTrophies}
                  className={`mt-3 text-sm font-semibold text-[#00C896] ${!allTrophies && trophies.length <= 6 ? "sm:hidden" : ""}`}
                >
                  {allTrophies ? t("Скрыть") : t("Показать все")}
                </button>
              )}
            </section>
          </>
        )}
        {preview && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPreview(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("Игрок")}
              className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#171717] p-5 text-center shadow-xl"
            >
              <div className="flex justify-end">
                <button
                  aria-label={t("Закрыть")}
                  onClick={() => setPreview(null)}
                >
                  {t("✕")}
                </button>
              </div>
              <TelegramAvatar
                id={preview.id}
                photoUrl={preview.photoUrl}
                username={preview.username}
                name={preview.displayName}
                size={72}
              />
              <h3 className="mt-3 text-xl font-bold">
                {preview.username
                  ? `@${preview.username}`
                  : preview.displayName}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {t(`${preview.seasons} сезонов · ${preview.titles} титулов`)}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {!preview.own && (
                  <button
                    disabled={busy}
                    onClick={() => void friendAction(preview)}
                    className="rounded-lg bg-[#00C896] px-3 py-2 text-sm font-bold text-black"
                  >
                    {preview.friendshipStatus === "friends"
                      ? t("Удалить из друзей")
                      : preview.friendshipStatus === "outgoing"
                        ? t("Отменить заявку")
                        : preview.friendshipStatus === "incoming"
                          ? t("Принять заявку")
                          : t("Добавить в друзья")}
                  </button>
                )}
                <Link
                  href={playerPath(preview)}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm"
                >
                  {t("Полный профиль")}
                </Link>
                {!preview.own && (
                  <button
                    disabled={busy}
                    onClick={() => void invite(preview.id)}
                    className="rounded-lg border border-[#00C896]/40 px-3 py-2 text-sm text-[#00C896]"
                  >
                    {t("Пригласить")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
