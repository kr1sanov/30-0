import { NextRequest, NextResponse } from 'next/server';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { db } from '@/lib/db';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/auth/') && path !== '/api/auth/profile' && path !== '/api/auth/telegram') {
    return NextResponse.json({ error: 'Доступен только вход через Telegram' }, { status: 410 });
  }
  if (path === '/api/auth/telegram') return NextResponse.next();
  if (path.startsWith('/api/daily') || path.startsWith('/api/referrals')) {
    return NextResponse.json({ error: 'Этот режим скоро появится' }, { status: 403 });
  }
  const protectedPath = path.startsWith('/api/runs') || path.startsWith('/api/users') || path.startsWith('/api/telegram') || path === '/api/auth/profile';
  if (!protectedPath) return NextResponse.next();
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });
  if (!['GET', 'HEAD'].includes(request.method) && !sameOrigin(request)) {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }
  const suppliedUser = request.nextUrl.searchParams.get('userId');
  if (suppliedUser && suppliedUser !== userId) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
  // Do not consume or clone mutation bodies in the proxy. Under Passenger the
  // request stream is not reliably replayable, which made every valid game
  // POST fail with “Некорректный запрос”. Mutation handlers derive the user
  // from the signed Telegram session and never trust a body userId.
  const match = path.match(/^\/api\/runs\/([^/]+)/);
  if (match && match[1] !== 'active') {
    const run = await db.gameRun.findUnique({ where: { id: match[1] }, select: { userId: true } });
    if (!run || run.userId !== userId) return NextResponse.json({ error: 'Нет доступа к игре' }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
