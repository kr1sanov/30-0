import { NextResponse } from 'next/server';

/**
 * GET /api/auth/yandex
 * Redirects user to Yandex OAuth authorization page
 */
export async function GET() {
  const clientId = process.env.YANDEX_CLIENT_ID;
  const redirectUri = process.env.YANDEX_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    // Instead of returning JSON, redirect back with error param
    // so the user sees a friendly error in the app
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    return NextResponse.redirect(
      new URL('/?auth_error=oauth_not_configured', baseUrl || 'http://localhost:3000')
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
