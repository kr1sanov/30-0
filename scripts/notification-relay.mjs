import { createWorkerClient } from './notification-worker-client.mjs';
import { createHash } from 'node:crypto';
import { callCloudPreferences } from './telegram-cloud-client.mjs';
const secret = process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET || process.env.BRIDGE_SECRET || createHash('sha256').update('30-0 bridge:'+process.env.TGCLOUD_TOKEN).digest('hex');
if (!process.env.TGCLOUD_TOKEN) throw new Error('Notification relay credentials unavailable');
const worker=createWorkerClient({secret});

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
let delivered = 0, skipped = 0, failed = 0;
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
    let result = {ok:false};
    try { result = await callCloudPreferences('deliver', {message}); }
    catch { /* Keep the durable lease; the next relay retries without logging credentials. */ }
    await worker({ action:'ack', id:message.id, attempt:message.attempt, ...result });
    const ok = result.ok === true;
    if (ok) { if(result.skipped) skipped++; else delivered++; } else failed++;
  }
}
console.log(JSON.stringify({ preferencesSynchronized: synchronized, delivered, skipped, failed, deferred }));
if (failed || deferred) process.exitCode = 1;
