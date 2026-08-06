import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/auth/yandex/callback
 * Handles the OAuth callback from Yandex:
 * 1. Exchanges authorization code for OAuth token
 * 2. Fetches user info from Yandex API
 * 3. Creates or updates user in database
 * 4. Redirects to the app with auth data
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user denial
  if (error) {
    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('auth_error', error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?auth_error=no_code', req.url));
  }

  // Verify CSRF state
  const savedState = req.cookies.get('yandex_oauth_state')?.value;
  if (state && savedState && state !== savedState) {
    return NextResponse.redirect(new URL('/?auth_error=state_mismatch', req.url));
  }

  const clientId = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  const redirectUri = process.env.YANDEX_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/?auth_error=config_missing', req.url));
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
      return NextResponse.redirect(new URL('/?auth_error=token_failed', req.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/?auth_error=no_access_token', req.url));
    }

    // Step 2: Fetch user info from Yandex
    const userInfoResponse = await fetch('https://login.yandex.ru/info?format=json', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Yandex user info failed:', await userInfoResponse.text());
      return NextResponse.redirect(new URL('/?auth_error=user_info_failed', req.url));
    }

    const userInfo = await userInfoResponse.json();

    // Extract user data
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

    // Step 3: Create or update user in database
    const user = await db.user.upsert({
      where: { providerId: `yandex_${yandexId}` },
      update: {
        firstName,
        lastName,
        photoUrl,
        email,
      },
      create: {
        provider: 'yandex',
        providerId: `yandex_${yandexId}`,
        firstName,
        lastName,
        photoUrl,
        email,
        displayName: firstName ? `${firstName}${lastName ? ' ' + lastName : ''}` : login,
      },
    });

    // Step 4: Redirect to app with user data
    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('auth_success', 'yandex');
    redirectUrl.searchParams.set('user_id', user.id);
    redirectUrl.searchParams.set('display_name', user.displayName || login);
    if (user.photoUrl) {
      redirectUrl.searchParams.set('photo_url', user.photoUrl);
    }

    // Clear the OAuth state cookie
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('yandex_oauth_state');

    return response;
  } catch (err) {
    console.error('Yandex auth callback error:', err);
    return NextResponse.redirect(new URL('/?auth_error=server_error', req.url));
  }
}
