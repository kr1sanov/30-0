"use client";
import { useEffect, useState } from "react";
import { panel, input, secondary, adminApi } from "./adminUi";
type User = {
  id: string;
  displayName: string;
  username: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  lastGameAt: string | null;
  totalRuns: number;
  periodRuns: number;
  completed: number;
  perfect: number;
  bestPoints: number | null;
  moderationStatus: string;
  restriction: { reason: string; until: string | null } | null;
  deletionRequestedAt: string | null;
  telegramChatStarted: boolean;
};
type Run = {
  id: string;
  teamName: string | null;
  createdAt: string;
  completed: boolean;
  gameMode: string;
  formation: string;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  points: number | null;
  position: number | null;
  user: { displayName: string; username: string | null } | null;
  multiplayerSeat: { roomCode: string } | null;
  _count: { slots: number };
};
type Room = {
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  maxPlayers: number;
  seriesRound: number;
  seriesTargetWins: number;
  seats: { name: string; isBot: boolean; ready: boolean }[];
};
type Result = {
  total: number;
  pageSize: number;
  users?: User[];
  runs?: Run[];
  rooms?: Room[];
};
const dates = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
const modeNames: Record<string, string> = {
  all: "Все режимы",
  classic: "Обычный драфт",
  single_club: "Один клуб",
  challenge: "Челленджи",
  multiplayer: "Мультиплеер",
};
const statusNames: Record<string, string> = {
  lobby: "Лобби",
  starting: "Запуск",
  drafting: "Идёт драфт",
  completed: "Завершена",
  closed: "Закрыта",
  active: "Без ограничений",
  blocked: "Блокировка",
  watch: "На проверке",
  warned: "Предупреждение",
};
export default function AdminInsights({
  section,
}: {
  section: "users" | "games";
}) {
  const [period, setPeriod] = useState(section === "users" ? "all" : "30d"),
    [q, setQ] = useState(""),
    [debounced, setDebounced] = useState(""),
    [mode, setMode] = useState("all"),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("newest"),
    [kind, setKind] = useState("runs"),
    [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [selectedUser, setSelectedUser] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError("");
    const params = new URLSearchParams({
      q: debounced,
      period,
      mode,
      status,
      sort,
      kind,
      page: String(page),
    });
    adminApi<Result>(
      `/api/admin/${section}?${params}`,
      "GET",
      undefined,
      c.signal,
    )
      .then(setResult)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [section, period, debounced, mode, status, sort, kind, page, version]);
  const change = (fn: () => void) => {
    setPage(1);
    fn();
  };
  const statuses =
    section === "users"
      ? [
          ["all", "Все"],
          ["active", "Активные за период"],
          ["inactive", "Неактивные за период"],
          ["new", "Новые за период"],
          ["no_games", "Не начинали игру"],
          ["blocked", "Заблокированы"],
          ["watch", "На проверке / предупреждены"],
          ["deleting", "Запросили удаление"],
          ["bot_missing", "Не запустили бота"],
        ]
      : [
          ["all", "Все"],
          ["active", "Не завершены"],
          ["completed", "Завершены"],
          [
            "stale",
            kind === "rooms"
              ? "Без обновлений > 30 минут"
              : "Не завершены > 24 часов",
          ],
          ...(kind === "rooms"
            ? [["closed", "Закрыты"]]
            : [["perfect", "30–0"]]),
        ];
  return (
    <section className="space-y-4">
      <div className="flex justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            {section === "users" ? "Пользователи" : "Игры"}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {section === "users"
              ? "Активность, игровой прогресс и состояние аккаунта."
              : "Драфты, результаты сезонов и комнаты мультиплеера."}{" "}
            Время по Москве.
          </p>
        </div>
        <button
          className={secondary}
          disabled={busy}
          onClick={() => setVersion((v) => v + 1)}
        >
          {busy ? "Обновляем…" : "Обновить"}
        </button>
      </div>
      <section className={panel}>
        {section === "games" && (
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ["runs", "Драфты и сезоны"],
              ["rooms", "Комнаты и серии"],
            ].map(([id, label]) => (
              <button
                aria-pressed={kind === id}
                key={id}
                className={`${secondary} ${kind === id ? "border-emerald-400 text-emerald-200" : ""}`}
                onClick={() =>
                  change(() => {
                    setKind(id);
                    setStatus("all");
                    setMode("all");
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm">
            Поиск
            <input
              className={input}
              placeholder={
                section === "users" ? "Имя, ник или ID" : "Имя, ник или код"
              }
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Период
            <select
              className={input}
              value={period}
              onChange={(e) => change(() => setPeriod(e.target.value))}
            >
              {[
                ["all", "Всё время"],
                ["today", "Сегодня"],
                ["7d", "7 дней"],
                ["14d", "14 дней"],
                ["30d", "30 дней"],
                ["90d", "90 дней"],
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Статус
            <select
              className={input}
              value={status}
              onChange={(e) => change(() => setStatus(e.target.value))}
            >
              {statuses.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Режим
            <select
              disabled={kind === "rooms"}
              className={input}
              value={mode}
              onChange={(e) => change(() => setMode(e.target.value))}
            >
              {Object.entries(modeNames).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Сортировка
            <select
              className={input}
              value={sort}
              onChange={(e) => change(() => setSort(e.target.value))}
            >
              {(section === "users"
                ? [
                    ["recent", "По активности"],
                    ["created", "Новые регистрации"],
                    ["games", "Больше игр"],
                    ["name", "По имени"],
                  ]
                : [
                    ["newest", "Сначала новые"],
                    ["oldest", "Сначала старые"],
                    ...(kind === "runs"
                      ? [
                          ["points", "Больше очков"],
                          ["wins", "Больше побед"],
                        ]
                      : []),
                  ]
              ).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {error && (
        <p role="alert" className="text-rose-200">
          {error}
        </p>
      )}
      {busy && !result && <p role="status">Загружаем…</p>}
      {selectedUser && (
        <UserDetails id={selectedUser} onClose={() => setSelectedUser("")} />
      )}
      {result && (
        <section
          className={`${panel} ${busy ? "opacity-60" : ""}`}
          aria-busy={busy}
        >
          <p className="mb-3 text-sm text-white/50">Найдено: {result.total}</p>
          {section === "users" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-xs text-white/45">
                  <tr>
                    {[
                      "Пользователь",
                      "Статус",
                      "Активность",
                      "Игры",
                      "За период",
                      "Рекорд",
                      "",
                    ].map((s, i) => (
                      <th key={i} className="p-3">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.users?.map((u) => (
                    <tr key={u.id} className="border-t border-white/10">
                      <td className="p-3">
                        <button
                          className="text-left hover:text-emerald-200"
                          onClick={() => setSelectedUser(u.id)}
                        >
                          <strong>{u.displayName}</strong>
                          <span className="block text-xs text-white/50">
                            {u.username ? `@${u.username}` : "Без username"}
                          </span>
                        </button>
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            u.restriction ? "text-rose-200" : "text-white/65"
                          }
                        >
                          {u.restriction
                            ? "Заблокирован"
                            : u.deletionRequestedAt
                              ? "Удаление запрошено"
                              : statusNames[u.moderationStatus] ||
                                "Без ограничений"}
                        </span>
                        {!u.telegramChatStarted && (
                          <span className="block text-xs text-amber-200/70">
                            Бот не запущен
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-white/60">
                        {dates(u.lastActiveAt)}
                        <span className="mt-1 block text-white/35">
                          Регистрация: {dates(u.createdAt)}
                        </span>
                      </td>
                      <td className="p-3">{u.totalRuns}</td>
                      <td className="p-3">
                        {u.periodRuns}
                        <span className="block text-xs text-white/40">
                          Завершено: {u.completed}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.bestPoints ?? "—"} очк.
                        <span className="block text-xs text-white/40">
                          30–0: {u.perfect}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          className={secondary}
                          onClick={() => setSelectedUser(u.id)}
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : kind === "runs" ? (
            <div className="space-y-2">
              {result.runs?.map((r) => (
                <details
                  key={r.id}
                  className="rounded-xl border border-white/10 p-3"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <strong>
                          {r.user?.username
                            ? `@${r.user.username}`
                            : r.user?.displayName || r.teamName || "Бот"}
                        </strong>
                        <p className="mt-1 text-xs text-white/45">
                          {r.multiplayerSeat
                            ? `Мультиплеер · ${r.multiplayerSeat.roomCode}`
                            : r.gameMode.startsWith("challenge_")
                              ? "Челлендж"
                              : modeNames[r.gameMode]}{" "}
                          · {dates(r.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <strong
                          className={
                            r.completed ? "text-emerald-200" : "text-amber-200"
                          }
                        >
                          {r.completed
                            ? `${r.points ?? 0} очков · ${r.position ?? "—"} место`
                            : `Состав ${r._count.slots}/11`}
                        </strong>
                        <p className="text-xs text-white/40">
                          {r.completed
                            ? `${r.wins}–${r.draws}–${r.losses}`
                            : "Драфт не завершён"}{" "}
                          · Подробнее ↓
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 text-sm text-white/60">
                    <p>
                      Команда: {r.teamName || "—"} · Схема: {r.formation}
                    </p>
                    <p>Заполнено позиций: {r._count.slots}/11</p>
                    <p className="break-all font-mono text-xs text-white/35">
                      ID: {r.id}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {result.rooms?.map((r) => (
                <details
                  key={r.code}
                  className="rounded-xl border border-white/10 p-3"
                >
                  <summary className="cursor-pointer">
                    <strong>{r.code}</strong> ·{" "}
                    {statusNames[r.status] || r.status} · {r.seats.length}/
                    {r.maxPlayers} участников ·{" "}
                    {r.seriesTargetWins
                      ? `Серия до ${r.seriesTargetWins}, раунд ${r.seriesRound}`
                      : "Один сезон"}
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-white/60">
                    <p>
                      Создана: {dates(r.createdAt)} · Обновление:{" "}
                      {dates(r.updatedAt)}
                    </p>
                    {r.seats.map((s, i) => (
                      <p key={i}>
                        {s.name}
                        {s.isBot ? " · бот" : ""} ·{" "}
                        {s.ready ? "готов" : "не готов"}
                      </p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
          {!result.total && (
            <p className="py-10 text-center text-white/50">
              По этим фильтрам ничего не найдено.
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              className={secondary}
              disabled={page === 1 || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Назад
            </button>
            <span className="text-xs text-white/45">
              {page} / {Math.max(1, Math.ceil(result.total / result.pageSize))}
            </span>
            <button
              className={secondary}
              disabled={page * result.pageSize >= result.total || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее →
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
function UserDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<{
      user: User & {
        telegramNotificationsEnabled: boolean;
        referralCount: number;
        runs: {
          id: string;
          completed: boolean;
          points: number | null;
          createdAt: string;
        }[];
      };
      history: { id: string; action: string; reason: string; actor: string }[];
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    adminApi<NonNullable<typeof data>>(
      `/api/admin/users/${id}`,
      "GET",
      undefined,
      c.signal,
    )
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [id]);
  return (
    <section className={`${panel} border-emerald-400/30`}>
      <div className="flex justify-between">
        <h3 className="font-bold">Карточка пользователя</h3>
        <button className={secondary} onClick={onClose}>
          Закрыть
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>Загружаем…</p>}
      {data && (
        <div className="mt-4 space-y-3">
          <div>
            <strong className="text-xl">{data.user.displayName}</strong>
            <p className="text-sm text-white/50">
              {data.user.username ? `@${data.user.username}` : "Без username"} ·
              Регистрация: {dates(data.user.createdAt)}
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <p>
              Бот: {data.user.telegramChatStarted ? "запущен" : "не запущен"}
            </p>
            <p>
              Уведомления:{" "}
              {data.user.telegramNotificationsEnabled
                ? "включены"
                : "выключены"}
            </p>
            <p>Приглашено: {data.user.referralCount}</p>
          </div>
          {data.user.restriction && (
            <p className="text-sm text-rose-200">
              Блокировка: {data.user.restriction.reason} ·{" "}
              {data.user.restriction.until
                ? dates(data.user.restriction.until)
                : "бессрочно"}
            </p>
          )}
          <a className={secondary} href={`#moderation/${id}`}>
            Перейти к модерации
          </a>
          <details>
            <summary className="cursor-pointer text-sm text-emerald-200">
              Последние игры · {data.user.runs.length}
            </summary>
            <div className="mt-2 space-y-2">
              {data.user.runs.map((r) => (
                <p key={r.id} className="text-sm text-white/60">
                  {dates(r.createdAt)} ·{" "}
                  {r.completed ? `${r.points} очков` : "Не завершён"}
                </p>
              ))}
            </div>
          </details>
          <details>
            <summary className="cursor-pointer text-sm text-emerald-200">
              Журнал модерации · {data.history.length}
            </summary>
            {data.history.map((h) => (
              <p key={h.id} className="mt-2 text-sm text-white/60">
                {h.action} · {h.reason} · {h.actor}
              </p>
            ))}
          </details>
        </div>
      )}
    </section>
  );
}
