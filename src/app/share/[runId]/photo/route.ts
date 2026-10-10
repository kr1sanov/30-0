import { sharedSeason } from '@/lib/sharedSeason';
import { storyImage } from '../story-image';
import sharp from 'sharp';

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await sharedSeason(runId);
  if (!run) return new Response('Not found', { status: 404 });
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'ru';
  const image = await storyImage(run, lang);
  const jpeg = await sharp(Buffer.from(await image.arrayBuffer())).jpeg({ quality: 86 }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg',
    'Content-Disposition': 'attachment; filename="30-0-story-1080x1920.jpg"',
    'Access-Control-Allow-Origin': 'https://web.telegram.org',
    'Cache-Control': 'public, max-age=3600' } });
}
