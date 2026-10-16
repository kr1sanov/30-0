import { postNotificationWorker } from './notification-transport.mjs';
import { createHash } from 'node:crypto';
import { callCloudPreferences } from './telegram-cloud-client.mjs';
const secret = process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET || process.env.BRIDGE_SECRET || createHash('sha256').update('30-0 bridge:'+process.env.TGCLOUD_TOKEN).digest('hex');
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || !process.env.TGCLOUD_TOKEN) throw new Error('Notification relay credentials unavailable');
async function worker(body = {}) {
  try { return await callCloudPreferences('worker', { body }); }
  catch { return postNotificationWorker('https://30-0.xn--p1ai/api/telegram/worker', secret, body); }
}

let deferred = 0, synchronized = 0;
const { patches } = await worker({ action: 'patches' });
for (const patch of patches) {
  try {
    const record = await callCloudPreferences('set', { tgId: patch.tgId, patch: patch.patch });
    await worker({ action: 'sync', records: [{ ...record, patchVersion: patch.version }] });
    await callCloudPreferences('ack', { tgId: record.tgId, revision: record.revision });
  } catch { deferred++; }
}
try {
  const records = await callCloudPreferences('pending');
  for (const record of records) {
    try {
      await worker({ action: 'sync', records: [record] });
      await callCloudPreferences('ack', { tgId: record.tgId, revision: record.revision });
      synchronized++;
    } catch { deferred++; }
  }
} catch { deferred++; }
await worker();
let delivered = 0, failed = 0;
const deliveryStarted = Date.now();
for (let batch = 0; batch < 5 && Date.now() - deliveryStarted < 110_000; batch++) {
  // Read each recipient's current language and opt-outs even when their cloud
  // revision was already acknowledged by an older application release.
  const { tgIds } = await worker({ action: 'recipients' });
  const recipients = [];
  for (let offset = 0; offset < tgIds.length; offset += 5) {
    const settled = await Promise.allSettled(tgIds.slice(offset, offset+5).map(tgId => callCloudPreferences('get', { tgId })));
    for (const result of settled) { if (result.status === 'fulfilled') recipients.push(result.value); else deferred++; }
  }
  if (!recipients.length) break;
  await worker({ action: 'sync', records: recipients });
  // Only freshly synchronized recipients are claimed: a cloud outage must not
  // bypass current opt-outs, and one unavailable recipient must not block others.
  const { messages } = await worker({ action: 'claim', tgIds: recipients.map(record => record.tgId) });
  if (!messages.length) break;
  for (const message of messages) {
    let ok = false, errorCode, retryAfter;
    try {
      let body, method;
      if (message.image) {
        method = 'sendPhoto'; body = new FormData(); body.set('chat_id', String(message.chatId));
        body.set('caption', message.text); body.set('parse_mode', 'HTML'); body.set('reply_markup', JSON.stringify(message.keyboard));
        body.set('photo', new Blob([Buffer.from(message.image, 'base64')], { type: 'image/png' }), 'result.png');
      } else { method = 'sendMessage'; body = JSON.stringify({ chat_id: message.chatId, text: message.text, parse_mode: 'HTML', reply_markup: message.keyboard }); }
      const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: typeof body === 'string' ? { 'Content-Type': 'application/json' } : undefined, body, signal: AbortSignal.timeout(10000) });
      const payload = await response.json();
      ok = response.ok && payload.ok === true;
      if (!ok) { errorCode = payload.error_code; retryAfter = payload.parameters?.retry_after; }
    } catch { /* A leased item is retried after backoff; credentials never enter logs. */ }
    await worker({ action: 'ack', id: message.id, attempt: message.attempt, ok, errorCode, retryAfter });
    if (ok) delivered++; else failed++;
  }
}
console.log(JSON.stringify({ preferencesSynchronized: synchronized, delivered, failed, deferred }));
if (failed) process.exitCode = 1;
