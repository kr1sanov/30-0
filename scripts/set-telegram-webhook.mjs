const token = process.env.TELEGRAM_BOT_TOKEN;
const expectedUsername = (process.env.TELEGRAM_BOT_USERNAME || 'RPL30_bot').replace(/^@/, '').toLowerCase();
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN first');
const identityResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
const identity = await identityResponse.json();
if (!identityResponse.ok || !identity.ok) throw new Error(`Telegram bot identity check failed: ${identity.description || identityResponse.status}`);
const actualUsername = String(identity.result?.username || '').replace(/^@/, '');
if (!actualUsername || actualUsername.toLowerCase() !== expectedUsername) {
  throw new Error(`Wrong Telegram bot token: expected @${expectedUsername}, received @${actualUsername || 'unknown'}`);
}
console.log(`Verified Telegram bot identity: @${actualUsername}`);
const beforeInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const beforeInfo = await beforeInfoResponse.json();
if (beforeInfo.ok) {
  console.log('Previous webhook diagnostics:', JSON.stringify({
    url: beforeInfo.result?.url, pending: beforeInfo.result?.pending_update_count,
    lastError: beforeInfo.result?.last_error_message, lastErrorAt: beforeInfo.result?.last_error_date,
  }));
}
// Jino is not reachable from Telegram's webhook network. Poll outbound instead.
const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ drop_pending_updates: false }),
});
const result = await response.json();
if (!response.ok || !result.ok) throw new Error(`Telegram polling setup failed: ${result.description || response.status}`);
console.log('Telegram webhook removed; pending /start updates preserved for outbound polling.');

// Keep the private-chat command picker focused on the one supported command.
// The Main Mini App button configured in BotFather is not changed here.
for (const [language_code, description] of [['', 'Играть в 30-0'], ['ru', 'Играть в 30-0'], ['en', 'Play 30-0']]) {
  const commandResponse = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ commands: [{ command: 'start', description }], scope: { type: 'all_private_chats' }, language_code }),
  });
  const commandResult = await commandResponse.json();
  if (!commandResponse.ok || !commandResult.ok) throw new Error(`Telegram command setup failed: ${commandResult.description || commandResponse.status}`);
}
console.log('Telegram private-chat command list contains only /start.');
