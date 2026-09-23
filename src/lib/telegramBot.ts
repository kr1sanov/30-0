const API_ROOT = 'https://api.telegram.org';

function botToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token && /^[1-9][0-9]{5,11}:[A-Za-z0-9_-]{30,}$/.test(token) ? token : null;
}

async function callTelegram(method: string, body: BodyInit, headers?: HeadersInit): Promise<boolean> {
  const token = botToken();
  if (!token) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await fetch(`${API_ROOT}/bot${token}/${method}`, {
      method: 'POST', body, headers, signal: controller.signal, cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function telegramChatId(providerId: string): string | null {
  const match = /^telegram_([1-9][0-9]{0,15})$/.exec(providerId);
  return match?.[1] ?? null;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  return callTelegram('sendMessage', JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }), { 'Content-Type': 'application/json' });
}

export async function sendTelegramPhoto(chatId: string, image: Uint8Array, caption: string): Promise<boolean> {
  const form = new FormData();
  form.set('chat_id', chatId);
  form.set('caption', caption.slice(0, 1024));
  form.set('parse_mode', 'HTML');
  const bytes = new Uint8Array(image.byteLength);
  bytes.set(image);
  form.set('photo', new Blob([bytes.buffer], { type: 'image/png' }), '30-0-result.png');
  return callTelegram('sendPhoto', form);
}
