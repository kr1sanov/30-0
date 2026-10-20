import { localizePlayerName } from "./footballNames.ts";
export function normalizePlayerSearch(value: string) {
  return localizePlayerName(value, "ru")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export type DuplicatePerson = {
  id: string;
  fullName: string;
  firstName?: string | null;
  lastName: string;
  birthYear: number | null;
  nationality?: string | null;
  mergedIntoId?: string | null;
  seasons: {
    clubSeasonId: string;
    sourceUrl?: string | null;
    clubId?: string;
    year?: number;
    mainPosition?: string;
    rating?: number;
  }[];
};
export function playerDuplicateGroups(players: DuplicatePerson[]) {
  const groups = new Map<string, DuplicatePerson[]>();
  for (const p of players) {
    if (p.mergedIntoId) continue;
    const key = normalizePlayerSearch(p.fullName).split(" ").sort().join(" ");
    if (!key) continue;
    groups.set(key, [...(groups.get(key) || []), p]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((group) => {
      const members = [...group].sort(
        (a, b) =>
          b.seasons.length - a.seasons.length || a.id.localeCompare(b.id),
      );
      const years = new Set(members.map((p) => p.birthYear).filter(Boolean));
      const countries = new Set(
        members
          .map((p) =>
            normalizePlayerSearch(p.nationality || "").replace(
              /^russia$|^россия$|^руссиа$/,
              "ru",
            ),
          )
          .filter(Boolean),
      );
      const hasBirthYears = members.every((p) => p.birthYear !== null);
      const individualUrls = members.map(
        (p) =>
          new Set(
            p.seasons
              .map((s) => s.sourceUrl)
              .filter(
                (u): u is string =>
                  !!u && /(?:player|footballer|people)[^?#]*\d/i.test(u),
              ),
          ),
      );
      const sharedSource = [...individualUrls[0]].some((url) =>
        individualUrls.every((urls) => urls.has(url)),
      );
      // Source archives without birth dates can be reconciled only by a continuous
      // same-club career and playing line, with no conflicting FIFA identities.
      const line = (p: string | undefined) =>
        p === "ВР"
          ? "gk"
          : ["ЦЗ", "ЛЗ", "ПЗ", "ЛФЗ", "ПФЗ"].includes(p || "")
            ? "def"
            : ["ОП", "ЦП", "АП", "ЛП", "ПП"].includes(p || "")
              ? "mid"
              : ["ЛВ", "ПВ", "НП", "ЦН"].includes(p || "")
                ? "att"
                : null;
      const linked = (a: DuplicatePerson, b: DuplicatePerson) =>
        a.seasons.some((x) =>
          b.seasons.some(
            (y) =>
              x.clubId &&
              x.clubId === y.clubId &&
              x.year !== undefined &&
              y.year !== undefined &&
              Math.abs(x.year - y.year) === 1 &&
              line(x.mainPosition) &&
              line(x.mainPosition) === line(y.mainPosition) &&
              x.rating !== undefined &&
              y.rating !== undefined &&
              Math.abs(x.rating - y.rating) <= 12,
          ),
        );
      const connected = new Set([members[0].id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const member of members)
          if (
            !connected.has(member.id) &&
            members.some(
              (other) => connected.has(other.id) && linked(member, other),
            )
          ) {
            connected.add(member.id);
            grew = true;
          }
      }
      const fifaIds = members.filter((p) =>
        /^fifaindex-player-\d+$/.test(p.id),
      ).length;
      const overlapping = members.some((p, i) =>
        members
          .slice(i + 1)
          .some((other) =>
            p.seasons.some((a) =>
              other.seasons.some((b) => a.clubSeasonId === b.clubSeasonId),
            ),
          ),
      );
      const careerVerified =
        members.length > 1 &&
        fifaIds <= 1 &&
        !overlapping &&
        connected.size === members.length;
      const safe =
        years.size <= 1 &&
        countries.size <= 1 &&
        ((hasBirthYears &&
          years.size === 1 &&
          normalizePlayerSearch(members[0].fullName).includes(" ")) ||
          sharedSource ||
          careerVerified);
      return {
        targetId: members[0].id,
        safe,
        reason: safe
          ? careerVerified
            ? "Совпадают имя, клуб в соседних сезонах и игровая линия; нет конфликта FIFA ID"
            : "Совпадают имя и независимые данные личности"
          : "Нужно сверить личность: одного похожего имени недостаточно",
        members,
      };
    });
}
