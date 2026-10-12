import { NextResponse } from "next/server";
import { sessionUser, sameOrigin } from "@/lib/telegramSession";
export async function PATCH(request: Request) {
  if (!sessionUser(request) || !sameOrigin(request))
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  return NextResponse.json(
    {
      error:
        "Profile cosmetics have been retired. Your Telegram avatar is used automatically.",
    },
    { status: 410 },
  );
}
