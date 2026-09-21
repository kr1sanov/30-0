import { createPublicKey, verify } from 'node:crypto';

type Key = JsonWebKey & { kid?: string; alg?: string; use?: string };
const ISSUER = 'https://oauth.telegram.org';
let cached: { keys: Key[]; expires: number } | undefined;

async function telegramKeys(): Promise<Key[]> {
  if (cached && cached.expires > Date.now()) return cached.keys;
  const response = await fetch(`${ISSUER}/.well-known/jwks.json`, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  if (!response.ok) throw new Error('Telegram keys unavailable');
  const data = await response.json();
  if (!Array.isArray(data.keys) || data.keys.length > 30) throw new Error('Invalid JWKS');
  cached = { keys: data.keys, expires: Date.now() + 300_000 };
  return cached.keys;
}

/** Strict RS256 verifier. Never trusts a key URL or user object supplied by the browser. */
export function verifyTelegramIdTokenWithKeys(token: string, clientId: string, nonce: string, keys: Key[], now = Math.floor(Date.now()/1000)) {
  try {
    if (token.length > 16384 || !clientId || nonce.length < 32) return null;
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
    const [headerPart, payloadPart, signature] = parts;
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString());
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.crit) return null;
    const candidates = keys.filter(key => key.kid === header.kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256') && (!key.use || key.use === 'sig'));
    if (candidates.length !== 1) return null;
    const key = createPublicKey({ key: candidates[0], format: 'jwk' });
    if (!verify('RSA-SHA256', Buffer.from(`${headerPart}.${payloadPart}`), key, Buffer.from(signature, 'base64url'))) return null;
    const claims = JSON.parse(Buffer.from(payloadPart, 'base64url').toString());
    if (claims.iss !== ISSUER || claims.aud !== clientId || claims.nonce !== nonce) return null;
    if (!Number.isSafeInteger(claims.exp) || claims.exp <= now || !Number.isSafeInteger(claims.iat) || claims.iat > now + 30 || now - claims.iat > 300) return null;
    if (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > now + 30)) return null;
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 256) return null;
    // The profile scope provides the canonical Telegram numeric user ID.
    if (!Number.isSafeInteger(claims.id) || claims.id <= 0) return null;
    return {
      id: String(claims.id),
      firstName: typeof claims.name === 'string' ? claims.name.slice(0, 256) : 'Игрок',
      lastName: undefined,
      username: typeof claims.preferred_username === 'string' ? claims.preferred_username.slice(0, 64) : undefined,
    };
  } catch { return null; }
}

export async function verifyTelegramIdToken(token: string, clientId: string, nonce: string) {
  const parts = token.split('.');
  if (token.length > 16384 || parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  return verifyTelegramIdTokenWithKeys(token, clientId, nonce, await telegramKeys());
}
