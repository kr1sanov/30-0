"use client";
import { useEffect, useState } from "react";
import { panel, input, secondary, adminApi } from "./adminUi";
type Insights = {
  metrics: Record<string, number | null>;
  modes: { id: string; count: number; completed: number }[];
  chart: { date: string; runs: number }[];
};
type Operations = {
  asOf: string;
  engagement: {
    dau: number;
    wau: number;
    mau: number;
    newUsers: number;
    activated: number;
    activationRate: number | null;
    returningPlayers: number | null;
    retention: {
      day: number;
      eligible: number;
      returned: number;
      rate: number | null;
    }[];
  };
  processes: {
    queue: Record<string, number>;
    oldestPendingAt: string | null;
    missingBot: number;
    banned: number;
    review: number;
    deleting: number;
    staleDrafts: number;
    staleRooms: number;
  };
  content: {
    clubs: number;
    players: number;
    cards: number;
    seasons: number;
    playableSeasons: number;
    invalidCards: number;
    latestSeason: string | null;
    challenges: Record<string, number>;
  };
};
const modes: Record<string, string> = {
  classic: "Обычный драфт",
  single_club: "Один клуб",
  challenge: "Челленджи",
  multiplayer: "Мультиплеер",
};
export default function AdminOverview() {
  const [period, setPeriod] = useState("14d"),
    [data, setData] = useState<{
      insights: Insights;
      operations: Operations;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [version, setVersion] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError("");
    Promise.all([
      adminApi<Insights>(
        `/api/admin/insights?period=${period}`,
        "GET",
        undefined,
        c.signal,
      ),
      adminApi<Operations>(
        `/api/admin/operations?period=${period}`,
        "GET",
        undefined,
        c.signal,
      ),
    ])
      .then(([insights, operations]) => setData({ insights, operations }))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [period, version]);
  const metrics = data?.insights.metrics,
    ops = data?.operations;
  const primary = metrics
    ? [
        ["Пользователи", metrics.totalUsers, "Всего зарегистрировано"],
        ["Новые", metrics.newUsers, "Зарегистрировались за период"],
        [
          "Играли",
          metrics.uniquePlayers,
          "Уникальные авторы драфтов за период",
        ],
        ["Завершили сезоны", metrics.completed, "Драфты, созданные за период"],
        ["Начали драфт", metrics.runs, "Один состав = один драфт"],
        [
          "Завершение",
          `${metrics.completionRate}%`,
          "Завершённые / созданные драфты за период",
        ],
        [
          "Вернулись к игре",
          ops?.engagement.returningPlayers ?? "—",
          "Начинали драфт до периода и снова в периоде",
        ],
        [
          "Результаты 30–0",
          metrics.perfect,
          "Тридцать побед без ничьих и поражений",
        ],
      ]
    : [];
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Обзор продукта</h2>
          <p className="mt-1 text-sm text-white/50">
            Игроки, игровой цикл и процессы, требующие внимания.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="overview-period">
            Период
          </label>
          <select
            id="overview-period"
            className={`${input} mt-0 w-auto`}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {[
              ["today", "Сегодня"],
              ["7d", "7 дней"],
              ["14d", "14 дней"],
              ["30d", "30 дней"],
              ["90d", "90 дней"],
              ["all", "Всё время"],
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <button
            disabled={busy}
            className={secondary}
            onClick={() => setVersion((v) => v + 1)}
          >
            {busy ? "Обновляем…" : "Обновить"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-rose-200">
          {error}
        </p>
      )}
      {busy && !data && (
        <p role="status" className={panel}>
          Загружаем показатели…
        </p>
      )}
      {data && ops && (
        <div
          aria-busy={busy}
          className={`space-y-5 ${busy ? "opacity-60" : ""}`}
        >
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {primary.map(([label, value, hint]) => (
              <article key={String(label)} className={panel}>
                <p className="text-sm text-white/60">{label}</p>
                <p className="my-2 text-3xl font-bold tracking-tight text-emerald-300">
                  {value ?? "—"}
                </p>
                <p className="text-xs leading-5 text-white/40">{hint}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className={panel}>
              <h3 className="font-bold">Активация и возврат</h3>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["DAU", ops.engagement.dau],
                  ["WAU", ops.engagement.wau],
                  ["MAU", ops.engagement.mau],
                ].map(([label, count]) => (
                  <div key={String(label)}>
                    <p className="text-xs text-white/45">{label}</p>
                    <strong className="text-2xl">{count}</strong>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/40">
                Заходили или начинали драфт: сегодня / 7 / 30 календарных дней
                по Москве.
              </p>
              <div className="mt-4 rounded-xl bg-white/5 p-3">
                <div className="flex justify-between text-sm">
                  <span>Новые → первый драфт за период</span>
                  <strong>
                    {ops.engagement.activated}/{ops.engagement.newUsers} ·{" "}
                    {ops.engagement.activationRate === null
                      ? "—"
                      : `${ops.engagement.activationRate}%`}
                  </strong>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  Когорта зарегистрированных за выбранный период. Новые игроки
                  ещё могут завершить этот шаг.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-5">
                {ops.engagement.retention.map((r) => (
                  <div key={r.day}>
                    <p className="text-xs text-white/45">
                      Вернулись к игре D{r.day}
                    </p>
                    <strong>
                      {r.rate === null ? "Нет зрелой когорты" : `${r.rate}%`}{" "}
                      <span className="text-xs font-normal text-white/40">
                        {r.returned}/{r.eligible}
                      </span>
                    </strong>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/40">
                Регистрации за 90 дней. Новый драфт на 1-й / 7-й день после
                регистрации; только полностью прошедшие дни. Это возврат к игре,
                а не посещение страницы.
              </p>
            </section>
            <section className={panel}>
              <h3 className="font-bold">Игровой цикл по режимам</h3>
              <div className="mt-4 space-y-4">
                {data.insights.modes.map((m) => (
                  <div key={m.id}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span>{modes[m.id]}</span>
                      <strong>
                        {m.completed} / {m.count}
                      </strong>
                    </div>
                    <progress
                      value={m.completed}
                      max={m.count || 1}
                      className="mt-2 h-2 w-full accent-emerald-400"
                    />
                    <p className="text-xs text-white/40">
                      Завершено / начато ·{" "}
                      {m.count ? Math.round((m.completed / m.count) * 100) : 0}%
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <section className={panel}>
            <h3 className="font-bold">Драфты по дням</h3>
            <div
              className="mt-4 flex h-36 items-end gap-1 overflow-x-auto"
              role="img"
              aria-label="Начатые драфты по дням"
            >
              {data.insights.chart.map((d) => (
                <div
                  key={d.date}
                  className="flex h-full min-w-2 flex-1 items-end"
                  title={`${d.date}: ${d.runs}`}
                >
                  <div
                    className="w-full rounded-t bg-emerald-400/80"
                    style={{
                      height: `${Math.max(2, (d.runs / Math.max(1, ...data.insights.chart.map((v) => v.runs))) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-white/40">
              <span>{data.insights.chart[0]?.date}</span>
              <span>{data.insights.chart.at(-1)?.date}</span>
            </div>
          </section>
          <section className={panel}>
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-bold">Требует внимания сейчас</h3>
              <span className="text-xs text-white/40">
                Текущее состояние ·{" "}
                {new Date(ops.asOf).toLocaleTimeString("ru-RU", {
                  timeZone: "Europe/Moscow",
                })}{" "}
                МСК
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [
                  "Уведомления в очереди",
                  ops.processes.queue.pending || 0,
                  "#campaigns",
                  ops.processes.oldestPendingAt
                    ? `Самое старое: ${new Date(ops.processes.oldestPendingAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК`
                    : "Нет ожидающих отправки",
                ],
                [
                  "Ошибки доставки",
                  ops.processes.queue.failed || 0,
                  "#campaigns",
                  "Исчерпаны попытки; проверь доставку",
                ],
                [
                  "На проверке",
                  ops.processes.review,
                  "#moderation",
                  `Активных блокировок: ${ops.processes.banned}`,
                ],
                [
                  "Запросы на удаление",
                  ops.processes.deleting,
                  "#users",
                  "Профили с отложенным удалением",
                ],
                [
                  "Драфты старше суток",
                  ops.processes.staleDrafts,
                  "#games",
                  "Не завершены; не обязательно ошибка",
                ],
                [
                  "Комнаты без обновлений",
                  ops.processes.staleRooms,
                  "#games",
                  "Не завершены, не обновлялись 30 минут",
                ],
                [
                  "Бот не запущен",
                  ops.processes.missingBot,
                  "#users",
                  "Таким пользователям нельзя доставить сообщение",
                ],
                [
                  "Некорректные карточки",
                  ops.content.invalidCards,
                  "#players",
                  "Рейтинг вне 1–100 или неизвестная позиция",
                ],
              ].map(([label, value, href, hint]) => (
                <a
                  key={String(label)}
                  href={String(href)}
                  className="rounded-xl border border-white/10 p-3 hover:border-emerald-400/40"
                >
                  <p className="text-xs text-white/55">{label}</p>
                  <strong
                    className={`mt-1 block text-2xl ${Number(value) ? "text-amber-200" : "text-emerald-300"}`}
                  >
                    {value}
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-white/40">{hint}</p>
                </a>
              ))}
            </div>
          </section>
          <section className={panel}>
            <h3 className="font-bold">Контент игры</h3>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Футболисты", ops.content.players],
                ["Сезонные карточки", ops.content.cards],
                ["Клубы", ops.content.clubs],
                [
                  "Сезоны",
                  `${ops.content.playableSeasons}/${ops.content.seasons}`,
                ],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-xs text-white/50">{label}</p>
                  <strong className="text-xl">{value}</strong>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/40">
              Сезоны: с составами минимум 16 клубов / всего. Последний сезон:{" "}
              {ops.content.latestSeason || "—"}.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <a href="#challenges" className="text-emerald-300">
                Челленджи: {ops.content.challenges.active} действуют ·{" "}
                {ops.content.challenges.scheduled} запланировано ·{" "}
                {ops.content.challenges.hidden} скрыто ·{" "}
                {ops.content.challenges.archived} в архиве →
              </a>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
