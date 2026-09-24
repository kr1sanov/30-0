import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
export async function GET(request: Request) { if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 }); return NextResponse.json({ campaigns: await db.notificationCampaign.findMany({ orderBy: { updatedAt: 'desc' } }) }); }
export async function POST(request: Request) {
  const admin = await requireAdmin(request); if (!admin) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  try {
    const b = await request.json(); const title = String(b.title ?? '').trim(); const message = String(b.message ?? '').trim(); const cadence = String(b.cadence ?? 'weekly');
    if (title.length < 2 || title.length > 120 || message.length < 2 || message.length > 3500 || !['daily','weekly','monthly','return'].includes(cadence)) return NextResponse.json({ error: 'Проверьте название, текст и период рассылки' }, { status: 400 });
    const campaign = b.id ? await db.notificationCampaign.update({ where: { id: String(b.id) }, data: { title, message, cadence, enabled: Boolean(b.enabled) } }) : await db.notificationCampaign.create({ data: { title, message, cadence, enabled: Boolean(b.enabled) } });
    return NextResponse.json({ campaign });
  } catch { return NextResponse.json({ error: 'Не удалось сохранить рассылку' }, { status: 500 }); }
}
export async function DELETE(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: 'Нет доступа' }, { status: 401 });
  try { const { id } = await request.json(); await db.notificationCampaign.delete({ where: { id: String(id) } }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: 'Не удалось удалить рассылку' }, { status: 500 }); }
}
