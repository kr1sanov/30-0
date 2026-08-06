import { NextResponse } from 'next/server';

/**
 * GET /api/auth/yandex
 * Redirects user to Yandex OAuth authorization page
 */
export async function GET() {
  const clientId = process.env.YANDEX_CLIENT_ID;
  const redirectUri = process.env.YANDEX_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Yandex OAuth not configured' },
      { status: 500 }
    );
  }

  // Scopes: login:info (name, sex), login:email, login:avatar (portrait)
  const scope = 'login:info login:email login:avatar';

  // Generate random state for CSRF protection
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  const authUrl = `https://oauth.yandex.ru/authorize?${params.toString()}`;

  // Set state in a cookie so we can verify it on callback
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('yandex_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
