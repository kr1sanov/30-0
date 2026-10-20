import { moscowDay } from "./adminInsights.ts";
/** Game-return cohorts, not visit retention: page visits are not retained historically. */
export function gameReturnCohorts(
  users: { id: string; createdAt: Date; runs: { createdAt: Date }[] }[],
  now = new Date(),
) {
  const today = Date.parse(moscowDay(now));
  return [1, 7].map((day) => {
    const eligible = users.filter(
      (u) => Date.parse(moscowDay(u.createdAt)) + (day + 1) * 86400000 <= today,
    );
    const returned = eligible.filter((u) =>
      u.runs.some(
        (r) =>
          Date.parse(moscowDay(r.createdAt)) -
            Date.parse(moscowDay(u.createdAt)) ===
          day * 86400000,
      ),
    ).length;
    return {
      day,
      eligible: eligible.length,
      returned,
      rate: eligible.length
        ? Math.round((returned / eligible.length) * 100)
        : null,
    };
  });
}
