import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { ADMIN_OWNER_TELEGRAM_ID } from '@/lib/adminTelegramIdentity';

export const ADMIN_COOKIE = 'rpl_admin_session';
function secret() {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.TELEGRAM_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Admin session secret is not configured');
  return value;
}
export function hashAdminCode(code: string) {
  return createHmac('sha256', secret()).update(`admin-otp:${code}`).digest('hex');
}
export function createAdminSession(telegramId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: telegramId, exp: now + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}
export function adminIdFromRequest(request: Request, now = Date.now()): string | null {
  try {
    const cookies = (request.headers.get('cookie') ?? '').split(';').map(v => v.trim());
    const entry = cookies.find(v => v.startsWith(`${ADMIN_COOKIE}=`));
    if (!entry) return null;
    const [payload, signature, extra] = entry.slice(ADMIN_COOKIE.length + 1).split('.');
    if (!payload || !signature || extra) return null;
    const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
    if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof claims.sub === 'string' && claims.exp > now ? claims.sub : null;
  } catch { return null; }
}
export async function isTrustedAdmin(id: string) {
  if (id === ADMIN_OWNER_TELEGRAM_ID) {
    await db.adminAccess.upsert({ where: { telegramId: id }, create: { telegramId: id, role: 'owner', status: 'active' }, update: { role: 'owner', status: 'active' } });
  }
  const row = await db.adminAccess.findUnique({ where: { telegramId: id } });
  return row?.status === 'active' ? row : null;
}
export async function requireAdmin(request: Request) {
  const id = adminIdFromRequest(request);
  if (!id) return null;
  return isTrustedAdmin(id);
}
