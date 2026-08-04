import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Generate a short unique referral code
function generateReferralCode(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let code = 'rpl';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    const clientId = process.env.VK_ID_CLIENT_ID;
    const clientSecret = process.env.VK_ID_CLIENT_SECRET;
    const redirectUri = process.env.VK_ID_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'VK ID not configured' }, { status: 500 });
    }

    // Exchange code for access token via VK ID OAuth
    const tokenRes = await fetch('https://id.vk.ua/oauth2/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || '',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('VK token exchange failed:', errText);
      return NextResponse.json({ error: 'VK token exchange failed' }, { status: 401 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token from VK' }, { status: 401 });
    }

    // Get user info from VK API
    const userRes = await fetch(`https://api.vk.com/method/users.get?access_token=${accessToken}&fields=photo_200,first_name,last_name,screen_name&v=5.131`);
    const userData = await userRes.json();

    if (!userData.response || !userData.response[0]) {
      console.error('VK user info failed:', userData);
      return NextResponse.json({ error: 'Failed to get VK user info' }, { status: 401 });
    }

    const vkUser = userData.response[0];
    const vkId = String(vkUser.id);
    const firstName = vkUser.first_name || null;
    const lastName = vkUser.last_name || null;
    const photoUrl = vkUser.photo_200 || null;
    const username = vkUser.screen_name || null;

    // Upsert user in database
    const user = await db.user.upsert({
      where: { id: `vk_${vkId}` },
      create: {
        id: `vk_${vkId}`,
        provider: 'vk',
        providerId: vkId,
        username,
        firstName,
        lastName,
        photoUrl,
        displayName: firstName || username || 'Игрок',
        referralCode: generateReferralCode(),
      },
      update: {
        username,
        firstName,
        lastName,
        photoUrl,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        provider: user.provider,
        providerId: user.providerId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        displayName: user.displayName,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error('VK auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
