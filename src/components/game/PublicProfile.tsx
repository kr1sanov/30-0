'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FootballAvatar from './FootballAvatar';
import { toast } from 'sonner';

type Player = { id: string; displayName: string; username: string | null; avatar: string; style: string; createdAt: string; seasons: number; titles: number; bestPoints: number; modes: Record<string, number>; following: boolean; own: boolean };
export default function PublicProfile({ id }: { id: string }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetch(`/api/social/players/${encodeURIComponent(id)}`).then(async r => { if (!r.ok) throw new Error('Игрок не найден'); return r.json(); }).then(setPlayer).catch(e => setError(e.message)); }, [id]);
  const toggleFriend = async () => {
    if (!player) return;
    const r = await fetch('/api/social/friends', { method: player.following ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!r.ok) { toast.error(r.status === 401 ? 'Войди в профиль, чтобы добавить друга' : 'Не удалось сохранить'); return; }
    setPlayer({ ...player, following: !player.following });
  };
  return <div className="min-h-screen bg-[#080b10] text-white"><Header/><main className="mx-auto max-w-3xl space-y-5 px-4 py-10">
    <Link href="/" className="text-sm text-[#00C896]">← На главную</Link>
    {error && <p role="alert">{error}</p>}{!player && !error && <p>Загружаем профиль…</p>}
    {player && <div className={`rounded-3xl border p-6 text-center ${player.style === 'gold' ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/70 to-[#111]' : player.style === 'night' ? 'border-indigo-400/40 bg-gradient-to-br from-indigo-950 to-[#111]' : player.style === 'pitch' ? 'border-emerald-400/40 bg-gradient-to-br from-emerald-950 to-[#111]' : 'border-white/10 bg-[#141414]'}`}>
      <div className="flex justify-center"><FootballAvatar avatar={player.avatar} size={100}/></div><h1 className="mt-3 text-2xl font-black">{player.displayName}</h1>
      {player.username && <p className="text-sm text-slate-400">@{player.username}</p>}
      <p className="mt-2 text-xs text-slate-500">В игре с {new Date(player.createdAt).toLocaleDateString('ru-RU')}</p>
      <div className="mt-5 grid grid-cols-3 gap-2">{[[player.seasons, 'Сезонов'], [player.titles, 'Титулов'], [player.bestPoints, 'Лучший результат']].map(([value, label]) => <div key={label} className="rounded-xl bg-black/30 p-3"><strong className="block text-xl text-[#00C896]">{value}</strong><span className="text-xs text-slate-400">{label}</span></div>)}</div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">{!player.own && <button onClick={() => void toggleFriend()} className="rounded-xl bg-[#00C896] px-4 py-2 font-bold text-black">{player.following ? '✓ В друзьях · Удалить' : '+ Добавить в друзья'}</button>}<button onClick={() => { void navigator.clipboard.writeText(location.href).then(() => toast.success('Ссылка на профиль скопирована')); }} className="rounded-xl border border-white/20 px-4 py-2">Поделиться профилем</button><Link href="/multiplayer" className="rounded-xl border border-[#00C896]/50 px-4 py-2">Пригласить в мультиплеер</Link></div>
    </div>}
    {player && <div className="rounded-2xl border border-white/10 bg-[#141414] p-5"><h2 className="font-bold">Режимы</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['classic','Обычный драфт'],['single_club','Один клуб'],['challenges','Челленджи'],['multiplayer','Мультиплеер']].map(([key,label]) => <div key={key} className="rounded-lg bg-black/30 p-3 text-sm"><strong className="block text-[#00C896]">{player.modes[key] || 0}</strong>{label}</div>)}</div></div>}
  </main><Footer/></div>;
}
