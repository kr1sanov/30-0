import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { sendTelegramMessage } from '@/lib/telegramBot';
export async function GET(request: Request) {
 const admin = await requireAdmin(request); if (!admin || admin.role !== 'owner') return NextResponse.json({ error: 'Только владелец может управлять администраторами' }, { status: 403 });
 return NextResponse.json({ admins: await db.adminAccess.findMany({ orderBy: { createdAt: 'asc' } }) });
}
export async function POST(request: Request) {
 const admin = await requireAdmin(request); if (!admin || admin.role !== 'owner') return NextResponse.json({ error: 'Только владелец может добавлять администраторов' }, { status: 403 });
 try {
  const { telegramId } = await request.json(); const id = String(telegramId ?? '').trim();
  if (!/^\d{5,16}$/.test(id) || id === admin.telegramId) return NextResponse.json({ error: 'Укажите другой числовой Telegram ID' }, { status: 400 });
  const access = await db.adminAccess.upsert({ where: { telegramId: id }, create: { telegramId: id, status: 'pending', addedBy: admin.telegramId }, update: { status: 'pending', addedBy: admin.telegramId } });
  const sent = await sendTelegramMessage(id, 'Вас пригласили в админ-панель 30-0. Подтвердите свой Telegram аккаунт, чтобы активировать доступ.', { inline_keyboard: [[{ text: 'Подтвердить доступ', callback_data: `admin-accept:${id}` }]] });
  if (!sent) { await db.adminAccess.delete({ where: { id: access.id } }); return NextResponse.json({ error: 'Пользователь должен сначала открыть бота и нажать /start' }, { status: 409 }); }
  return NextResponse.json({ ok: true, access });
 } catch { return NextResponse.json({ error: 'Не удалось добавить администратора' }, { status: 500 }); }
}
export async function DELETE(request: Request) {
 const admin = await requireAdmin(request); if (!admin || admin.role !== 'owner') return NextResponse.json({ error: 'Только владелец может отзывать доступ' }, { status: 403 });
 try { const { telegramId } = await request.json(); if (String(telegramId) === admin.telegramId) return NextResponse.json({ error: 'Нельзя удалить доступ владельца' }, { status: 400 }); await db.adminAccess.delete({ where: { telegramId: String(telegramId) } }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: 'Не удалось отозвать доступ' }, { status: 500 }); }
}
