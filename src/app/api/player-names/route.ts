import { visibleChallenges } from "@/lib/challengeCatalog";
import { db } from "@/lib/db";
export async function GET() {
  const players = await db.player.findMany({
    where: {
      mergedIntoId: null,
      OR: [{ lastNameRu: { not: null } }, { aliasRu: { not: null } }],
    },
    select: {
      fullName: true,
      firstName: true,
      lastName: true,
      alias: true,
      firstNameRu: true,
      lastNameRu: true,
      aliasRu: true,
    },
  });
  const names: [string, string][] = [];
  for (const p of players) {
    if (p.lastNameRu) names.push([p.lastName, p.lastNameRu]);
    if (p.firstName && p.firstNameRu) names.push([p.firstName, p.firstNameRu]);
    if (p.lastNameRu)
      names.push([
        p.fullName,
        [p.firstNameRu, p.lastNameRu].filter(Boolean).join(" "),
      ]);
    if (p.alias && p.aliasRu) names.push([p.alias, p.aliasRu]);
  }
  const visible = await visibleChallenges();
  const translations = [...visible.active, ...visible.archive].flatMap((i) => [
    [i.titleRu, i.titleEn],
    [i.descriptionRu, i.descriptionEn],
    [i.achievementTitleRu || i.titleRu, i.achievementTitleEn || i.titleEn],
    [
      i.achievementDescriptionRu || i.descriptionRu,
      i.achievementDescriptionEn || i.descriptionEn,
    ],
  ]);
  return Response.json(
    { names, translations },
    { headers: { "Cache-Control": "no-store" } },
  );
}
