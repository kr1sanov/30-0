import { createHash } from 'node:crypto';
import { callCloudPreferences } from './telegram-cloud-client.mjs';
const secret = process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET || process.env.BRIDGE_SECRET || createHash('sha256').update('30-0 bridge:'+process.env.TGCLOUD_TOKEN).digest('hex');
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || !process.env.TGCLOUD_TOKEN) throw new Error('Notification relay credentials unavailable');
async function worker(body = {}) {
  const response = await fetch('https://30-0.xn--p1ai/api/telegram/worker', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-30-0-Worker': secret }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error('Notification relay HTTP '+response.status);
  return response.json();
}
const { patches } = await worker({ action: 'patches' });
for (const patch of patches) {
  const record = await callCloudPreferences('set', { tgId: patch.tgId, patch: patch.patch });
  await worker({ action: 'sync', records: [{ ...record, patchVersion: patch.version }] });
  await callCloudPreferences('ack', { tgId: record.tgId, revision: record.revision });
}
const records = await callCloudPreferences('pending');
await worker({ action: 'sync', records });
await callCloudPreferences('ackMany', { items: records.map(({ tgId, revision }) => ({ tgId, revision })) });
await worker();
let delivered = 0, failed = 0;
for (let batch = 0; batch < 5; batch++) {
  // Read each recipient's current language and opt-outs even when their cloud
  // revision was already acknowledged by an older application release.
  const { tgIds } = await worker({ action: 'recipients' });
  const recipients = [];
  for (let offset = 0; offset < tgIds.length; offset += 5) recipients.push(...await Promise.all(tgIds.slice(offset, offset+5).map(tgId => callCloudPreferences('get', { tgId }))));
  await worker({ action: 'sync', records: recipients });
  const { messages } = await worker({ action: 'claim' });
  if (!messages.length) break;
  for (const message of messages) {
    let ok = false;
    try {
      let body, method;
      if (message.image) {
        method = 'sendPhoto'; body = new FormData(); body.set('chat_id', String(message.chatId));
        body.set('caption', message.text); body.set('parse_mode', 'HTML'); body.set('reply_markup', JSON.stringify(message.keyboard));
        body.set('photo', new Blob([Buffer.from(message.image, 'base64')], { type: 'image/png' }), 'result.png');
      } else { method = 'sendMessage'; body = JSON.stringify({ chat_id: message.chatId, text: message.text, parse_mode: 'HTML', reply_markup: message.keyboard }); }
      const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: typeof body === 'string' ? { 'Content-Type': 'application/json' } : undefined, body, signal: AbortSignal.timeout(10000) });
      ok = response.ok && (await response.json()).ok === true;
    } catch { /* A leased item is retried after backoff; credentials never enter logs. */ }
    await worker({ action: 'ack', id: message.id, attempt: message.attempt, ok });
    if (ok) delivered++; else failed++;
  }
}
console.log(JSON.stringify({ preferencesSynchronized: records.length, delivered, failed }));
if (failed) process.exitCode = 1;
