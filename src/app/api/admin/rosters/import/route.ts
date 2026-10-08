import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canAdminWrite, requireAdmin } from '@/lib/adminAuth';
import { sameOrigin } from '@/lib/telegramSession';
import { enforceRateLimit } from '@/lib/rateLimit';
import { parseRosterCsv, ROSTER_COLUMNS, RosterImportError } from '@/lib/rosterImport';
import { saveRosterRows } from '@/lib/rosterCatalog';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin || !canAdminWrite(admin.role, 'rosters')) return NextResponse.json({ error: 'Нет прав на изменение составов' }, { status: 403 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник' }, { status: 403 });
  const limited = enforceRateLimit(request, 'admin:roster-import', { limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const contentType = request.headers.get('content-type') || '';
    let seasonId = ''; let action = ''; let csv = '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      seasonId = String(form.get('seasonId') ?? '');
      action = String(form.get('action') ?? '');
      const file = form.get('file');
      if (!(file instanceof File) || file.size > 1024 * 1024 || !file.name.toLowerCase().endsWith('.csv')) {
        throw new RosterImportError('Выбери CSV-файл размером до 1 МБ');
      }
      csv = await file.text();
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      seasonId = String(body.seasonId ?? '');
      action = String(body.action ?? '');
      if (action !== 'manual' || !body.player || typeof body.player !== 'object') throw new RosterImportError('Неверный формат игрока');
      const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      csv = `${ROSTER_COLUMNS.join(',')}\n${ROSTER_COLUMNS.map(column => escape(body.player[column])).join(',')}`;
    } else throw new RosterImportError('Загрузи CSV-файл');
    if (!seasonId || !['preview', 'commit', 'manual'].includes(action)) throw new RosterImportError('Выбери сезон и действие');
    const rows = parseRosterCsv(csv);
    const summary = await db.$transaction(tx => saveRosterRows(tx, seasonId, rows, action !== 'preview'), { timeout: 120_000 });
    return NextResponse.json({ ok: true, preview: action === 'preview', summary }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof RosterImportError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin roster import:', error);
    return NextResponse.json({ error: 'Не удалось импортировать состав. Изменения отменены.' }, { status: 500 });
  }
}
