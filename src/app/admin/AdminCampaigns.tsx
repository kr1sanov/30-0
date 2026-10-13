"use client";
import { translateClient } from "@/lib/enTranslations";
import { validTelegramHtml } from "@/lib/campaignContent";
import { useEffect, useState, useRef } from "react";
type Campaign = {
  id?: string;
  title: string;
  titleEn: string;
  messageEn: string;
  buttonTextEn: string;
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
  titleEn: "",
  messageEn: "",
  buttonTextEn: "Play",
  message: "",
  cadence: "manual",
  format: "text",
  imageId: null,
  buttonText: "Играть",
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
      setError(e instanceof Error ? e.message : "Ошибка запроса");
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
          {draft.id ? "Редактировать рассылку" : "Новая рассылка"}
        </h2>
        <p className="mt-2 text-sm text-white/50">
Рассылки получают только игроки, которые запустили бота и включили новости проекта. Время указано в твоём часовом поясе.
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
              setNotice("Рассылка сохранена.");
            });
          }}
        >
          <fieldset className="space-y-3 rounded-xl border border-white/15 p-3">
            <legend>Английская версия поста</legend>
            <label className="block text-sm">Заголовок EN<input data-no-translate required minLength={2} maxLength={120} className={field} value={draft.titleEn || ""} onChange={e => setDraft({ ...draft, titleEn: e.target.value })} /></label>
            <label className="block text-sm">Сообщение EN<textarea data-no-translate required minLength={2} maxLength={draft.imageId ? 800 : 3500} className={field} value={draft.messageEn || ""} onChange={e => setDraft({ ...draft, messageEn: e.target.value })} /></label>
            <label className="block text-sm">Текст кнопки EN<input data-no-translate required maxLength={40} className={field} value={draft.buttonTextEn || ""} onChange={e => setDraft({ ...draft, buttonTextEn: e.target.value })} /></label>
            <p className="text-xs text-white/50">Бот отправит версию на языке, выбранном получателем.</p>
          </fieldset>
          <label className="block text-sm">
Заголовок
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
Триггер
<select
              className={field}
              value={draft.cadence}
              onChange={(e) => update({ cadence: e.target.value })}
            >
              {[
                ["manual", "Ручная отправка"],
                ["scheduled", "По расписанию"],
                ["daily", "Ежедневно · 12:00 МСК"],
                ["weekly", "Еженедельно · понедельник 12:00 МСК"],
                ["monthly", "Ежемесячно · первое число 12:00 МСК"],
                ["return", "Неактивные 7 дней · еженедельно"],
                ["new_user", "Новый игрок"],
                ["season_complete", "Завершение сезона"],
                ["perfect_season", "30 побед за сезон"],
              ].map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {draft.cadence === "scheduled" && (
            <label className="block text-sm">
Дата отправки
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
Форматирование
<select
              className={field}
              value={draft.format}
              onChange={(e) => update({ format: e.target.value })}
            >
              <option value="text">
Обычный текст
</option>
              <option value="html">Telegram HTML</option>
            </select>
          </label>
          <label className="block text-sm">
Сообщение
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
                ["b", "Жирный"],
                ["i", "Курсив"],
                ["u", "Подчёркнутый"],
                ["s", "Зачёркнутый"],
                ["code", "Код"],
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
            Переменные: {"{{name}}, {{username}}"}. HTML поддерживает b, i, u, s, code, pre, blockquote и HTTPS-ссылки. {draft.message.length}/
            {draft.imageId ? 800 : 3500}
          </p>
          <label className="block text-sm">
Картинка поста
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
                alt="Предпросмотр картинки"
                className="max-h-60 w-full rounded-xl object-contain"
              />
              <button
                type="button"
                className={button}
                onClick={() => update({ imageId: null })}
              >
Удалить картинку
</button>
            </div>
          )}
          <label className="block text-sm">
Текст кнопки
<input
              required
              maxLength={40}
              value={draft.buttonText}
              onChange={(e) => update({ buttonText: e.target.value })}
              className={field}
            />
          </label>
          <label className="block text-sm">
HTTPS-ссылка кнопки
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
Включить автоматический триггер
</label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              className={`${button} bg-emerald-500 text-black`}
            >
Сохранить рассылку
</button>
            <button
              type="button"
              className={button}
              onClick={() => setDraft(empty)}
            >
Новый черновик
</button>
          </div>
        </form>
        <details className="mt-5">
          <summary className="cursor-pointer text-sm">
Предпросмотр текста
</summary>
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
        <h2 className="text-xl font-bold">
Рассылки
</h2>
        {!items.length && <p className="text-white/50">
Пока нет рассылок.
</p>}
        {items.map((c) => (
          <article
            key={c.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <h3 className="font-bold">{c.title}</h3>
            <p className="mt-1 text-sm text-white/50">
              {c.cadence} · {c.enabled ? "Активна" : "На паузе"}
              {c.scheduledAt
                ? ` · ${new Date(c.scheduledAt).toLocaleString()}`
                : ""}
            </p>
            <p className="mt-3 text-xs text-white/60">
              Отправлено: {c.stats?.sent || 0} · В очереди: {c.stats?.pending || 0} · Ошибки: {c.stats?.failed || 0} · Пропущено: {c.stats?.skipped || 0}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={button}
                disabled={busy}
                onClick={() => setDraft(c)}
              >
Изменить
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
                {c.enabled ? "Приостановить" : "Включить"}
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      translateClient(`Отправить «${c.title}» всем подписчикам сейчас?`),
                    )
                  )
                    void run(async () => {
                      await api("/api/admin/campaigns", "POST", {
                        action: "send",
                        id: c.id,
                        requestId: crypto.randomUUID(),
                      });
                      setNotice("Рассылка добавлена в очередь для подписчиков.");
                    });
                }}
              >
Отправить сейчас
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
Повторить с ошибками
</button>
              )}
              <button
                className={`${button} text-red-300`}
                disabled={busy}
                onClick={() => {
                  if (confirm("Архивировать рассылку и отменить неотправленные сообщения?"))
                    void run(async () => {
                      await api("/api/admin/campaigns", "DELETE", { id: c.id });
                      if (draft.id === c.id) setDraft(empty);
                    });
                }}
              >
В архив
</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
