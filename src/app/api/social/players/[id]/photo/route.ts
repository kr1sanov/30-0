import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
const missing = () => new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=120' } });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 100) return missing();
  const user = await db.user.findUnique({ where: { id }, select: { provider: true, providerId: true, photoUrl: true } });
  if (user?.provider !== 'telegram') return missing();

  if (user.photoUrl) { try { const url=new URL(user.photoUrl); if(url.protocol==='https:' && (url.hostname==='t.me'||url.hostname==='telegram.org'||url.hostname.endsWith('.telegram.org')||url.hostname.endsWith('.telesco.pe')))return NextResponse.redirect(url,{headers:{'Cache-Control':'public, max-age=300'}}); }catch{} }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const telegramId = user.providerId.match(/^telegram_([1-9]\d{0,15})$/)?.[1];
  if (token && telegramId) {
    try {
      const photosResponse = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${telegramId}&limit=1`, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
      if (photosResponse.ok) {
        const photos = await photosResponse.json();
        const sizes = photos?.result?.photos?.[0];
        const fileId = Array.isArray(sizes) ? sizes[sizes.length - 1]?.file_id : null;
        if (typeof fileId === 'string') {
          const fileResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
          const file = fileResponse.ok ? await fileResponse.json() : null;
          const path = file?.result?.file_path;
          if (typeof path === 'string' && /^[\w/.-]+$/.test(path)) {
            const imageResponse = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
            if (imageResponse.ok && imageResponse.body && (Number(imageResponse.headers.get('content-length')) || 0) < 2_000_000) {
              const bytes=new Uint8Array(await imageResponse.arrayBuffer());
              if(bytes.length>2_000_000)return missing();
              return new NextResponse(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300, s-maxage=300' } });
            }
          }
        }
      }
    } catch { /* Telegram may not expose a photo to this bot. */ }
  }
  return missing();
}
