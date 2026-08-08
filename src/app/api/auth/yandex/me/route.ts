import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/yandex/me
 * Returns current user session data from the cookie
 */
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('yandex_session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    return NextResponse.json({
      authenticated: true,
      user: {
        id: sessionData.id,
        provider: sessionData.provider,
        displayName: sessionData.displayName,
        photoUrl: sessionData.photoUrl || null,
        email: sessionData.email || null,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
