"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useUiTranslation } from "@/hooks/use-ui-translation";
import { playerPath } from "@/lib/profileLinks";
import TelegramAvatar from "./TelegramAvatar";

type Friend = {
  id: string;
  displayName: string;
  username: string | null;
  photoUrl?: string | null;
};
type Group = "friends" | "incoming" | "outgoing" | "search";
type Lists = Record<Exclude<Group, "search">, Friend[]>;
const empty: Lists = { friends: [], incoming: [], outgoing: [] };

export default function FriendsPanel() {
  const t = useUiTranslation();
  const [lists, setLists] = useState<Lists>(empty);
  const [group, setGroup] = useState<Group>("friends");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/social/friends", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setLists({
        friends: data.friends ?? [],
        incoming: data.incoming ?? [],
        outgoing: data.outgoing ?? [],
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    const term = query.trim().replace(/^@/, "");
    setResults([]);
    setSearchError(false);
    if (!/^[A-Za-z0-9_]{2,32}$/.test(term)) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/social/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setResults(data.players ?? []);
      } catch {
        if (!controller.signal.aborted) setSearchError(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  async function action(id: string, method: string, responseAction?: string) {
    if (busy) return;
    setBusy(id);
    try {
      const response = await fetch("/api/social/friends", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: responseAction }),
      });
      if (!response.ok) throw new Error();
      toast.success(t(
        method === "POST"
          ? "Заявка в друзья отправлена"
          : responseAction === "accept"
            ? "Заявка принята"
            : method === "DELETE"
              ? "Заявка отменена"
              : "Заявка отклонена",
      ));
      await load();
    } catch {
      toast.error(t("Не удалось обработать заявку"));
    } finally {
      setBusy(null);
    }
  }
  const rows = group === "search" ? results : lists[group];
  const visible = expanded || group !== "friends" ? rows : rows.slice(0, 3);
  return (
    <section data-no-translate className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
      <h3 className="text-sm font-bold text-white">{t('Друзья')}</h3>
      <p className="mt-1 text-xs text-slate-400">
        {t('Найди игрока по никнейму и добавь в друзья.')}
      </p>
      <div
        className="mt-4 flex gap-2 overflow-x-auto pb-2"
        aria-label={t("Разделы друзей")}
      >
        {(["friends", "incoming", "outgoing", "search"] as const).map(
          (key, index) => (
            <button
              type="button"
              key={key}
              aria-pressed={group === key}
              onClick={() => {
                setGroup(key);
                setExpanded(false);
              }}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-2 py-2 text-xs font-semibold ${group === key ? "border-[#00C896] bg-[#00C896]/10 text-[#00C896]" : "border-white/10 text-slate-300"}`}
            >
              {t(["Друзья", "Входящие", "Отправленные", "Найти игрока"][index])}
              {key !== "search" && (
                <span className="ml-1 tabular-nums">{lists[key].length}</span>
              )}
            </button>
          ),
        )}
      </div>
      {group === "search" && (
        <label className="mt-4 block text-xs text-slate-300">
          {t('Никнейм игрока')}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={33}
            placeholder="@nickname"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-base text-white outline-none focus:border-[#00C896]"
          />
        </label>
      )}
      <div
        className="mt-4 space-y-2"
        aria-live="polite"
        aria-busy={group === "search" ? searching : loading}
      >
        {(group === "search" ? searching : loading) ? (
          <p className="text-sm text-slate-400">{t('Загрузка…')}</p>
        ) : (group === "search" ? searchError : error) ? (
          <div className="text-sm text-slate-400">
            {t('Не удалось загрузить игроков')}
            {group !== "search" && (
              <button
                onClick={() => void load()}
                className="ml-2 min-h-11 text-[#00C896]"
              >
                {t('Повторить')}
              </button>
            )}
          </div>
        ) : visible.length ? (
          visible.map((friend) => {
            const status = lists.friends.some((p) => p.id === friend.id)
              ? "friends"
              : lists.incoming.some((p) => p.id === friend.id)
                ? "incoming"
                : lists.outgoing.some((p) => p.id === friend.id)
                  ? "outgoing"
                  : "none";
            return (
              <div
                key={friend.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 p-3"
              >
                <Link
                  data-no-translate
                  href={playerPath(friend)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm text-white"
                >
                  <TelegramAvatar
                    id={friend.id}
                    photoUrl={friend.photoUrl}
                    username={friend.username}
                    name={friend.displayName}
                    size={32}
                  />
                  <span className="truncate">
                    {friend.username
                      ? `@${friend.username}`
                      : friend.displayName}
                  </span>
                </Link>
                {status === "incoming" && (
                  <>
                    <button
                      disabled={busy !== null}
                      onClick={() => void action(friend.id, "PATCH", "accept")}
                      className="min-h-11 rounded-lg bg-[#00C896] px-3 text-xs font-bold text-black disabled:opacity-50"
                    >
                      {t('Принять')}
                    </button>
                    <button
                      disabled={busy !== null}
                      onClick={() => void action(friend.id, "PATCH", "decline")}
                      className="min-h-11 rounded-lg border border-white/20 px-3 text-xs text-white disabled:opacity-50"
                    >
                      {t('Отклонить')}
                    </button>
                  </>
                )}
                {status === "outgoing" && (
                  <button
                    disabled={busy !== null}
                    onClick={() => void action(friend.id, "DELETE")}
                    className="min-h-11 rounded-lg border border-white/20 px-3 text-xs text-white disabled:opacity-50"
                  >
                    {t('Отменить заявку')}
                  </button>
                )}
                {status === "none" && (
                  <button
                    disabled={busy !== null}
                    onClick={() => void action(friend.id, "POST")}
                    className="min-h-11 rounded-lg bg-[#00C896] px-3 text-xs font-bold text-black disabled:opacity-50"
                  >
                    {t('Добавить в друзья')}
                  </button>
                )}
                {status === "friends" && (
                  <span className="text-xs text-[#00C896]">{t('В друзьях')}</span>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-400">
            {t(group === "search"
              ? query.trim().replace(/^@/, "").length < 2
                ? "Введи минимум 2 символа никнейма."
                : "Игроки не найдены"
              : group === "incoming"
                ? "Новых заявок нет"
                : group === "outgoing"
                  ? "Отправленных заявок нет"
                  : "Пока нет друзей.")}
          </p>
        )}
      </div>
      {group === "friends" && rows.length > 3 && (
        <button
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 min-h-11 text-sm text-[#00C896]"
        >
          {t(expanded ? "Скрыть" : "Показать всех")}
        </button>
      )}
    </section>
  );
}
