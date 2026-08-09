import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/yandex
 * Redirects user to Yandex OAuth authorization page.
 * Dynamically determines redirect_uri from the request origin,
 * so it always matches the Yandex console regardless of domain.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.YANDEX_CLIENT_ID;

  if (!clientId) {
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(
      new URL('/?auth_error=oauth_not_configured', baseUrl)
    );
  }

  // Dynamically determine redirect_uri from the request origin.
  // This ensures it always matches what's registered in Yandex console.
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/`;

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

  // Also store the redirect_uri in a cookie so the callback knows what to use
  response.cookies.set('yandex_redirect_uri', redirectUri, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}

/**
 * Determine the base URL from the request.
 * Works for both local dev and Vercel production.
 */
function getBaseUrl(req: NextRequest): string {
  // In Vercel, x-forwarded-host + x-forwarded-proto give the public URL
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fallback: use the host header
  const host = req.headers.get('host');
  if (host) {
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  // Last resort: env var or default
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
