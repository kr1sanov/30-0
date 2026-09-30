import type { Metadata } from 'next';
import Link from 'next/link';
import { sharedSeason, seasonCaption } from '@/lib/sharedSeason';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ runId: string }>; searchParams: Promise<{ ref?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { runId } = await params;
  const run = await sharedSeason(runId);
  if (!run) return { title: 'Результат не найден' };
  return { metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://30-0.рф'), title: `Сезон в 30-0 · ${run.points ?? 0} очков`, description: seasonCaption(run), openGraph: { title: 'Мой сезон в 30-0', description: seasonCaption(run), type: 'article', images: [{ url: `/share/${runId}/opengraph-image`, width: 1200, height: 630 }] } };
}

export default async function SharedSeason({ params, searchParams }: Props) {
  const [{ runId }, { ref }] = await Promise.all([params, searchParams]);
  const run = await sharedSeason(runId);
  if (!run) notFound();
  const invite = ref && /^rpl[a-f0-9]{12}$/.test(ref) ? `/?ref=${ref}` : '/';
  return <main className="mx-auto max-w-lg px-5 py-16 text-center text-white">
    <h1 className="text-3xl font-black">Мой сезон в 30-0</h1>
    <p className="mt-5 text-lg">{seasonCaption(run)}</p>
    <img className="mt-6 w-full rounded-2xl" src={`/share/${runId}/opengraph-image`} alt={`Результат сезона: ${seasonCaption(run)}`} />
    <Link href={invite} className="mt-8 inline-flex rounded-xl bg-[#00C896] px-6 py-3 font-bold text-black">Собрать свою команду</Link>
    <p className="mt-4"><a href="https://t.me/RPL30_bot?startapp" className="text-[#00C896]">Открыть в Telegram</a></p>
  </main>;
}
