"use client";
import { ALL_POSITIONS, POSITION_NAMES, type Position } from "@/lib/positions";
export const panel =
  "rounded-2xl border border-white/10 bg-[#121a17] p-4 sm:p-5";
export const input =
  "mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-[#080e0c] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20";
export const action =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-[#07110d] hover:bg-emerald-300 disabled:opacity-40";
export const secondary =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40";
export async function adminApi<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const r = await fetch(path, {
    method,
    signal,
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Ошибка запроса (${r.status})`);
  return data;
}
export function PositionsEditor({
  main,
  other,
  onMain,
  onOther,
}: {
  main: string;
  other: string[];
  onMain: (v: string) => void;
  onOther: (v: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Основная позиция
        <select
          className={input}
          value={main}
          onChange={(e) => {
            onMain(e.target.value);
            onOther(other.filter((p) => p !== e.target.value));
          }}
        >
          {ALL_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p} — {POSITION_NAMES[p]}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="text-sm text-white/65">
          Дополнительные позиции
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALL_POSITIONS.filter((p) => p !== main).map((p) => (
            <label
              key={p}
              title={POSITION_NAMES[p as Position]}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs focus-within:ring-2 focus-within:ring-emerald-400 ${other.includes(p) ? "border-emerald-400 bg-emerald-400/10 text-emerald-200" : "border-white/15 text-white/65"}`}
            >
              <input
                type="checkbox"
                checked={other.includes(p)}
                onChange={() =>
                  onOther(
                    other.includes(p)
                      ? other.filter((v) => v !== p)
                      : [...other, p],
                  )
                }
              />
              {p}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
export type RosterChoice = {
  id: string;
  label: string;
  clubs: { id: string; name: string; players: number }[];
};
export function ClubSeasonSelect({
  seasons,
  value,
  onChange,
}: {
  seasons: RosterChoice[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      Клуб и сезон
      <select
        required
        className={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Выбери клуб и сезон</option>
        {seasons.map((s) => (
          <optgroup key={s.id} label={s.label}>
            {s.clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {s.label} · {c.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
