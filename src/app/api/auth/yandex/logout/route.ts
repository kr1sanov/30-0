import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/yandex/logout
 * Clears Yandex auth session cookies
 */
export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Clear the OAuth state cookie if it exists
  response.cookies.delete('yandex_oauth_state');

  // Clear any session cookie
  response.cookies.delete('yandex_session');

  return response;
}
