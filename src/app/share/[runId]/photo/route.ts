import { sharedSeason } from '@/lib/sharedSeason';
import sharp from 'sharp';
import makeImage from '../opengraph-image';

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  if (!await sharedSeason(runId)) return new Response('Not found', { status: 404 });
  const image = await makeImage({ params: Promise.resolve({ runId }) });
  const jpeg = await sharp(Buffer.from(await image.arrayBuffer())).jpeg({ quality: 88 }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' } });
}
