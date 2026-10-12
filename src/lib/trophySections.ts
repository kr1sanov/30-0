export const trophySections = [
  ["all", "All"],
  ["classic", "Classic"],
  ["single_club", "One Club"],
  ["challenge", "Challenges"],
  ["multiplayer", "Multiplayer"],
  ["social", "Profile"],
] as const;
export function trophySection(id: string) {
  if (id === "referral_invite") return "social";
  if (id.startsWith("duel_") || id === "multiplayer_series_champion")
    return "multiplayer";
  if (["vagner_legend", "dzyuba_record"].includes(id)) return "challenge";
  if (id.startsWith("club_") || ["army_season", "neva_attack"].includes(id))
    return "single_club";
  return "classic";
}
