"use client";
import { useEffect, useState } from "react";
import { panel, input, action, secondary, adminApi } from "./adminUi";
type User = {
  id: string;
  username: string | null;
  displayName: string;
  moderationStatus: string;
  restriction: { reason: string; until: string | null } | null;
};
type Entry = {
  id: string;
  userId: string;
  actor: string;
  action: string;
  reason: string;
  createdAt: string;
  until: string | null;
};
const labels: Record<string, string> = {
  ban: "Заблокировать",
  unban: "Снять блокировку",
  warn: "Предупреждение",
  note: "Заметка",
  watch: "На проверку",
  resolve: "Проверено",
  active: "Без ограничений",
  blocked: "Блокировка",
  warned: "Предупреждён",
};
export default function AdminModeration({
  editable,
  initialUserId = "",
}: {
  editable: boolean;
  initialUserId?: string;
}) {
  const [q, setQ] = useState(initialUserId),
    [users, setUsers] = useState<User[]>([]),
    [history, setHistory] = useState<Entry[]>([]),
    [selected, setSelected] = useState<User | null>(null);
  const [kind, setKind] = useState("note"),
    [reason, setReason] = useState(""),
    [duration, setDuration] = useState("1d"),
    [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    const c = new AbortController(),
      t = setTimeout(() => {
        adminApi<{ users: User[]; history: Entry[] }>(
          `/api/admin/moderation?q=${encodeURIComponent(q)}`,
          "GET",
          undefined,
          c.signal,
        )
          .then((d) => {
            setUsers(d.users);
            setHistory(d.history);
            if (initialUserId)
              setSelected(d.users.find((u) => u.id === initialUserId) || null);
          })
          .catch((e) => {
            if (!c.signal.aborted) setError(e.message);
          });
      }, 250);
    return () => {
      c.abort();
      clearTimeout(t);
    };
  }, [q, version, initialUserId]);
  async function submit() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminApi("/api/admin/moderation", "PATCH", {
        userId: selected.id,
        action: kind,
        reason,
        duration,
      });
      setNotice("Действие сохранено в журнале");
      setSelected(null);
      setReason("");
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Модерация</h2>
      <p className="text-sm text-white/55">
        Предупреждения, проверка и ограничения с понятной причиной и журналом.
        Заметки и предупреждения не блокируют игру.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Пользователь
          <input
            className={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ник, имя или ID"
          />
        </label>
        <label className="text-sm">
          Статус
          <select
            className={input}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Все с историей модерации</option>
            <option value="blocked">Заблокированы</option>
            <option value="temporary">Временная блокировка</option>
            <option value="permanent">Бессрочная блокировка</option>
            <option value="watch">На проверке</option>
            <option value="warned">Предупреждены</option>
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-rose-200">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-emerald-200">
          {notice}
        </p>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {users
            .filter(
              (u) =>
                filter === "all" ||
                (filter === "blocked" && u.restriction) ||
                (filter === "temporary" && u.restriction?.until) ||
                (filter === "permanent" &&
                  u.restriction &&
                  !u.restriction.until) ||
                (u.moderationStatus === filter && !u.restriction),
            )
            .map((u) => (
              <article key={u.id} className={panel}>
                <strong>{u.username ? `@${u.username}` : u.displayName}</strong>
                <p
                  className={`mt-2 text-sm ${u.restriction ? "text-rose-200" : "text-white/55"}`}
                >
                  {u.restriction
                    ? `${u.restriction.until ? "До " + new Date(u.restriction.until).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " МСК" : "Бессрочная блокировка"} · ${u.restriction.reason}`
                    : labels[u.moderationStatus] || "Без ограничений"}
                </p>
                {editable && (
                  <button
                    className={`${secondary} mt-3`}
                    onClick={() => {
                      setSelected(u);
                      setReason("");
                      setKind("note");
                    }}
                  >
                    Открыть действия
                  </button>
                )}
              </article>
            ))}
          {!users.length && (
            <p className={panel}>
              Нет записей. Найди пользователя по нику или имени.
            </p>
          )}
        </div>
        {selected && editable && (
          <form
            className={`${panel} space-y-4 lg:sticky lg:top-5`}
            onSubmit={(e) => {
              e.preventDefault();
              if (
                kind !== "ban" ||
                confirm(
                  `Заблокировать ${selected.displayName}? Срок: ${duration}. Причина: ${reason}`,
                )
              )
                void submit();
            }}
          >
            <div className="flex justify-between gap-3">
              <strong>{selected.displayName}</strong>
              <button
                type="button"
                className="text-white/50"
                onClick={() => setSelected(null)}
              >
                Закрыть
              </button>
            </div>
            <label className="block text-sm">
              Действие
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className={input}
              >
                {[
                  "note",
                  "warn",
                  "watch",
                  "resolve",
                  "ban",
                  ...(selected.restriction ? ["unban"] : []),
                ].map((k) => (
                  <option key={k} value={k}>
                    {labels[k]}
                  </option>
                ))}
              </select>
            </label>
            {kind === "ban" && (
              <label className="block text-sm">
                Срок блокировки
                <select
                  className={input}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  {[
                    ["1h", "1 час"],
                    ["6h", "6 часов"],
                    ["12h", "12 часов"],
                    ["1d", "1 день"],
                    ["3d", "3 дня"],
                    ["7d", "7 дней"],
                    ["14d", "14 дней"],
                    ["30d", "30 дней"],
                    ["90d", "90 дней"],
                    ["permanent", "Бессрочно"],
                  ].map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm">
              Причина / комментарий
              <textarea
                required
                minLength={3}
                maxLength={1000}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={input}
              />
            </label>
            <p className="text-xs text-white/45">
              Запись увидят администраторы. Блокировка запрещает игровые
              действия и сохраняет прогресс. Снятие отметки «на проверке» не
              снимает действующую блокировку.
            </p>
            <button
              disabled={busy}
              className={
                kind === "ban"
                  ? `${action} bg-rose-400 hover:bg-rose-300`
                  : action
              }
            >
              {busy ? "Сохраняем…" : labels[kind]}
            </button>
          </form>
        )}
      </div>
      <details className={panel} open>
        <summary className="cursor-pointer font-semibold">
          Журнал действий · {history.length}
        </summary>
        <div className="mt-3 max-h-96 space-y-3 overflow-auto">
          {history.map((h) => (
            <div key={h.id} className="border-t border-white/10 pt-3 text-sm">
              <p>
                <strong>{labels[h.action] || h.action}</strong> ·{" "}
                {users.find((u) => u.id === h.userId)?.displayName || h.userId}
              </p>
              <p className="mt-1 text-white/65">{h.reason}</p>
              <p className="mt-1 text-xs text-white/40">
                {h.actor} ·{" "}
                {new Date(h.createdAt).toLocaleString("ru-RU", {
                  timeZone: "Europe/Moscow",
                })}{" "}
                МСК
              </p>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
