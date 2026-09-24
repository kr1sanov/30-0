import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rateLimit';
import { hashAdminCode, isTrustedAdmin } from '@/lib/adminAuth';
import { sendTelegramMessageDetailed } from '@/lib/telegramBot';
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
    const result = await sendTelegramMessageDetailed(id, `<b>Код входа в админку 30-0</b>\n\n<code>${code}</code>\n\nКод действует 5 минут. Не пересылайте его.`);
    if (!result.ok) {
      const errors = {
        configuration: 'На сервере неверно настроен токен Telegram-бота.',
        start_required: 'Telegram не нашёл личный чат с ботом. Откройте именно @RPL30_bot, нажмите Start и повторите. Если вы уже это сделали, проверьте, что в админке указан ID того же аккаунта.',
        blocked: 'Вы заблокировали бота. Разблокируйте @RPL30_bot и нажмите Start, затем повторите.',
        unavailable: 'Telegram временно недоступен или отклонил сообщение. Повторите попытку позже.',
      };
      return NextResponse.json({ error: errors[result.reason] }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Не удалось запросить код' }, { status: 500 }); }
}
