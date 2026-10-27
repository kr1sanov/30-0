import { workerSecret } from '@/lib/cloudPreferences';
import { secretsMatch } from '@/lib/secretComparison';
import { purgeExpiredProfiles } from '@/lib/profileDeletion';

export async function POST(request: Request) {
  if (!secretsMatch(workerSecret(), request.headers.get('X-30-0-Worker') || '')) {
    return Response.json({ error: 'Access denied' }, { status: 401 });
  }
  try {
    return Response.json({ deleted: await purgeExpiredProfiles() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Maintenance temporarily unavailable' }, { status: 503 });
  }
}
