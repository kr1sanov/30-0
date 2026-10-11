import PublicProfile from '@/components/game/PublicProfile';
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicProfile id={id} />;
}
