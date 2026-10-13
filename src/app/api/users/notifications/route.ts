import { NextResponse } from "next/server";
import { sessionUser, sameOrigin } from "@/lib/telegramSession";
import { currentPreferences } from "@/lib/cloudPreferences";
import { validPreferencePatch } from "@/lib/notificationPreferences";
export async function GET(request: Request) {
  const id = sessionUser(request);
  if (!id)
    return NextResponse.json({ error: "Войди через Telegram" }, { status: 401 });
  try {
    return NextResponse.json({ preferences: await currentPreferences(id) });
  } catch {
    return NextResponse.json(
      {
        error:
          "Настройки уведомлений временно недоступны. Попробуй ещё раз.",
      },
      { status: 503 },
    );
  }
}
export async function PATCH(request: Request) {
  const id = sessionUser(request);
  if (!id || !sameOrigin(request))
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  let patch;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  if (!validPreferencePatch(patch))
    return NextResponse.json({ error: "Некорректные настройки" }, { status: 400 });
  try {
    return NextResponse.json({
      preferences: await currentPreferences(id, patch),
    });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить настройки. Попробуй ещё раз." },
      { status: 503 },
    );
  }
}
