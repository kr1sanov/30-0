'use client';

import { useEffect, useState } from 'react';

type Club = { id: string; nameRu: string; nameEn?: string | null; seasonCount: number; playerCount: number; periods: string; oneClubHidden: boolean };

export default function AdminOneClub() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/admin/one-club', { cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('Не удалось загрузить клубы'); return response.json(); })
      .then(data => setClubs(data.clubs))
      .catch(cause => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(club: Club) {
    setBusyId(club.id);
    setError('');
    try {
      const response = await fetch('/api/admin/one-club', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: club.id, hidden: !club.oneClubHidden }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Не удалось сохранить');
      setClubs(rows => rows.map(row => row.id === club.id ? { ...row, oneClubHidden: data.club.oneClubHidden } : row));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка'); }
    finally { setBusyId(null); }
  }

  return <section className="rounded-2xl border border-white/10 bg-[#151a18] p-5">
    <h2 className="text-lg font-semibold">Клубы режима «Один клуб»</h2>
    <p className="mt-1 text-sm text-white/60">Здесь клубы с 8 и более сезонами и составом для драфта. Скрытый клуб исчезает из выбора для новых игр. Уже начатые игры продолжаются.</p>
    <p className="mt-3 text-sm text-emerald-300">Показано: {clubs.filter(club => !club.oneClubHidden).length} из {clubs.length}</p>
    {loading && <p className="mt-4 text-sm text-white/60">Загружаем клубы…</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    <div className="mt-4 grid gap-2 md:grid-cols-2">
      {clubs.map(club => <div key={club.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="min-w-0"><strong className="block truncate">{club.nameRu}</strong><span className="text-xs text-white/50">{club.seasonCount} сезонов · {club.periods} · {club.playerCount} игроков</span></div>
        <button type="button" disabled={busyId !== null} onClick={() => void toggle(club)} aria-label={`${club.oneClubHidden ? 'Показать' : 'Скрыть'} ${club.nameRu}`} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${club.oneClubHidden ? 'border-emerald-400/50 text-emerald-300' : 'border-white/20 text-white/70'}`}>{busyId === club.id ? 'Сохраняем…' : club.oneClubHidden ? 'Показать' : 'Скрыть'}</button>
      </div>)}
    </div>
  </section>;
}
