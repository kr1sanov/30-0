"use client";
import { useCallback, useEffect, useState } from "react";
import {
  panel,
  input,
  action,
  secondary,
  adminApi,
  ClubSeasonSelect,
  type RosterChoice,
} from "./adminUi";
import AdminPlayers from "./AdminPlayers";
import { localizePlayerName } from "@/lib/footballNames";
type Season = RosterChoice & { startYear: number; endYear: number };
type Club = { id: string; nameRu: string };
type Roster = {
  id: string;
  players: {
    id: string;
    rating: number;
    primeRating: number;
    mainPosition: string;
    otherPositions: string | null;
    player: {
      id: string;
      fullName: string;
      firstNameRu: string | null;
      lastNameRu: string | null;
    };
  }[];
};
export default function AdminRosterManager({
  onChanged,
}: {
  onChanged: () => void;
}) {
  const [seasons, setSeasons] = useState<Season[]>([]),
    [clubs, setClubs] = useState<Club[]>([]),
    [seasonId, setSeasonId] = useState(""),
    [clubSeasonId, setClubSeasonId] = useState("");
  const [roster, setRoster] = useState<Roster | null>(null),
    [sourceId, setSourceId] = useState(""),
    [clubId, setClubId] = useState(""),
    [selectedPlayer, setSelectedPlayer] = useState("");
  const [adding, setAdding] = useState(false),
    [q, setQ] = useState(""),
    [matches, setMatches] = useState<
      { id: string; nameRu: string; nameEn: string }[]
    >([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0);
  const reload = useCallback(async () => {
    const d = await adminApi<{ seasons: Season[]; clubs: Club[] }>(
      "/api/admin/rosters",
    );
    setSeasons(d.seasons);
    setClubs(d.clubs);
    setSeasonId((current) => current || d.seasons[0]?.id || "");
  }, []);
  useEffect(() => {
    void reload().catch((e) => setError(e.message));
  }, [reload, version]);
  const selectedSeason = seasons.find((s) => s.id === seasonId);
  useEffect(() => {
    setClubSeasonId((current) =>
      selectedSeason?.clubs.some((c) => c.id === current)
        ? current
        : selectedSeason?.clubs[0]?.id || "",
    );
  }, [selectedSeason]);
  useEffect(() => {
    const c = new AbortController();
    setRoster(null);
    if (clubSeasonId)
      adminApi<Roster>(
        `/api/club-seasons/${clubSeasonId}/players`,
        "GET",
        undefined,
        c.signal,
      )
        .then(setRoster)
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        });
    return () => c.abort();
  }, [clubSeasonId, version]);
  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(() => {
      if (adding)
        adminApi<{ players: typeof matches }>(
          `/api/admin/players?q=${encodeURIComponent(q)}`,
          "GET",
          undefined,
          c.signal,
        )
          .then((d) => setMatches(d.players))
          .catch((e) => {
            if (!c.signal.aborted) setError(e.message);
          });
    }, 200);
    return () => {
      c.abort();
      clearTimeout(t);
    };
  }, [q, adding]);
  async function execute(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setVersion((v) => v + 1);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }
  if (selectedPlayer)
    return (
      <div className="space-y-4">
        <button
          className={secondary}
          onClick={() => {
            setSelectedPlayer("");
            setVersion((v) => v + 1);
          }}
        >
          ← К составу
        </button>
        <AdminPlayers
          editable
          canMerge
          initialPlayerId={selectedPlayer}
          initialClubSeasonId={clubSeasonId}
        />
      </div>
    );
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Составы и сезоны</h2>
        <p className="mt-1 text-sm text-white/55">
          Выбери состав, добавь футболистов через поиск или скопируй игроков из
          другого сезона.
        </p>
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
      <section className={panel}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Сезон
            <select
              className={input}
              value={seasonId}
              onChange={(e) => {
                setSeasonId(e.target.value);
                setAdding(false);
              }}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Клуб
            <select
              className={input}
              value={clubSeasonId}
              onChange={(e) => {
                setClubSeasonId(e.target.value);
                setAdding(false);
              }}
            >
              {selectedSeason?.clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.players} карточек
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={!clubSeasonId}
            className={action}
            onClick={() => setAdding((v) => !v)}
          >
            Добавить футболиста
          </button>
          <a href="#players" className={secondary}>
            Создать нового игрока
          </a>
        </div>
        {adding && (
          <div className="mt-4 rounded-xl border border-emerald-400/20 p-4">
            <label className="text-sm">
              Поиск игрока на русском или английском
              <input
                className={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Фамилия или имя"
              />
            </label>
            <p className="mt-2 text-xs text-white/50">
              Открой игрока → «Добавить в клуб / сезон» → выбери нужный состав.
              Его прежние карточки сохранятся.
            </p>
            <div className="mt-2 max-h-64 overflow-auto">
              {matches.map((p) => (
                <button
                  key={p.id}
                  className="block w-full rounded-lg p-2 text-left text-sm hover:bg-white/5"
                  onClick={() => setSelectedPlayer(p.id)}
                  data-no-translate
                >
                  {p.nameRu} <span className="text-white/45">· {p.nameEn}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/45">
              <tr>
                <th className="p-3">Футболист</th>
                <th className="p-3">Позиции</th>
                <th className="p-3">Рейтинг</th>
                <th className="p-3">Прайм</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {roster?.players.map((p) => (
                <tr key={p.id} className="border-t border-white/10">
                  <td className="p-3" data-no-translate>
                    <strong className="block">
                      {[p.player.firstNameRu, p.player.lastNameRu]
                        .filter(Boolean)
                        .join(" ") || localizePlayerName(p.player.fullName, "ru")}
                    </strong>
                    <span className="text-xs text-white/45">
                      {p.player.fullName}
                    </span>
                  </td>
                  <td className="p-3">
                    {[p.mainPosition, p.otherPositions]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td className="p-3">{p.rating}</td>
                  <td className="p-3">{p.primeRating || "—"}</td>
                  <td className="p-3">
                    <button
                      className={secondary}
                      onClick={() => setSelectedPlayer(p.player.id)}
                    >
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!roster?.players.length && (
            <p className="p-4 text-sm text-white/50">
              В составе пока нет игроков.
            </p>
          )}
        </div>
      </section>
      <details className={panel}>
        <summary className="cursor-pointer font-semibold">
          Копировать состав из другого сезона
        </summary>
        <p className="my-3 text-sm text-white/55">
          Добавятся только отсутствующие футболисты. Рейтинги копируются как
          исходные значения — проверь их для нового сезона. Уже существующие
          карточки не изменятся.
        </p>
        <ClubSeasonSelect
          seasons={seasons}
          value={sourceId}
          onChange={setSourceId}
        />
        <button
          className={`${action} mt-3`}
          disabled={
            busy || !sourceId || !clubSeasonId || sourceId === clubSeasonId
          }
          onClick={() =>
            void execute(async () => {
              const d = await adminApi<{ added: number; skipped: number }>(
                "/api/admin/rosters/manage",
                "POST",
                { action: "copyRoster", sourceId, targetId: clubSeasonId },
              );
              setNotice(
                `Добавлено: ${d.added}. Уже есть в составе: ${d.skipped}.`,
              );
            })
          }
        >
          Добавить копии в выбранный состав
        </button>
      </details>
      <details className={panel}>
        <summary className="cursor-pointer font-semibold">
          Добавить клуб в выбранный сезон
        </summary>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void execute(async () => {
              const d = await adminApi<{ clubSeason: { id: string } }>(
                "/api/admin/rosters/manage",
                "POST",
                { action: "addClub", seasonId, clubId },
              );
              await reload();
              setClubSeasonId(d.clubSeason.id);
              setNotice("Клуб добавлен в сезон");
            });
          }}
        >
          <label className="min-w-64 text-sm">
            Клуб
            <select
              required
              className={input}
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
            >
              <option value="">Выбери клуб</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameRu}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy || !seasonId} className={action}>
            Добавить клуб
          </button>
        </form>
      </details>
      <details className={panel}>
        <summary className="cursor-pointer font-semibold">
          Создать новый сезон
        </summary>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void execute(async () => {
              const d = await adminApi<{ season: Season }>(
                "/api/admin/rosters",
                "POST",
                {
                  startYear: Number(f.get("startYear")),
                  endYear: Number(f.get("endYear")),
                  label: f.get("label"),
                  matchesPerTeam: Number(f.get("matchesPerTeam")),
                },
              );
              setSeasonId(d.season.id);
              setNotice("Сезон создан. Добавь клубы и заполни составы.");
            });
          }}
        >
          {[
            ["startYear", "Год начала", "2026", "number"],
            ["endYear", "Год окончания", "2027", "number"],
            ["label", "Название", "2026/27", "text"],
            ["matchesPerTeam", "Матчей на команду", "30", "number"],
          ].map(([k, name, value, type]) => (
            <label key={k} className="text-sm">
              {name}
              <input
                required
                type={type}
                name={k}
                defaultValue={value}
                className={input}
              />
            </label>
          ))}
          <button disabled={busy} className={`${action} w-fit sm:col-span-4`}>
            Создать сезон
          </button>
        </form>
      </details>
    </section>
  );
}
