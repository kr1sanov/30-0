import { NextResponse } from "next/server";
import { sessionUser, sameOrigin } from "@/lib/telegramSession";
import { currentPreferences } from "@/lib/cloudPreferences";
import { validPreferencePatch } from "@/lib/notificationPreferences";
export async function GET(request: Request) {
  const id = sessionUser(request);
  if (!id)
    return NextResponse.json({ error: "Sign in to Telegram" }, { status: 401 });
  try {
    return NextResponse.json({ preferences: await currentPreferences(id) });
  } catch {
    return NextResponse.json(
      {
        error:
          "Notification settings are temporarily unavailable. Please retry.",
      },
      { status: 503 },
    );
  }
}
export async function PATCH(request: Request) {
  const id = sessionUser(request);
  if (!id || !sameOrigin(request))
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  let patch;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!validPreferencePatch(patch))
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  try {
    return NextResponse.json({
      preferences: await currentPreferences(id, patch),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save settings. Please retry." },
      { status: 503 },
    );
  }
}
