import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'rpl_telegram_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.TELEGRAM_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('TELEGRAM_SESSION_SECRET must contain at least 32 characters');
  return value;
}

export function createSession(userId: string, now = Math.floor(Date.now() / 1000)): string {
  const body = Buffer.from(JSON.stringify({ sub: userId, exp: now + SESSION_SECONDS })).toString('base64url');
  return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`;
}

export function sessionUser(request: Request, now = Math.floor(Date.now() / 1000)): string | null {
  try {
    const parts = (request.headers.get('cookie') ?? '').split(';').map(part => part.trim());
    const values = parts.filter(part => part.startsWith(`${SESSION_COOKIE}=`));
    if (values.length !== 1) return null;
    const token = values[0].slice(SESSION_COOKIE.length + 1);
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra || token.length > 4096) return null;
    const expected = createHmac('sha256', secret()).update(body).digest('base64url');
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof claims.sub !== 'string' || !claims.sub || !Number.isSafeInteger(claims.exp) || claims.exp <= now) return null;
    return claims.sub;
  } catch { return null; }
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin) return true;
  try {
    const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    return Boolean(publicBaseUrl && origin === new URL(publicBaseUrl).origin);
  } catch {
    return false;
  }
}
