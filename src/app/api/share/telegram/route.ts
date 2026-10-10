import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';
import { sharedSeason, seasonCaption } from '@/lib/sharedSeason';
import { telegramChatId } from '@/lib/telegramBot';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const limited = enforceRateLimit(request, 'share:telegram', { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { runId, lang } = await request.json().catch(() => ({})) as { runId?: string; lang?: string };
  if (!runId || typeof runId !== 'string') return NextResponse.json({ error: 'Invalid run' }, { status: 400 });
  const [run, user] = await Promise.all([sharedSeason(runId), db.user.findUnique({ where: { id: userId }, select: { providerId: true, referralCode: true } })]);
  if (!run || !user || !await db.gameRun.count({ where: { id: runId, userId } })) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  const chatId = telegramChatId(user.providerId);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !token) return NextResponse.json({ error: 'Telegram unavailable' }, { status: 503 });
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://30-0.рф';
  const url = new URL(`/share/${runId}${user.referralCode ? `?ref=${encodeURIComponent(user.referralCode)}` : ''}`, siteUrl).toString();
  const photo = new URL(`/share/${runId}/photo?lang=${lang === 'en' ? 'en' : 'ru'}`, siteUrl).toString();
  const result = {
    type: 'photo', id: runId, photo_url: photo, thumbnail_url: photo,
    caption: `${seasonCaption(run)}\n\nРезультат: ${url}\n🎮 https://t.me/RPL30_bot?startapp${user.referralCode ? `=${encodeURIComponent(user.referralCode)}` : ''}`,
  };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/savePreparedInlineMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ user_id: Number(chatId), result, allow_user_chats: true, allow_group_chats: true, allow_channel_chats: true }),
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json() as { ok?: boolean; result?: { id: string } };
    if (!response.ok || !payload.ok || !payload.result?.id) throw new Error('Telegram rejected prepared message');
    return NextResponse.json({ messageId: payload.result.id });
  } catch {
    return NextResponse.json({ error: 'Telegram share unavailable' }, { status: 502 });
  }
}
