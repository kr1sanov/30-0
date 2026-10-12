"use client";
import { validTelegramHtml } from "@/lib/campaignContent";
import { useEffect, useState, useRef } from "react";
type Campaign = {
  id?: string;
  title: string;
  message: string;
  cadence: string;
  format: string;
  imageId: string | null;
  buttonText: string;
  buttonUrl: string;
  scheduledAt: string | null;
  enabled: boolean;
  stats?: Record<string, number>;
};
const empty: Campaign = {
  title: "",
  message: "",
  cadence: "manual",
  format: "text",
  imageId: null,
  buttonText: "Play",
  buttonUrl: "https://t.me/RPL30_bot?startapp",
  scheduledAt: null,
  enabled: false,
};
const field =
  "min-h-11 w-full rounded-xl border border-white/15 bg-black/30 p-3";
const button =
  "min-h-11 rounded-xl border border-white/20 px-4 py-2 text-sm disabled:opacity-40";
async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}
export default function AdminCampaigns() {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [items, setItems] = useState<Campaign[]>([]),
    [draft, setDraft] = useState<Campaign>(empty),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    setItems((await api("/api/admin/campaigns")).campaigns);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  const update = (patch: Partial<Campaign>) =>
    setDraft((previous) => ({ ...previous, ...patch }));
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold">
          {draft.id ? "Edit campaign" : "New campaign"}
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Only players who started the bot and opted into Project news receive
          campaigns. Times are shown in your local timezone.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 text-emerald-300">
            {notice}
          </p>
        )}
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const data = await api("/api/admin/campaigns", "POST", draft);
              setDraft(data.campaign);
              setNotice("Campaign saved.");
            });
          }}
        >
          <label className="block text-sm">
            Heading
            <input
              required
              minLength={2}
              maxLength={120}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Trigger
            <select
              className={field}
              value={draft.cadence}
              onChange={(e) => update({ cadence: e.target.value })}
            >
              {[
                ["manual", "Manual send"],
                ["scheduled", "Scheduled date"],
                ["daily", "Daily · 09:00 UTC"],
                ["weekly", "Weekly · Monday 09:00 UTC"],
                ["monthly", "Monthly · first day 09:00 UTC"],
                ["return", "Inactive for 7 days · weekly"],
                ["new_user", "New player"],
                ["season_complete", "Completed season"],
                ["perfect_season", "30 wins in a season"],
              ].map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {draft.cadence === "scheduled" && (
            <label className="block text-sm">
              Send at
              <input
                required
                type="datetime-local"
                className={field}
                value={
                  draft.scheduledAt
                    ? new Date(
                        new Date(draft.scheduledAt).getTime() -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  update({
                    scheduledAt: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </label>
          )}
          <label className="block text-sm">
            Formatting
            <select
              className={field}
              value={draft.format}
              onChange={(e) => update({ format: e.target.value })}
            >
              <option value="text">Plain text</option>
              <option value="html">Telegram HTML</option>
            </select>
          </label>
          <label className="block text-sm">
            Message
            <textarea
              ref={textarea}
              required
              rows={7}
              maxLength={draft.imageId ? 800 : 3500}
              value={draft.message}
              onChange={(e) => update({ message: e.target.value })}
              className={field}
            />
          </label>
          {draft.format === "html" && (
            <div className="flex flex-wrap gap-2">
              {[
                ["b", "Bold"],
                ["i", "Italic"],
                ["u", "Underline"],
                ["s", "Strike"],
                ["code", "Code"],
              ].map(([tag, label]) => (
                <button
                  key={tag}
                  type="button"
                  className={button}
                  onClick={() => {
                    const node = textarea.current;
                    if (!node) return;
                    const start = node.selectionStart,
                      end = node.selectionEnd;
                    update({
                      message:
                        draft.message.slice(0, start) +
                        `<${tag}>` +
                        draft.message.slice(start, end) +
                        `</${tag}>` +
                        draft.message.slice(end),
                    });
                    node.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-white/50">
            Variables: {"{{name}}, {{username}}"}. HTML supports b, i, u, s,
            code, pre, blockquote and HTTPS links. {draft.message.length}/
            {draft.imageId ? 800 : 3500}
          </p>
          <label className="block text-sm">
            Post image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              className={`${field} mt-1`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void run(async () => {
                  const form = new FormData();
                  form.set("image", file);
                  const res = await fetch("/api/admin/media", {
                    method: "POST",
                    body: form,
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  update({ imageId: data.id });
                });
                e.target.value = "";
              }}
            />
          </label>
          {draft.imageId && (
            <div>
              <img
                src={`/api/admin/media/${draft.imageId}`}
                alt="Post image preview"
                className="max-h-60 w-full rounded-xl object-contain"
              />
              <button
                type="button"
                className={button}
                onClick={() => update({ imageId: null })}
              >
                Remove image
              </button>
            </div>
          )}
          <label className="block text-sm">
            Button label
            <input
              required
              maxLength={40}
              value={draft.buttonText}
              onChange={(e) => update({ buttonText: e.target.value })}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Button HTTPS link
            <input
              required
              type="url"
              value={draft.buttonUrl}
              onChange={(e) => update({ buttonUrl: e.target.value })}
              className={field}
            />
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            Enable automatic trigger
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              className={`${button} bg-emerald-500 text-black`}
            >
              Save campaign
            </button>
            <button
              type="button"
              className={button}
              onClick={() => setDraft(empty)}
            >
              New draft
            </button>
          </div>
        </form>
        <details className="mt-5">
          <summary className="cursor-pointer text-sm">Text preview</summary>
          <div className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-black/30 p-4">
            <strong>{draft.title}</strong>
            {draft.format === "html" && validTelegramHtml(draft.message) ? (
              <div
                className="mt-3"
                dangerouslySetInnerHTML={{ __html: draft.message }}
              />
            ) : (
              <p className="mt-3">{draft.message}</p>
            )}
            <span className="mt-4 inline-block rounded-lg border border-white/20 px-4 py-2">
              {draft.buttonText}
            </span>
          </div>
        </details>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Campaigns</h2>
        {!items.length && <p className="text-white/50">No campaigns yet.</p>}
        {items.map((c) => (
          <article
            key={c.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <h3 className="font-bold">{c.title}</h3>
            <p className="mt-1 text-sm text-white/50">
              {c.cadence} · {c.enabled ? "Active" : "Paused"}
              {c.scheduledAt
                ? ` · ${new Date(c.scheduledAt).toLocaleString()}`
                : ""}
            </p>
            <p className="mt-3 text-xs text-white/60">
              Sent: {c.stats?.sent || 0} · Pending: {c.stats?.pending || 0} ·
              Failed: {c.stats?.failed || 0} · Skipped: {c.stats?.skipped || 0}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={button}
                disabled={busy}
                onClick={() => setDraft(c)}
              >
                Edit
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api("/api/admin/campaigns", "POST", {
                      ...c,
                      enabled: !c.enabled,
                    });
                  })
                }
              >
                {c.enabled ? "Pause" : "Enable"}
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      `Queue “${c.title}” for all eligible subscribers now?`,
                    )
                  )
                    void run(async () => {
                      await api("/api/admin/campaigns", "POST", {
                        action: "send",
                        id: c.id,
                        requestId: crypto.randomUUID(),
                      });
                      setNotice("Campaign queued for eligible subscribers.");
                    });
                }}
              >
                Send now
              </button>
              {Boolean(c.stats?.failed) && (
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api("/api/admin/campaigns", "POST", {
                        action: "retry",
                        id: c.id,
                      });
                    })
                  }
                >
                  Retry failed
                </button>
              )}
              <button
                className={`${button} text-red-300`}
                disabled={busy}
                onClick={() => {
                  if (confirm("Archive campaign and cancel unsent messages?"))
                    void run(async () => {
                      await api("/api/admin/campaigns", "DELETE", { id: c.id });
                      if (draft.id === c.id) setDraft(empty);
                    });
                }}
              >
                Archive
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
