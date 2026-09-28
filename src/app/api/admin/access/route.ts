import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ADMIN_USERNAME, canAdminWrite, hashAdminPassword, requireAdmin, type AdminRole } from '@/lib/adminAuth';
import { sameOrigin } from '@/lib/telegramSession';

export const runtime = 'nodejs';
const roles: AdminRole[] = ['admin', 'moderator', 'viewer'];

export async function GET(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  if (!canAdminWrite(actor.role, 'access')) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  const accounts = await db.adminCredential.findMany({ select: { username: true, role: true, mustChangePassword: true, updatedAt: true }, orderBy: { username: 'asc' } });
  return NextResponse.json({ accounts }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  if (!canAdminWrite(actor.role, 'access') || !sameOrigin(request)) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const role = body.role as AdminRole;
  if (!/^[a-z0-9_.-]{3,50}$/.test(username) || username === ADMIN_USERNAME || !roles.includes(role) || (role === 'admin' && actor.role !== 'owner')) {
    return NextResponse.json({ error: 'Недопустимый логин или роль' }, { status: 400 });
  }
  const password = randomBytes(24).toString('base64url');
  try {
    await db.adminCredential.create({ data: { username, role, passwordHash: hashAdminPassword(password), mustChangePassword: true } });
    return NextResponse.json({ username, role, temporaryPassword: password }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin account create:', error);
    return NextResponse.json({ error: 'Логин уже занят' }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  if (!canAdminWrite(actor.role, 'access') || !sameOrigin(request)) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === 'string' ? body.username : '';
  const role = body.role as AdminRole;
  const target = await db.adminCredential.findUnique({ where: { username } });
  if (!target || target.username === ADMIN_USERNAME || target.username === actor.username || !roles.includes(role) || (actor.role !== 'owner' && (target.role === 'admin' || role === 'admin'))) {
    return NextResponse.json({ error: 'Недопустимое изменение прав' }, { status: 403 });
  }
  await db.adminCredential.update({ where: { username }, data: { role, sessionVersion: { increment: 1 } } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  if (!canAdminWrite(actor.role, 'access') || !sameOrigin(request)) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === 'string' ? body.username : '';
  const target = await db.adminCredential.findUnique({ where: { username } });
  if (!target || target.username === ADMIN_USERNAME || target.username === actor.username || (target.role === 'admin' && actor.role !== 'owner')) {
    return NextResponse.json({ error: 'Недопустимое удаление' }, { status: 403 });
  }
  await db.adminCredential.delete({ where: { username } });
  return NextResponse.json({ ok: true });
}
