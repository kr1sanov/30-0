const API_ROOT = 'https://api.telegram.org';

function botToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token && /^[1-9][0-9]{5,11}:[A-Za-z0-9_-]{30,}$/.test(token) ? token : null;
}
export function telegramChatId(providerId: string): string | null {
  const match = /^telegram_([1-9][0-9]{0,15})$/.exec(providerId);
  return match?.[1] ?? null;
}
async function callTelegram(method: string, body: BodyInit, headers?: HeadersInit): Promise<Response | null> {
  const token = botToken();
  if (!token) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await fetch(`${API_ROOT}/bot${token}/${method}`, { method: 'POST', body, headers, signal: controller.signal, cache: 'no-store' });
    return response.ok ? response : null;
  } catch { return null; } finally { clearTimeout(timeout); }
}
export type TelegramMessageSendResult =
  | { ok: true }
  | { ok: false; reason: 'configuration' | 'start_required' | 'blocked' | 'unavailable' };

export async function sendTelegramMessageDetailed(chatId: string, text: string): Promise<TelegramMessageSendResult> {
  const token = botToken();
  if (!token) return { ok: false, reason: 'configuration' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await fetch(`${API_ROOT}/bot${token}/sendMessage`, {
      method: 'POST',
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null;
    if (response.ok && payload?.ok === true) return { ok: true };
    const description = payload?.description?.toLowerCase() ?? '';
    if (/can't initiate conversation|chat not found|user not found/.test(description)) return { ok: false, reason: 'start_required' };
    if (/blocked by the user|bot was blocked/.test(description)) return { ok: false, reason: 'blocked' };
    return { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}
export async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: unknown): Promise<boolean> {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return Boolean(await callTelegram('sendMessage', JSON.stringify(body), { 'Content-Type': 'application/json' }));
}
export async function sendTelegramPhoto(chatId: string, image: Uint8Array, caption: string, replyMarkup?: unknown): Promise<boolean> {
  const form = new FormData();
  form.set('chat_id', chatId);
  form.set('caption', caption.slice(0, 1024));
  form.set('parse_mode', 'HTML');
  const bytes = new Uint8Array(image.byteLength); bytes.set(image);
  form.set('photo', new Blob([bytes.buffer], { type: 'image/png' }), '30-0-result.png');
  if (replyMarkup) form.set('reply_markup', JSON.stringify(replyMarkup));
  return Boolean(await callTelegram('sendPhoto', form));
}
export async function sendBotPhoto(chatId: string, image: Uint8Array, caption: string, replyMarkup?: unknown) {
  return sendTelegramPhoto(chatId, image, caption, replyMarkup);
}
export async function answerTelegramCallback(callbackQueryId: string, text?: string) {
  return Boolean(await callTelegram('answerCallbackQuery', JSON.stringify({ callback_query_id: callbackQueryId, text }), { 'Content-Type': 'application/json' }));
}
export async function sendTelegramResult(chatId: string, image: Uint8Array, caption: string, appUrl: string) {
  const botUsername = (process.env.TELEGRAM_BOT_USERNAME || 'RPL30_bot').replace(/^@/, '');
  return sendTelegramPhoto(chatId, image, caption, { inline_keyboard: [
    [{ text: 'Открыть 30-0', web_app: { url: appUrl } }],
    [{ text: 'Пригласить друга', url: `https://t.me/${botUsername}?start=season_result` }],
  ] });
}
