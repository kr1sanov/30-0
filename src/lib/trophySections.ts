export const trophySections = [
  ["all", "Все"],
  ["classic", "Обычный драфт"],
  ["single_club", "Один клуб"],
  ["challenge", "Челленджи"],
  ["multiplayer", "Мультиплеер"],
  ["social", "Профиль"],
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
