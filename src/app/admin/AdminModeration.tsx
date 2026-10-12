"use client";
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
    [reason, setReason] = useState("Insults or harassment"),
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
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  const input = "min-h-11 rounded-xl border border-white/15 bg-black/30 p-3";
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Player moderation</h2>
      <p className="text-sm text-white/50">
        Search by nickname, name or user ID. Without a search, players with
        moderation history are shown. Blocks restrict game actions; progress is
        preserved.
      </p>
      <input
        aria-label="Search players"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="@nickname or user ID"
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
                  ? `${u.restriction.reason} · ${u.restriction.until ? new Date(u.restriction.until).toLocaleString() : "Permanent"}`
                  : "No active block"}
              </p>
              {editable && (
                <button
                  onClick={() => {
                    setSelected(u);
                    setReason(
                      u.restriction
                        ? "Restriction reviewed"
                        : "Insults or harassment",
                    );
                  }}
                  className={`${input} mt-3`}
                >
                  Manage restriction
                </button>
              )}
            </div>
          ))}
          {!users.length && (
            <p className="text-white/50">No matching players.</p>
          )}
        </div>
        {selected && editable && (
          <form
            className="h-fit space-y-3 rounded-2xl border border-white/15 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                confirm(
                  `Block ${selected.username || selected.displayName} for ${duration}? Reason: ${reason}`,
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
              Reason
              <select
                className={`${input} mt-1 w-full`}
                onChange={(e) => setReason(e.target.value)}
                value={
                  [
                    "Insults or harassment",
                    "Violation of project rules",
                    "Spam",
                    "Cheating",
                  ].includes(reason)
                    ? reason
                    : ""
                }
              >
                <option value="">Custom reason</option>
                {[
                  "Insults or harassment",
                  "Violation of project rules",
                  "Spam",
                  "Cheating",
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
              Duration
              <select
                className={`${input} mt-1 w-full`}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                {[
                  ["1h", "1 hour"],
                  ["1d", "1 day"],
                  ["3d", "3 days"],
                  ["7d", "1 week"],
                  ["30d", "30 days"],
                  ["permanent", "Permanent"],
                ].map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} className={`${input} text-red-300`}>
                Block player
              </button>
              {selected.restriction && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act("unban")}
                  className={`${input} text-emerald-300`}
                >
                  Remove block
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={input}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-3">
          Moderation history
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
