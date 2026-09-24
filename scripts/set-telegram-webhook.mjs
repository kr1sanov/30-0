const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://30-0.xn--p1ai';
const expectedUsername = (process.env.TELEGRAM_BOT_USERNAME || 'RPL30_bot').replace(/^@/, '').toLowerCase();
if (!token || !secret || !base) throw new Error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_BASE_URL first');
const identityResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
const identity = await identityResponse.json();
if (!identityResponse.ok || !identity.ok) throw new Error(`Telegram bot identity check failed: ${identity.description || identityResponse.status}`);
const actualUsername = String(identity.result?.username || '').replace(/^@/, '');
if (!actualUsername || actualUsername.toLowerCase() !== expectedUsername) {
  throw new Error(`Wrong Telegram bot token: expected @${expectedUsername}, received @${actualUsername || 'unknown'}`);
}
console.log(`Verified Telegram bot identity: @${actualUsername}`);
const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: `${base.replace(/\/$/, '')}/api/telegram/webhook`, secret_token: secret, allowed_updates: ['message', 'callback_query'], drop_pending_updates: false }),
});
const result = await response.json();
if (!response.ok || !result.ok) throw new Error(`Telegram webhook setup failed: ${result.description || response.status}`);
console.log('Telegram webhook is configured.');
