const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const chatId = Number(process.env.TELEGRAM_PROBE_CHAT_ID);
if (!token || !secret || !Number.isSafeInteger(chatId)) throw new Error('Telegram diagnostic credentials unavailable');

const infoResponse = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const info = await infoResponse.json();
if (!infoResponse.ok || !info.ok) throw new Error(`getWebhookInfo failed: ${info.description || infoResponse.status}`);
console.log('Telegram webhook diagnostics:', JSON.stringify({
  url: info.result?.url,
  pending: info.result?.pending_update_count,
  lastError: info.result?.last_error_message,
  lastErrorAt: info.result?.last_error_date,
  lastSyncError: info.result?.last_synchronization_error_date,
}));

const response = await fetch('https://30-0.xn--p1ai/api/telegram/webhook', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret },
  body: JSON.stringify({ message: { chat: { id: chatId, type: 'private' }, from: { id: chatId, first_name: 'Никита' }, text: '/start' } }),
});
console.log(`Authenticated /start probe: HTTP ${response.status}; ${(await response.text()).slice(0, 200)}`);
if (!response.ok) process.exitCode = 1;
