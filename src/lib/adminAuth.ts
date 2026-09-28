import { createHmac, timingSafeEqual } from 'node:crypto';
export { hashAdminPassword, verifyAdminPassword } from '@/lib/adminPassword';
import { db } from '@/lib/db';

export const ADMIN_COOKIE = 'rpl_admin_session';
export const ADMIN_USERNAME = 'kr1sanov';
export type AdminRole = 'owner' | 'admin' | 'moderator' | 'viewer';
const allowedRoles = new Set<AdminRole>(['owner', 'admin', 'moderator', 'viewer']);
// The random temporary credential is delivered to the owner separately.
// Only its salted, one-way hash is included in the application.
const INITIAL_HASH = 'c5289ab8523af743d45522ea29cde321:bb73dcdf96f13c441f9ab49c8dc2151df0c06ca85d31f0be00e243f5b08451ba8d8939b440ce81a72b1a08042b5a2c01ae8077012c274619227fab564e82efba';

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Admin session secret is not configured');
  return value;
}

export async function adminCredential() {
  return db.adminCredential.upsert({
    where: { username: ADMIN_USERNAME },
    create: { username: ADMIN_USERNAME, passwordHash: INITIAL_HASH, mustChangePassword: true, role: 'owner' },
    update: {},
  });
}
export function createAdminSession(username: string, version: number, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: username, ver: version, exp: now + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}
function claimsFromRequest(request: Request, now = Date.now()): { sub: string; ver: number } | null {
  try {
    const entry = (request.headers.get('cookie') ?? '').split(';').map(v => v.trim()).find(v => v.startsWith(`${ADMIN_COOKIE}=`));
    if (!entry) return null;
    const [payload, signature, extra] = entry.slice(ADMIN_COOKIE.length + 1).split('.');
    if (!payload || !signature || extra) return null;
    const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
    if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof claims.sub === 'string' && claims.sub.length <= 100 && Number.isInteger(claims.ver) && claims.exp > now ? claims : null;
  } catch { return null; }
}
export async function adminSession(request: Request) {
  const claims = claimsFromRequest(request);
  if (!claims) return null;
  const credential = await db.adminCredential.findUnique({ where: { username: claims.sub } });
  return credential?.sessionVersion === claims.ver ? credential : null;
}
export async function requireAdmin(request: Request) {
  const credential = await adminSession(request);
  return credential && !credential.mustChangePassword && allowedRoles.has(credential.role as AdminRole)
    ? { role: credential.role as AdminRole, username: credential.username } : null;
}

export function canAdminWrite(role: AdminRole, area: 'players' | 'rosters' | 'campaigns' | 'access' | 'reset') {
  if (role === 'owner') return true;
  if (area === 'reset') return false;
  if (area === 'access') return role === 'admin';
  if (area === 'players') return role === 'admin' || role === 'moderator';
  return role === 'admin';
}
