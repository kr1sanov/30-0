import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/auth/yandex/callback
 * Handles the OAuth callback from Yandex:
 * 1. Exchanges authorization code for OAuth token
 * 2. Fetches user info from Yandex API
 * 3. Creates or updates user in database
 * 4. Sets session cookie and redirects to the app
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Determine base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'http://localhost:3000');

  // Handle user denial
  if (error) {
    return NextResponse.redirect(new URL(`/?auth_error=${error}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?auth_error=no_code', baseUrl));
  }

  // Verify CSRF state
  const savedState = req.cookies.get('yandex_oauth_state')?.value;
  if (state && savedState && state !== savedState) {
    return NextResponse.redirect(new URL('/?auth_error=state_mismatch', baseUrl));
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
    return NextResponse.redirect(new URL('/?auth_error=config_missing', baseUrl));
  }

  try {
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
      return NextResponse.redirect(new URL('/?auth_error=token_failed', baseUrl));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/?auth_error=no_access_token', baseUrl));
    }

    // Step 2: Fetch user info from Yandex
    const userInfoResponse = await fetch('https://login.yandex.ru/info?format=json', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Yandex user info failed:', await userInfoResponse.text());
      return NextResponse.redirect(new URL('/?auth_error=user_info_failed', baseUrl));
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

    // Step 4: Set session cookie and redirect to app
    // Encode user data in a simple session token
    const sessionData = JSON.stringify({
      id: userId,
      provider: 'yandex',
      displayName,
      photoUrl,
      email,
    });

    const redirectUrl = new URL('/', baseUrl);
    redirectUrl.searchParams.set('auth_success', 'yandex');
    redirectUrl.searchParams.set('user_id', userId);
    redirectUrl.searchParams.set('display_name', displayName);
    if (photoUrl) {
      redirectUrl.searchParams.set('photo_url', photoUrl);
    }
    if (email) {
      redirectUrl.searchParams.set('email', email);
    }

    const response = NextResponse.redirect(redirectUrl);

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
    return NextResponse.redirect(new URL('/?auth_error=server_error', baseUrl));
  }
}
