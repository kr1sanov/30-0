export function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function validTelegramHtml(text: string) {
  const stack: string[] = [];
  let valid = true;
  const rest = text.replace(/<[^>]*>/g, (tag) => {
    const m =
      /^<(\/?)(b|i|u|s|code|pre|blockquote|a)(?: href="(https:\/\/[^"<>\s]+)")?>$/.exec(
        tag,
      );
    if (!m || (m[2] === "a" && !m[1] && !m[3]) || (m[2] !== "a" && m[3])) {
      valid = false;
      return "";
    }
    if (m[1]) {
      if (stack.pop() !== m[2]) valid = false;
    } else stack.push(m[2]);
    return "";
  });
  return (
    valid &&
    !stack.length &&
    !/[<>]/.test(rest) &&
    !/&(?!(?:amp|lt|gt|quot|#39|#\d+|#x[0-9a-fA-F]+);)/.test(rest)
  );
}
export const campaignTriggers = [
  "manual",
  "scheduled",
  "daily",
  "weekly",
  "monthly",
  "return",
  "new_user",
  "season_complete",
  "perfect_season",
];
export function campaignPeriod(
  cadence: string,
  now: Date,
  scheduledAt: Date | null,
) {
  if (
    cadence === "manual" ||
    cadence === "new_user" ||
    cadence === "season_complete" ||
    cadence === "perfect_season"
  )
    return null;
  if (cadence === "scheduled")
    return scheduledAt && scheduledAt <= now ? "scheduled" : null;
  if (now.getUTCHours() < 9) return null;
  const day = now.toISOString().slice(0, 10);
  if (cadence === "daily") return day;
  if (cadence === "monthly" && now.getUTCDate() !== 1) return null;
  if (cadence === "monthly") return day.slice(0, 7);
  if ((cadence === "weekly" || cadence === "return") && now.getUTCDay() !== 1)
    return null;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}
