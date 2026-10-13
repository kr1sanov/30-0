"use client";
import { translateClient } from "@/lib/enTranslations";
import { useEffect, useState } from "react";
type User = {
  id: string;
  username: string | null;
  displayName: string;
  restriction: { reason: string; until: string | null } | null;
};
type Action = {
  id: string;
  userId: string;
  actor: string;
  action: string;
  reason: string;
  createdAt: string;
};
export default function AdminModeration({ editable }: { editable: boolean }) {
  const [q, setQ] = useState(""),
    [users, setUsers] = useState<User[]>([]),
    [history, setHistory] = useState<Action[]>([]),
    [selected, setSelected] = useState<User | null>(null),
    [reason, setReason] = useState("Оскорбления или травля"),
    [duration, setDuration] = useState("1d"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load(query = q) {
    const res = await fetch(
      "/api/admin/moderation?q=" + encodeURIComponent(query),
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setUsers(data.users);
    setHistory(data.history);
  }
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/admin/moderation?q=" + encodeURIComponent(q), {
        signal: controller.signal,
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setUsers(data.users);
          setHistory(data.history);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);
  async function act(action: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, action, reason, duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }
  const input = "min-h-11 rounded-xl border border-white/15 bg-black/30 p-3";
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">
Модерация игроков
</h2>
      <p className="text-sm text-white/50">
Поиск по нику, имени или ID. Без поиска показаны игроки с историей модерации. Блокировка ограничивает игровые действия; прогресс сохраняется.
</p>
      <input
        aria-label="Поиск игроков"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="@ник или ID игрока"
        className={`${input} w-full max-w-lg`}
      />
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-white/10 p-4">
              <strong>{u.username ? `@${u.username}` : u.displayName}</strong>
              <p className="mt-1 break-all text-xs text-white/40">{u.id}</p>
              <p className="mt-2 text-sm text-white/60">
                {u.restriction
                  ? `${u.restriction.reason} · ${u.restriction.until ? new Date(u.restriction.until).toLocaleString() : "Бессрочно"}`
                  : "Нет активной блокировки"}
              </p>
              {editable && (
                <button
                  onClick={() => {
                    setSelected(u);
                    setReason(
                      u.restriction
                        ? "Ограничение пересмотрено"
                        : "Оскорбления или травля",
                    );
                  }}
                  className={`${input} mt-3`}
                >
Управлять ограничением
</button>
              )}
            </div>
          ))}
          {!users.length && (
            <p className="text-white/50">
Игроки не найдены.
</p>
          )}
        </div>
        {selected && editable && (
          <form
            className="h-fit space-y-3 rounded-2xl border border-white/15 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                confirm(
                  translateClient(`Заблокировать ${selected.username || selected.displayName} на ${duration}? Причина: ${reason}`),
                )
              )
                void act("ban");
            }}
          >
            <h3 className="font-bold">
              {selected.username
                ? `@${selected.username}`
                : selected.displayName}
            </h3>
            <label className="block text-sm">
Причина
<select
                className={`${input} mt-1 w-full`}
                onChange={(e) => setReason(e.target.value)}
                value={
                  [
                    "Оскорбления или травля",
                    "Нарушение правил проекта",
                    "Спам",
                    "Нечестная игра",
                  ].includes(reason)
                    ? reason
                    : ""
                }
              >
                <option value="">
Своя причина
</option>
                {[
                  "Оскорбления или травля",
                  "Нарушение правил проекта",
                  "Спам",
                  "Нечестная игра",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <textarea
                required
                minLength={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`${input} mt-2 w-full`}
              />
            </label>
            <label className="block text-sm">
Срок
<select
                className={`${input} mt-1 w-full`}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                {[
                  ["1h", "1 час"],
                  ["1d", "1 день"],
                  ["3d", "3 дня"],
                  ["7d", "1 неделя"],
                  ["30d", "30 дней"],
                  ["permanent", "Бессрочно"],
                ].map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} className={`${input} text-red-300`}>
Заблокировать игрока
</button>
              {selected.restriction && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act("unban")}
                  className={`${input} text-emerald-300`}
                >
Снять блокировку
</button>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={input}
              >
Отмена
</button>
            </div>
          </form>
        )}
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-3">
История модерации
</summary>
        <div className="space-y-2">
          {history.map((h) => (
            <p key={h.id} className="rounded-lg bg-white/5 p-3 text-xs">
              <strong>{h.action}</strong> · {h.reason}
              <br />
              {h.actor} · {new Date(h.createdAt).toLocaleString()} · {h.userId}
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}
