import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAdminWrite, requireAdmin } from "@/lib/adminAuth";
import { sameOrigin } from "@/lib/telegramSession";
import {
  normalizePlayerSearch,
  playerIdentitySchema,
} from "@/lib/adminPlayerData";
import { localizePlayerName } from "@/lib/footballNames";

export async function GET(request: Request) {
  if (!(await requireAdmin(request)))
    return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const search = params.get("q")?.trim().slice(0, 100) ?? "";
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  // Merge results from both languages before pagination; a Latin match must not hide Cyrillic matches.
  const all = await db.player.findMany({
    where: { mergedIntoId: null },
    select: {
      id: true,
      fullName: true,
      lastName: true,
      firstName: true,
      firstNameRu: true,
      lastNameRu: true,
      aliasRu: true,
      alias: true,
      birthYear: true,
      _count: { select: { seasons: true } },
    },
    orderBy: [{ lastName: "asc" }, { id: "asc" }],
  });
  const terms = normalizePlayerSearch(search).split(" ").filter(Boolean);
  const matches = all.filter((p) => {
    const haystack = normalizePlayerSearch(
      [p.fullName, p.firstNameRu, p.lastNameRu, p.alias, p.aliasRu]
        .filter(Boolean)
        .join(" "),
    );
    return terms.every((term) => haystack.includes(term)) || p.id === search;
  });
  if (terms.length)
    matches.sort((a, b) => {
      const rank = (p: typeof a) => {
        const words = normalizePlayerSearch(
          [p.fullName, p.firstNameRu, p.lastNameRu, p.alias, p.aliasRu]
            .filter(Boolean)
            .join(" "),
        ).split(" ");
        return terms.every((t) => words.includes(t))
          ? 0
          : terms.every((t) => words.some((w) => w.startsWith(t)))
            ? 1
            : 2;
      };
      return rank(a) - rank(b) || a.lastName.localeCompare(b.lastName);
    });
  return NextResponse.json(
    {
      total: matches.length,
      page,
      pageSize: 30,
      players: matches.slice((page - 1) * 30, page * 30).map((p) => ({
        ...p,
        nameRu:
          [p.firstNameRu, p.lastNameRu].filter(Boolean).join(" ") ||
          localizePlayerName(p.fullName, "ru"),
        nameEn: localizePlayerName(p.fullName, "en"),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor || !canAdminWrite(actor.role, "players") || !sameOrigin(request))
    return Response.json({ error: "Нет прав" }, { status: 403 });
  const parsed = playerIdentitySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Проверь данные" },
      { status: 400 },
    );
  const data = parsed.data,
    fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
  const existing = await db.player.findMany({
    where: { mergedIntoId: null, fullName },
    select: { id: true, birthYear: true },
  });
  if (existing.some((p) => p.birthYear === data.birthYear))
    return Response.json(
      { error: "Такой игрок уже есть. Найди его и добавь сезонную карточку." },
      { status: 409 },
    );
  const player = await db.player.create({ data: { ...data, fullName } });
  return Response.json({ player }, { status: 201 });
}
