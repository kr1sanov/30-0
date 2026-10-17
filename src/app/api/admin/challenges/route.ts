import { db } from '@/lib/db';
import { canAdminWrite, requireAdmin } from '@/lib/adminAuth';
import { sameOrigin } from '@/lib/telegramSession';
import { challengeCatalog } from '@/lib/challengeCatalog';
export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: 'Access denied' }, { status: 401 });
  return Response.json({ issues: await challengeCatalog() }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin || !canAdminWrite(admin.role, 'rosters') || !sameOrigin(request)) return Response.json({ error: 'Access denied' }, { status: 403 });
  const { id, visibility } = await request.json();
  if (!['auto','open','hidden','archived'].includes(visibility) || !(await challengeCatalog()).some(issue => issue.id === id)) return Response.json({ error: 'Invalid issue' }, { status: 400 });
  const key = `challenge-visibility:${id}`;
  await db.appSetting.upsert({ where: { key }, create: { key, value: visibility }, update: { value: visibility } });
  return Response.json({ ok: true });
}
