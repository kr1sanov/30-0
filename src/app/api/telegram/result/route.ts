import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rateLimit';
import { sendTelegramPhoto, telegramChatId } from '@/lib/telegramBot';
import { sessionUser } from '@/lib/telegramSession';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'telegram:result', { limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ error: 'Войдите через Telegram' }, { status: 401 });

  try {
    const body = await request.json() as { runId?: unknown; image?: unknown };
    if (typeof body.runId !== 'string' || typeof body.image !== 'string') {
      return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(body.image);
    if (!match) return NextResponse.json({ error: 'Требуется PNG' }, { status: 400 });
    const image = Buffer.from(match[1], 'base64');
    if (image.length < 256 || image.length > 3_000_000) {
      return NextResponse.json({ error: 'Некорректный размер изображения' }, { status: 400 });
    }

    const run = await db.gameRun.findFirst({
      where: { id: body.runId, userId, completed: true },
      include: { user: true },
    });
    if (!run?.user) return NextResponse.json({ error: 'Результат не найден' }, { status: 404 });
    if (!run.user.telegramNotificationsEnabled) return NextResponse.json({ ok: true, skipped: true });
    const chatId = telegramChatId(run.user.providerId);
    if (!chatId) return NextResponse.json({ error: 'Telegram не подключён' }, { status: 409 });

    const caption = [
      '<b>Сезон завершён!</b> ⚽',
      `${run.wins ?? 0} побед · ${run.draws ?? 0} ничьих · ${run.losses ?? 0} поражений`,
      `<b>${run.points ?? 0} очков · ${run.position ?? '—'}-е место</b>`,
      '',
      'Сможете улучшить результат? Откройте 30-0 и сыграйте ещё раз.',
    ].join('\n');
    const sent = await sendTelegramPhoto(chatId, image, caption);
    if (!sent) return NextResponse.json({ error: 'Telegram не принял сообщение' }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Не удалось отправить результат' }, { status: 500 });
  }
}
