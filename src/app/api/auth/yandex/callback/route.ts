import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/auth/yandex/callback
 * Called by the frontend after Yandex redirects to the app root with ?code=...
 * Exchanges the code for a token, fetches user info, creates/updates user.
 * Returns JSON (not redirect) since this is called via fetch() from the client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body.code as string | undefined;
    const state = body.state as string | undefined;

    if (!code) {
      return NextResponse.json({ error: 'no_code' }, { status: 400 });
    }

    // Verify CSRF state from cookie
    const savedState = req.cookies.get('yandex_oauth_state')?.value;
    if (state && savedState && state !== savedState) {
      return NextResponse.json({ error: 'state_mismatch' }, { status: 400 });
    }

    const clientId = process.env.YANDEX_CLIENT_ID;
    const clientSecret = process.env.YANDEX_CLIENT_SECRET;
    const redirectUri = process.env.YANDEX_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Yandex OAuth env vars missing:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri,
      });
      return NextResponse.json({ error: 'config_missing' }, { status: 500 });
    }

    // Step 1: Exchange code for OAuth token
    const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('Yandex token exchange failed:', errBody);
      return NextResponse.json({ error: 'token_failed' }, { status: 502 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: 'no_access_token' }, { status: 502 });
    }

    // Step 2: Fetch user info from Yandex
    const userInfoResponse = await fetch('https://login.yandex.ru/info?format=json', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Yandex user info failed:', await userInfoResponse.text());
      return NextResponse.json({ error: 'user_info_failed' }, { status: 502 });
    }

    const userInfo = await userInfoResponse.json();

    // Extract user data from Yandex response
    const yandexId = String(userInfo.id);
    const login = userInfo.login || '';
    const firstName = userInfo.first_name || null;
    const lastName = userInfo.last_name || null;
    const email = userInfo.default_email || null;
    const avatarId = userInfo.default_avatar_id || null;
    const isAvatarEmpty = userInfo.is_avatar_empty !== false;
    const photoUrl = avatarId && !isAvatarEmpty
      ? `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200`
      : null;

    const displayName = firstName
      ? `${firstName}${lastName ? ' ' + lastName : ''}`
      : login || 'Игрок';

    // Step 3: Create or update user in database
    let user;
    try {
      user = await db.user.upsert({
        where: { providerId: `yandex_${yandexId}` },
        update: {
          firstName,
          lastName,
          photoUrl,
          email,
          displayName,
        },
        create: {
          provider: 'yandex',
          providerId: `yandex_${yandexId}`,
          firstName,
          lastName,
          photoUrl,
          email,
          displayName,
        },
      });
    } catch (dbError) {
      console.error('Database upsert failed:', dbError);
      // Continue without DB — still authenticate the user
      user = null;
    }

    const userId = user?.id || `yandex_${yandexId}`;

    // Step 4: Set session cookie and return user data
    const sessionData = JSON.stringify({
      id: userId,
      provider: 'yandex',
      displayName,
      photoUrl,
      email,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        provider: 'yandex',
        displayName,
        photoUrl,
        email,
      },
    });

    // Set a session cookie (valid for 30 days)
    response.cookies.set('yandex_session', encodeURIComponent(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Clear the OAuth state cookie
    response.cookies.delete('yandex_oauth_state');

    return response;
  } catch (err) {
    console.error('Yandex auth callback error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

/**
 * GET /api/auth/yandex/callback
 * Fallback for direct browser navigation (e.g. if redirect_uri was set to this path).
 * Redirects to root with error since the primary flow is POST from frontend.
 */
export async function GET() {
  // If someone navigates here directly, redirect to home
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return NextResponse.redirect(new URL('/?auth_error=invalid_callback', baseUrl));
}
