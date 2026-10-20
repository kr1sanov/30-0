"use client";
import { useCallback, useEffect, useState } from "react";
import type { WeeklyChallenge } from "@/lib/weeklyChallenges";
import { panel, input, action, secondary, adminApi } from "./adminUi";
type Issue = WeeklyChallenge & { status: string; visibility: string };
const statuses = [
  ["active", "Действуют"],
  ["scheduled", "По расписанию"],
  ["hidden", "Черновики / скрытые"],
  ["archived", "Архив"],
];
const dateInput = (value: string) =>
  new Date(Date.parse(value) + 3 * 3600000).toISOString().slice(0, 16);
export default function AdminChallenges() {
  const [issues, setIssues] = useState<Issue[]>([]),
    [tab, setTab] = useState("active"),
    [editing, setEditing] = useState<Issue | "new" | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    const d = await adminApi<{ issues: Issue[] }>("/api/admin/challenges");
    setIssues(d.issues);
  }, []);
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [refresh]);
  async function save(id: string | null, body: object) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminApi(
        "/api/admin/challenges",
        id ? "PATCH" : "POST",
        id ? { id, ...body } : body,
      );
      await refresh();
      setEditing(null);
      if (!id) setTab("hidden");
      setNotice(
        id
          ? "Челлендж обновлён"
          : "Челлендж создан и скрыт. Проверь его, затем включи расписание или открой.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Челленджи</h2>
          <p className="mt-1 text-sm text-white/55">
            Задание, условия, расписание и достижение — в одном редакторе. Все
            даты по Москве.
          </p>
        </div>
        <button className={action} onClick={() => setEditing("new")}>
          Создать челлендж
        </button>
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
      {editing && (
        <ChallengeForm
          key={editing === "new" ? "new" : editing.id}
          issue={editing === "new" ? undefined : editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(patch) =>
            void save(
              editing === "new" ? null : editing.id,
              editing === "new" ? patch : { patch },
            )
          }
        />
      )}
      <div className="flex flex-wrap gap-2" aria-label="Статус челленджа">
        {statuses.map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            className={`${secondary} ${tab === id ? "border-emerald-400 text-emerald-200" : ""}`}
            onClick={() => setTab(id)}
          >
            {label} · {issues.filter((i) => i.status === id).length}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {issues
          .filter((i) => i.status === tab)
          .toReversed()
          .map((issue) => (
            <article key={issue.id} className={panel}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold" data-no-translate>
                    {issue.titleRu}
                  </h3>
                  <p className="mt-1 text-xs text-white/50" data-no-translate>
                    {issue.titleEn}
                  </p>
                </div>
                <button className={secondary} onClick={() => setEditing(issue)}>
                  Редактировать
                </button>
              </div>
              <p className="my-3 text-sm text-white/65" data-no-translate>
                {issue.descriptionRu}
              </p>
              <p className="text-xs text-white/45">
                {new Date(issue.startsAt).toLocaleString("ru-RU", {
                  timeZone: "Europe/Moscow",
                })}{" "}
                —{" "}
                {new Date(issue.endsAt).toLocaleString("ru-RU", {
                  timeZone: "Europe/Moscow",
                })}{" "}
                МСК
              </p>
              <p className="mt-2 text-sm text-emerald-200">
                {issue.achievementIcon || "🏆"} Достижение:{" "}
                {issue.achievementTitleRu || issue.titleRu}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ["auto", "По расписанию"],
                  ["open", "Открыть сейчас"],
                  ["hidden", "Скрыть"],
                  ["archived", "В архив"],
                ].map(([visibility, label]) => (
                  <button
                    key={visibility}
                    disabled={busy || issue.visibility === visibility}
                    className={secondary}
                    onClick={() => void save(issue.id, { visibility })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        {!issues.some((i) => i.status === tab) && (
          <p className={`${panel} text-sm text-white/50`}>
            В этом разделе пока нет заданий.
          </p>
        )}
      </div>
    </section>
  );
}
function ChallengeForm({
  issue,
  busy,
  onSave,
  onCancel,
}: {
  issue?: Issue;
  busy: boolean;
  onSave: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const now = new Date(),
    end = new Date(Date.now() + 7 * 86400000);
  const labels = [
    ["titleRu", "Название · RU"],
    ["titleEn", "Название · EN"],
    ["descriptionRu", "Описание задания · RU"],
    ["descriptionEn", "Описание задания · EN"],
    ["achievementTitleRu", "Название достижения · RU"],
    ["achievementTitleEn", "Название достижения · EN"],
    ["achievementDescriptionRu", "Описание достижения · RU"],
    ["achievementDescriptionEn", "Описание достижения · EN"],
  ] as const;
  return (
    <form
      className={`${panel} space-y-4 border-emerald-400/30`}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          patch: Record<string, unknown> = {};
        for (const [k] of labels) patch[k] = String(f.get(k) || "").trim();
        for (const k of [
          "minimumGoals",
          "minimumPoints",
          "maximumConceded",
          "minimumCleanSheets",
          "matchLimit",
        ])
          patch[k] = f.get(k) === "" ? null : Number(f.get(k));
        for (const k of ["startsAt", "endsAt"])
          patch[k] = new Date(`${f.get(k)}:00+03:00`).toISOString();
        patch.requireTitle = f.has("requireTitle");
        patch.unbeaten = f.has("unbeaten");
        patch.achievementIcon = f.get("achievementIcon");
        onSave(patch);
      }}
    >
      <div className="flex justify-between gap-3">
        <h3 className="font-bold">
          {issue ? "Редактировать задание" : "Новый челлендж"}
        </h3>
        <button type="button" className="text-white/55" onClick={onCancel}>
          Отменить
        </button>
      </div>
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {labels.map(([k, label]) => (
            <label key={k} className="text-sm">
              {label}
              {k.includes("description") || k.includes("Description") ? (
                <textarea
                  data-no-translate
                  required={k.startsWith("description")}
                  maxLength={k.startsWith("achievement") ? 500 : 2000}
                  name={k}
                  className={input}
                  defaultValue={issue?.[k] || ""}
                />
              ) : (
                <input
                  data-no-translate
                  required
                  name={k}
                  className={input}
                  maxLength={k.startsWith("achievement") ? 100 : 150}
                  defaultValue={
                    issue?.[k] ||
                    (k === "achievementTitleRu"
                      ? issue?.titleRu
                      : k === "achievementTitleEn"
                        ? issue?.titleEn
                        : "")
                  }
                />
              )}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Начало · МСК
            <input
              required
              type="datetime-local"
              name="startsAt"
              className={input}
              defaultValue={dateInput(issue?.startsAt || now.toISOString())}
            />
          </label>
          <label className="text-sm">
            Окончание · МСК
            <input
              required
              type="datetime-local"
              name="endsAt"
              className={input}
              defaultValue={dateInput(issue?.endsAt || end.toISOString())}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["minimumGoals", "Забить не меньше", 0, 300],
            ["minimumPoints", "Набрать очков", 0, 90],
            ["maximumConceded", "Пропустить не больше", 0, 300],
            ["minimumCleanSheets", "Сухих матчей не меньше", 0, 30],
            ["matchLimit", "Первые N матчей (пусто — весь сезон)", 1, 30],
          ].map(([k, label, min, max]) => (
            <label key={String(k)} className="text-sm">
              {label}
              <input
                name={String(k)}
                type="number"
                min={Number(min)}
                max={Number(max)}
                required={k === "minimumGoals" || k === "minimumPoints"}
                className={input}
                defaultValue={String(
                  issue?.[k as keyof Issue] ??
                    (k === "minimumGoals" || k === "minimumPoints" ? 0 : ""),
                )}
              />
            </label>
          ))}
          <label className="text-sm">
            Значок достижения
            <select
              className={input}
              name="achievementIcon"
              defaultValue={issue?.achievementIcon || "🏆"}
            >
              {["🏆", "⚽", "🎯", "🧤", "⚡", "⭐"].map((icon) => (
                <option key={icon}>{icon}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="text-sm">
            <input
              type="checkbox"
              name="requireTitle"
              defaultChecked={issue?.requireTitle ?? false}
            />{" "}
            Стать чемпионом сезона
          </label>
          <label className="text-sm">
            <input
              type="checkbox"
              name="unbeaten"
              defaultChecked={issue?.unbeaten ?? false}
            />{" "}
            Без поражений за сезон
          </label>
        </div>
        <p className="text-xs text-white/50">
          Новый челлендж начинается с пустого состава. Достижение выдаётся при
          выполнении всех условий. По окончании срока задание автоматически
          попадает в архив.
        </p>
        <button disabled={busy} className={action}>
          {busy
            ? "Сохраняем…"
            : issue
              ? "Сохранить изменения"
              : "Создать скрытый челлендж"}
        </button>
      </fieldset>
    </form>
  );
}
