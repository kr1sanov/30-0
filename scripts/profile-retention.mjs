import { createHash } from 'node:crypto';
import { createWorkerClient } from './notification-worker-client.mjs';

const secret = process.env.TELEGRAM_SERVERLESS_BRIDGE_SECRET ||
  (process.env.TGCLOUD_TOKEN ? createHash('sha256').update('30-0 bridge:' + process.env.TGCLOUD_TOKEN).digest('hex') : '');
if (!secret) throw new Error('Profile retention credentials unavailable');
const worker = createWorkerClient({ secret, url: 'https://30-0.xn--p1ai/api/maintenance/profiles' });
// Bound each scheduled invocation; a backlog continues on the next run.
let total = 0;
for (let batch = 0; batch < 10; batch++) {
  const { deleted } = await worker();
  total += deleted;
  if (deleted < 50) break;
}
console.log('Expired profiles removed:', total);
