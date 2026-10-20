"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { localizedClubName } from "@/lib/clubDisplayName";
import { localizePlayerName } from "@/lib/footballNames";
import { playerDisplayName } from "@/lib/playerNames";
import {
  panel,
  input,
  action,
  secondary,
  adminApi,
  PositionsEditor,
  ClubSeasonSelect,
  type RosterChoice,
} from "./adminUi";

type Identity = {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string;
  alias: string | null;
  firstNameRu?: string | null;
  lastNameRu?: string | null;
  aliasRu?: string | null;
  nationality: string | null;
  birthYear: number | null;
};
type Card = {
  id: string;
  clubSeasonId: string;
  rating: number;
  primeRating: number;
  mainPosition: string;
  otherPositions: string | null;
  clubSeason: { club: { nameRu: string }; season: { label: string } };
} & Record<string, unknown>;
type Player = Identity & { seasons: Card[] };
type Row = Identity & {
  nameRu: string;
  nameEn: string;
  _count: { seasons: number };
};
type Duplicates = {
  scanned: number;
  safe: number;
  groups: {
    targetId: string;
    safe: boolean;
    reason: string;
    members: {
      id: string;
      fullName: string;
      birthYear: number | null;
      seasons: unknown[];
    }[];
  }[];
};
export const cardData = (card?: Record<string, unknown>) => {
  const data: Record<string, unknown> = {};
  for (const k of [
    "rating",
    "primeRating",
    "primeSeason",
    "mainPosition",
    "otherPositions",
    "nationality",
    "age",
    "shirtNumber",
    "matches",
    "goals",
    "assists",
    "sourceName",
    "sourcePosition",
    "sourceUrl",
  ])
    data[k] =
      card?.[k] ??
      (k === "rating"
        ? 70
        : k === "primeRating"
          ? 0
          : k === "mainPosition"
            ? "ЦП"
            : null);
  return data;
};
export default function AdminPlayers({
  editable,
  canMerge = false,
  initialPlayerId = "",
  initialClubSeasonId = "",
}: {
  editable: boolean;
  canMerge?: boolean;
  initialPlayerId?: string;
  initialClubSeasonId?: string;
}) {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [rows, setRows] = useState<Row[]>([]),
    [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState(initialPlayerId),
    [selected, setSelected] = useState<Player | null>(null),
    [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0);
  const [seasons, setSeasons] = useState<RosterChoice[]>([]),
    [copy, setCopy] = useState<Card | "new" | null>(null),
    [duplicates, setDuplicates] = useState<Duplicates | null>(null);
  useEffect(() => {
    setSelectedId(initialPlayerId);
  }, [initialPlayerId]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      adminApi<{ players: Row[]; total: number }>(
        `/api/admin/players?q=${encodeURIComponent(q)}&page=${page}`,
        "GET",
        undefined,
        controller.signal,
      )
        .then((d) => {
          setRows(d.players);
          setTotal(d.total);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, page, version]);
  useEffect(() => {
    const c = new AbortController();
    if (selectedId)
      adminApi<{ player: Player }>(
        `/api/admin/players/${selectedId}`,
        "GET",
        undefined,
        c.signal,
      )
        .then((d) => {
          setSelected(d.player);
          setCreating(false);
          setCopy(null);
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        });
    return () => c.abort();
  }, [selectedId, version]);
  useEffect(() => {
    adminApi<{ seasons: RosterChoice[] }>("/api/admin/rosters")
      .then((d) => setSeasons(d.seasons))
      .catch((e) => setError(e.message));
  }, []);
  const execute = useCallback(
    async (fn: () => Promise<unknown>, message = "Изменения сохранены") => {
      setBusy(true);
      setError("");
      setNotice("");
      try {
        await fn();
        setNotice(message);
        setVersion((v) => v + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось сохранить");
      } finally {
        setBusy(false);
      }
    },
    [],
  );
  const audit = async () => {
    await execute(
      async () =>
        setDuplicates(
          await adminApi<Duplicates>("/api/admin/players/duplicates"),
        ),
      "Проверка базы завершена",
    );
  };
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Игроки</h2>
          <p className="mt-1 text-sm text-white/55">
            Один футболист — одна личность, сколько угодно клубов и сезонов.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={busy}
            className={secondary}
            onClick={() => void audit()}
          >
            Проверить дубли
          </button>
          {editable && (
            <button
              className={action}
              onClick={() => {
                setCreating(true);
                setSelected(null);
                setSelectedId("");
                setCopy(null);
              }}
            >
              Новый игрок
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-950/50 p-3 text-rose-200">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-950/40 p-3 text-emerald-200"
        >
          {notice}
        </p>
      )}
      {duplicates && (
        <section className={panel}>
          <div className="flex justify-between gap-3">
            <h3 className="font-bold">
              Проверка дублей · {duplicates.scanned} игроков
            </h3>
            <button
              className="text-sm text-white/60"
              onClick={() => setDuplicates(null)}
            >
              Скрыть проверку
            </button>
          </div>
          <p className="mt-2 text-sm text-white/55">
            Групп: {duplicates.groups.length}. С подтверждающими данными:{" "}
            {duplicates.safe}. Основная карточка предлагается по числу сезонов.
            При совпадении клуба и сезона сохраняются её рейтинги.
          </p>
          <div className="mt-4 max-h-96 space-y-3 overflow-auto">
            {duplicates.groups.map((group) => (
              <article
                key={group.targetId}
                className="rounded-lg border border-white/10 p-3"
              >
                <p
                  className={group.safe ? "text-emerald-300" : "text-amber-200"}
                >
                  {group.reason}
                </p>
                {group.members.map((p) => (
                  <div
                    key={p.id}
                    className="mt-2 flex flex-wrap items-center justify-between gap-2"
                  >
                    <button
                      className="text-left text-sm hover:underline"
                      onClick={() => {
                        setSelectedId(p.id);
                        setDuplicates(null);
                      }}
                    >
                      {p.fullName} · {p.birthYear || "год неизвестен"} ·
                      карточек {p.seasons.length}
                      {p.id === group.targetId ? " · основная" : ""}
                    </button>
                    {canMerge && p.id !== group.targetId && (
                      <button
                        className={secondary}
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              `Объединить ${p.fullName} с основной карточкой? Проверь, что это один футболист. Исторические результаты сохраняются.`,
                            )
                          )
                            void execute(async () => {
                              await adminApi(
                                "/api/admin/players/duplicates",
                                "POST",
                                { targetId: group.targetId, sourceId: p.id },
                              );
                              setDuplicates(
                                await adminApi<Duplicates>(
                                  "/api/admin/players/duplicates",
                                ),
                              );
                              setSelectedId(group.targetId);
                            }, "Карточки объединены");
                        }}
                      >
                        Объединить
                      </button>
                    )}
                  </div>
                ))}
              </article>
            ))}
            {!duplicates.groups.length && (
              <p className="text-sm text-emerald-200">
                Совпадений по нормализованным именам не найдено.
              </p>
            )}
          </div>
        </section>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${panel} xl:sticky xl:top-5`}>
          <label className="text-sm font-semibold">
            Найти футболиста
            <input
              className={input}
              placeholder="Обляков или Oblyakov"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <p className="my-3 text-xs text-white/45">
            Найдено: {total}
            {loading ? " · Загружаем…" : ""}
          </p>
          <div className="max-h-[60vh] space-y-1 overflow-auto">
            {rows.map((p) => (
              <button
                key={p.id}
                data-no-translate
                aria-pressed={selectedId === p.id}
                className={`w-full rounded-xl border p-3 text-left ${selectedId === p.id ? "border-emerald-400 bg-emerald-400/10" : "border-transparent hover:bg-white/5"}`}
                onClick={() => {
                  setSelectedId(p.id);
                  setSelected(null);
                  setCreating(false);
                }}
              >
                <strong className="block text-sm">{p.nameRu}</strong>
                <span className="block text-xs text-white/50">{p.nameEn}</span>
                <span className="text-xs text-white/40">
                  {p.birthYear || "Год не указан"} · карточек {p._count.seasons}
                </span>
              </button>
            ))}
            {!loading && !rows.length && (
              <p className="py-4 text-sm text-white/55">
                Ничего не найдено. Измени запрос или создай игрока.
              </p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              className={secondary}
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </button>
            <span className="text-xs text-white/50">
              {page} / {Math.max(1, Math.ceil(total / 30))}
            </span>
            <button
              className={secondary}
              disabled={page * 30 >= total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </aside>
        <div className="min-w-0 space-y-4">
          {creating && (
            <IdentityForm
              editable={editable}
              busy={busy}
              onSave={(data) =>
                void execute(async () => {
                  const d = await adminApi<{ player: Player }>(
                    "/api/admin/players",
                    "POST",
                    data,
                  );
                  setSelectedId(d.player.id);
                  setCreating(false);
                }, "Футболист создан. Добавь его первую сезонную карточку.")
              }
            />
          )}
          {!creating && !selected && (
            <div className={`${panel} py-16 text-center text-white/55`}>
              {selectedId
                ? "Загружаем карточку…"
                : "Найди игрока слева, чтобы изменить данные и сезонные карточки."}
            </div>
          )}
          {selected && (
            <>
              <IdentityForm
                key={`${selected.id}-${version}`}
                player={selected}
                editable={editable}
                busy={busy}
                onSave={(data) =>
                  void execute(() =>
                    adminApi(`/api/admin/players/${selected.id}`, "PATCH", {
                      player: data,
                    }),
                  )
                }
              />
              <section className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-bold">
                    Клубы и сезоны · {selected.seasons.length}
                  </h3>
                  {editable && (
                    <button className={action} onClick={() => setCopy("new")}>
                      Добавить в клуб / сезон
                    </button>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {selected.seasons.map((card) => (
                    <details
                      key={`${card.id}-${version}`}
                      className="rounded-xl border border-white/10 p-3"
                    >
                      <summary className="cursor-pointer text-sm">
                        <strong>{card.clubSeason.season.label}</strong> ·{" "}
                        {localizedClubName(card.clubSeason.club.nameRu, "ru")} ·{" "}
                        {card.mainPosition} · рейтинг {card.rating}
                        {card.primeRating > 0
                          ? ` / прайм ${card.primeRating}`
                          : ""}
                      </summary>
                      <CardForm
                        card={card}
                        busy={busy}
                        editable={editable}
                        onSave={(data) =>
                          void execute(() =>
                            adminApi(
                              `/api/admin/players/${selected.id}`,
                              "PATCH",
                              { season: { id: card.id, data } },
                            ),
                          )
                        }
                      />
                      {editable && (
                        <button
                          className={`${secondary} mt-3`}
                          onClick={() => setCopy(card)}
                        >
                          Копировать в другой клуб / сезон
                        </button>
                      )}
                    </details>
                  ))}
                  {!selected.seasons.length && (
                    <p className="text-sm text-white/50">
                      Сезонных карточек пока нет.
                    </p>
                  )}
                </div>
              </section>
              {copy && (
                <section className={panel}>
                  <div className="flex justify-between gap-3">
                    <h3 className="font-bold">
                      {copy === "new"
                        ? "Новая сезонная карточка"
                        : "Копия сезонной карточки"}
                    </h3>
                    <button onClick={() => setCopy(null)}>Отменить</button>
                  </div>
                  <CardForm
                    key={copy === "new" ? "new" : copy.id}
                    card={copy === "new" ? undefined : copy}
                    seasons={seasons}
                    initialClubSeasonId={initialClubSeasonId}
                    editable={editable}
                    busy={busy}
                    onSave={(data, clubSeasonId) =>
                      void execute(async () => {
                        await adminApi(
                          `/api/admin/players/${selected.id}/cards`,
                          "POST",
                          { card: data, clubSeasonId },
                        );
                        setCopy(null);
                      }, "Карточка добавлена в состав")
                    }
                  />
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
function IdentityForm({
  player,
  editable,
  busy,
  onSave,
}: {
  player?: Player;
  editable: boolean;
  busy: boolean;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const parts = player
    ? playerDisplayName(player.fullName, player.lastName)
    : null;
  const fields = [
    [
      "lastName",
      "Фамилия / имя на форме · EN",
      localizePlayerName(parts?.surname || "", "en"),
    ],
    [
      "firstName",
      "Имя · EN",
      localizePlayerName(player?.firstName || parts?.given || "", "en"),
    ],
    ["alias", "Псевдоним · EN", player?.alias || ""],
    [
      "lastNameRu",
      "Фамилия / имя на форме · RU",
      player?.lastNameRu || localizePlayerName(parts?.surname || "", "ru"),
    ],
    [
      "firstNameRu",
      "Имя · RU",
      player?.firstNameRu ||
        localizePlayerName(player?.firstName || parts?.given || "", "ru"),
    ],
    ["aliasRu", "Псевдоним · RU", player?.aliasRu || ""],
    ["nationality", "Гражданство", player?.nationality || ""],
    ["birthYear", "Год рождения", player?.birthYear || ""],
  ];
  return (
    <form
      className={panel}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const data: Record<string, unknown> = {};
        for (const [key] of fields)
          data[key] =
            key === "birthYear"
              ? f.get(String(key))
                ? Number(f.get(String(key)))
                : null
              : String(f.get(String(key)) || "").trim() || null;
        onSave(data);
      }}
    >
      <h3 className="text-lg font-bold">
        {player ? "Данные футболиста" : "Создать футболиста"}
      </h3>
      <p className="mt-1 text-xs text-white/50">
        Эти данные общие для всех клубов и сезонов. Английская фамилия или имя
        на форме обязательны.
      </p>
      <fieldset
        disabled={!editable || busy}
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {fields.map(([key, label, value]) => (
          <label key={String(key)} className="text-sm">
            {label}
            <input
              data-no-translate
              required={key === "lastName"}
              maxLength={key === "alias" || key === "aliasRu" ? 50 : 100}
              min={key === "birthYear" ? 1900 : undefined}
              max={key === "birthYear" ? new Date().getFullYear() : undefined}
              className={input}
              type={key === "birthYear" ? "number" : "text"}
              name={String(key)}
              defaultValue={String(value)}
            />
          </label>
        ))}
        {editable && (
          <button className={`${action} w-fit sm:col-span-2 lg:col-span-3`}>
            {busy
              ? "Сохраняем…"
              : player
                ? "Сохранить данные"
                : "Создать игрока"}
          </button>
        )}
      </fieldset>
    </form>
  );
}
export function CardForm({
  card,
  seasons,
  initialClubSeasonId = "",
  editable,
  busy,
  onSave,
}: {
  card?: Card;
  seasons?: RosterChoice[];
  initialClubSeasonId?: string;
  editable: boolean;
  busy: boolean;
  onSave: (data: Record<string, unknown>, clubSeasonId?: string) => void;
}) {
  const [main, setMain] = useState(card?.mainPosition || "ЦП"),
    [other, setOther] = useState(
      (card?.otherPositions || "").split(",").filter(Boolean),
    ),
    [clubSeasonId, setClubSeasonId] = useState(initialClubSeasonId);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = cardData(card);
    for (const k of [
      "rating",
      "primeRating",
      "age",
      "shirtNumber",
      "matches",
      "goals",
      "assists",
    ])
      data[k] =
        f.get(k) === "" ? (k === "primeRating" ? 0 : null) : Number(f.get(k));
    for (const k of [
      "primeSeason",
      "nationality",
      "sourceName",
      "sourcePosition",
      "sourceUrl",
    ])
      data[k] = String(f.get(k) || "").trim() || null;
    data.mainPosition = main;
    data.otherPositions = other.filter((p) => p !== main).join(",") || null;
    onSave(data, clubSeasonId);
  }
  return (
    <form className="mt-4" onSubmit={submit}>
      <fieldset disabled={!editable || busy} className="space-y-4">
        {seasons && (
          <ClubSeasonSelect
            seasons={seasons}
            value={clubSeasonId}
            onChange={setClubSeasonId}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["rating", "Рейтинг сезона", 1, 100],
            ["primeRating", "Прайм-рейтинг (0 — нет)", 0, 100],
            ["primeSeason", "Лучший сезон", undefined, undefined],
          ].map(([k, label, min, max]) => (
            <label key={String(k)} className="text-sm">
              {label}
              <input
                className={input}
                name={String(k)}
                required={k === "rating"}
                type={k === "primeSeason" ? "text" : "number"}
                min={min as number | undefined}
                max={max as number | undefined}
                defaultValue={String(
                  card?.[String(k)] ??
                    (k === "rating" ? 70 : k === "primeRating" ? 0 : ""),
                )}
              />
            </label>
          ))}
        </div>
        <PositionsEditor
          main={main}
          other={other}
          onMain={setMain}
          onOther={setOther}
        />
        <details>
          <summary className="cursor-pointer text-sm text-emerald-300">
            Статистика, номер и источник данных
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ["nationality", "Гражданство", "text"],
              ["age", "Возраст в сезоне", "number"],
              ["shirtNumber", "Игровой номер", "number"],
              ["matches", "Матчи", "number"],
              ["goals", "Голы", "number"],
              ["assists", "Ассисты", "number"],
              ["sourceName", "Источник", "text"],
              ["sourcePosition", "Исходная позиция", "text"],
              ["sourceUrl", "Ссылка на источник", "url"],
            ].map(([k, label, type]) => (
              <label key={k} className="text-sm">
                {label}
                <input
                  className={input}
                  data-no-translate
                  type={type}
                  name={k}
                  defaultValue={String(card?.[k] ?? "")}
                />
              </label>
            ))}
          </div>
        </details>
        {editable && (
          <button disabled={busy} className={action}>
            {busy
              ? "Сохраняем…"
              : seasons
                ? "Добавить карточку"
                : "Сохранить карточку"}
          </button>
        )}
      </fieldset>
    </form>
  );
}
