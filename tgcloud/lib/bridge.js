import { fetch } from 'sdk';
import { bridgeSecret, bridgeUrl } from './config.js';

export async function syncUser(user, enabled = undefined) {
  if (!bridgeSecret) { console.warn('Jino bridge is not configured'); return false; }
  try {
    const response = await fetch(bridgeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-30-0-Bridge-Secret': bridgeSecret }, body: JSON.stringify({ user, enabled }) });
    if (!response.ok) console.warn('Jino bridge unavailable', response.status);
    return response.ok;
  } catch { console.warn('Jino bridge connection failed'); return false; }
}
