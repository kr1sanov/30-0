import { createHash, createHmac, createPublicKey, verify, timingSafeEqual } from 'node:crypto';

export interface TelegramIdentity {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
}

// Production key published at https://core.telegram.org/bots/webapps#validating-data-for-third-party-use
const TELEGRAM_PUBLIC_KEY = 'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d';

/** Verify Mini App identity with Telegram's public Ed25519 key; no bot token. */
export function verifyMiniAppPublic(input: string, botId: string, now = Math.floor(Date.now() / 1000)): TelegramIdentity | null {
  if (!/^[1-9][0-9]+$/.test(botId) || input.length > 16384) return null;
  try {
    const params = new URLSearchParams(input);
    const keys = [...params.keys()];
    if (new Set(keys).size !== keys.length || !fresh(params.get('auth_date'), now)) return null;
    const signature = params.get('signature') ?? '';
    if (!/^[A-Za-z0-9_-]{86}(==)?$/.test(signature)) return null;
    params.delete('hash');
    params.delete('signature');
    const fields = [...params.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, value]) => `${key}=${value}`).join('\n');
    const publicKey = createPublicKey({ key: Buffer.from('302a300506032b6570032100' + TELEGRAM_PUBLIC_KEY, 'hex'), format: 'der', type: 'spki' });
    if (!verify(null, Buffer.from(`${botId}:WebAppData\n${fields}`), publicKey, Buffer.from(signature, 'base64url'))) return null;
    return identity(JSON.parse(params.get('user') ?? '{}'));
  } catch { return null; }
}

function equalHex(expected: string, supplied: string): boolean {
  return /^[a-f0-9]{64}$/i.test(supplied) &&
    timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'));
}

function fresh(value: unknown, now: number): boolean {
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp > 0 && timestamp <= now + 30 && now - timestamp <= 300;
}

function identity(user: Record<string, unknown>): TelegramIdentity | null {
  const id = String(user.id ?? '');
  if (!/^[1-9][0-9]{0,15}$/.test(id) || !Number.isSafeInteger(Number(id))) return null;
  if (typeof user.first_name !== 'string' || user.first_name.length > 256) return null;
  return {
    id, firstName: user.first_name,
    lastName: typeof user.last_name === 'string' ? user.last_name.slice(0, 256) : undefined,
    username: typeof user.username === 'string' ? user.username.slice(0, 64) : undefined,
  };
}

/** Verify the original Mini App initData, never initDataUnsafe. */
export function verifyMiniApp(input: string, botToken: string, now = Math.floor(Date.now() / 1000)): TelegramIdentity | null {
  if (!botToken || input.length > 16384) return null;
  try {
    const params = new URLSearchParams(input);
    const keys = [...params.keys()];
    if (new Set(keys).size !== keys.length || !fresh(params.get('auth_date'), now)) return null;
    const hash = params.get('hash') ?? '';
    params.delete('hash');
    const check = [...params.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, value]) => `${key}=${value}`).join('\n');
    const key = createHmac('sha256', 'WebAppData').update(botToken).digest();
    if (!equalHex(createHmac('sha256', key).update(check).digest('hex'), hash)) return null;
    return identity(JSON.parse(params.get('user') ?? '{}'));
  } catch { return null; }
}

/** Legacy Telegram Login Widget uses a different key derivation. */
export function verifyLoginWidget(input: Record<string, unknown>, botToken: string, now = Math.floor(Date.now() / 1000)): TelegramIdentity | null {
  if (!botToken || !fresh(input.auth_date, now) || typeof input.hash !== 'string') return null;
  const fields = Object.entries(input).filter(([key]) => key !== 'hash');
  if (fields.some(([, value]) => typeof value !== 'string' && typeof value !== 'number')) return null;
  const check = fields.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => `${key}=${value}`).join('\n');
  const key = createHash('sha256').update(botToken).digest();
  if (!equalHex(createHmac('sha256', key).update(check).digest('hex'), input.hash)) return null;
  return identity(input);
}
