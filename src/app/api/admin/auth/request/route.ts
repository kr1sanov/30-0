import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rateLimit';
import { hashAdminCode, isTrustedAdmin } from '@/lib/adminAuth';
import { sendTelegramMessage } from '@/lib/telegramBot';
import { sameOrigin } from '@/lib/telegramSession';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  const limited = enforceRateLimit(request, 'admin:otp', { limit: 4, windowMs: 15 * 60_000 });
  if (limited) return limited;
  try {
    const { telegramId } = await request.json();
    const id = String(telegramId ?? '').trim();
    if (!/^\d{5,16}$/.test(id)) return NextResponse.json({ error: 'Введите числовой Telegram ID' }, { status: 400 });
    if (!await isTrustedAdmin(id)) return NextResponse.json({ error: 'Этот Telegram ID не имеет доступа к админке' }, { status: 403 });
    const code = String(randomInt(100000, 1000000));
    await db.adminLoginChallenge.create({ data: { telegramId: id, codeHash: hashAdminCode(code), expiresAt: new Date(Date.now() + 5 * 60_000) } });
    const sent = await sendTelegramMessage(id, `<b>Код входа в админку 30-0</b>\n\n<code>${code}</code>\n\nКод действует 5 минут. Не пересылайте его.`);
    if (!sent) return NextResponse.json({ error: 'Не удалось отправить код. Сначала откройте бота и нажмите /start.' }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Не удалось запросить код' }, { status: 500 }); }
}
