"use client";
import { useEffect, useState } from "react";
type Row = {
  id: string;
  rank: number;
  username: string | null;
  displayName: string;
  seasons: number;
  points: number;
};
export default function AdminLeaderboard() {
  const [period, setPeriod] = useState("1"),
    [rows, setRows] = useState<Row[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/admin/leaderboard?period=" + period, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setRows(data.rows);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [period]);
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">
Самые активные игроки
</h2>
      <p className="text-sm text-white/50">
Рейтинг по завершённым сезонам за выбранный период. При равенстве учитывается ID игрока. До 50 игроков.
</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          ["1", "День"],
          ["3", "3 дня"],
          ["7", "Неделя"],
          ["30", "Месяц"],
          ["365", "Год"],
        ].map(([k, v]) => (
          <button
            key={k}
            onClick={() => setPeriod(k)}
            className={`min-h-11 shrink-0 rounded-xl border border-white/15 px-4 ${period === k ? "bg-emerald-400 text-black" : "bg-white/5"}`}
          >
            {v}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {loading ? (
        <p>
Загрузка…
</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/15">
                <th className="p-3">
Место
</th>
                <th>
Игрок
</th>
                <th>
Сезоны
</th>
                <th>
Очки
</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-white/10">
                  <td className="p-3">{u.rank}</td>
                  <td>{u.username ? `@${u.username}` : u.displayName}</td>
                  <td>{u.seasons}</td>
                  <td>{u.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="py-5 text-white/50">
За этот период нет завершённых сезонов.
</p>
          )}
        </div>
      )}
    </section>
  );
}
