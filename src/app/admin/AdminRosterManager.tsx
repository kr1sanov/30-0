'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ALL_POSITIONS } from '@/lib/positions';

type Season = { id: string; label: string; startYear: number; endYear: number; matchesPerTeam: number; clubs: { id: string; name: string; players: number }[] };
type Club = { id: string; nameRu: string; nameEn: string | null };
type RosterPlayer = { id: string; rating: number; primeRating: number; mainPosition: string; otherPositions: string | null; sourceUrl: string | null; player: { fullName: string; alias: string | null } };
type Summary = { total: number; clubs: number; newClubs: number; newPlayers: number; inserted: number; updated: number };
const panel = 'rounded-2xl border border-white/10 bg-[#151a18] p-5';
const input = 'min-h-10 w-full rounded-lg border border-white/10 bg-[#080e0c] px-3 py-2 text-white outline-none focus:border-emerald-500';
const action = 'rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-[#07110d] hover:bg-emerald-300 disabled:opacity-40';

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, cache: 'no-store', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
  return data as T;
}

export default function AdminRosterManager({ onChanged }: { onChanged: () => void }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [clubSeasonId, setClubSeasonId] = useState('');
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [year, setYear] = useState(2026);
  const [endYear, setEndYear] = useState(2027);
  const [label, setLabel] = useState('2026/27');
  const [matches, setMatches] = useState(30);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Summary | null>(null);
  const [clubChoice, setClubChoice] = useState('__new');
  const [newClub, setNewClub] = useState('');
  const [newClubEn, setNewClubEn] = useState('');
  const [fullName, setFullName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [nationality, setNationality] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [position, setPosition] = useState('ВР');
  const [otherPositions, setOtherPositions] = useState('');
  const [rating, setRating] = useState(70);
  const [primeRating, setPrimeRating] = useState(70);
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async (selected?: string) => {
    const data = await api<{ seasons: Season[]; clubs: Club[] }>('/api/admin/rosters');
    setSeasons(data.seasons); setClubs(data.clubs);
    setSeasonId(current => selected || current || data.seasons[0]?.id || '');
  }, []);
  useEffect(() => { void reload().catch(cause => setError(String(cause))); }, [reload]);
  const selectedSeason = seasons.find(season => season.id === seasonId);
  useEffect(() => {
    setClubSeasonId(current => selectedSeason?.clubs.some(club => club.id === current) ? current : selectedSeason?.clubs[0]?.id || '');
  }, [selectedSeason]);
  useEffect(() => {
    if (!clubSeasonId) { setRoster([]); return; }
    void api<{ players: RosterPlayer[] }>(`/api/club-seasons/${clubSeasonId}/players`).then(data => setRoster(data.players)).catch(cause => setError(String(cause)));
  }, [clubSeasonId]);
  async function execute(fn: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка'); }
    finally { setBusy(false); }
  }
  async function upload(mode: 'preview' | 'commit') {
    if (!file || !seasonId) return;
    await execute(async () => {
      const form = new FormData(); form.set('action', mode); form.set('seasonId', seasonId); form.set('file', file);
      const response = await fetch('/api/admin/rosters/import', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Импорт не удался');
      if (mode === 'preview') setPreview(data.summary);
      else { setNotice(`Импорт завершён: добавлено ${data.summary.inserted}, обновлено ${data.summary.updated}.`); setPreview(null); await reload(seasonId); onChanged(); }
    });
  }
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(270px,1fr)]">
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-sm text-emerald-200">{notice}</p>}
      <section className={panel}><h2 className="text-lg font-semibold">Новый сезон</h2><p className="mt-1 text-sm text-white/55">Создай сезон, затем добавь клубы и игроков вручную или загрузи CSV.</p>
        <form onSubmit={e => { e.preventDefault(); void execute(async () => { const data = await api<{ season: Season }>('/api/admin/rosters', 'POST', { startYear: year, endYear, label, matchesPerTeam: matches }); setPreview(null); await reload(data.season.id); setNotice(`Сезон ${data.season.label} создан. Теперь заполни составы.`); onChanged(); }); }} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Начало<input type="number" min={2000} max={2100} required value={year} onChange={e => setYear(Number(e.target.value))} className={`${input} mt-1`} /></label>
          <label className="text-sm">Конец<input type="number" min={2000} max={2101} required value={endYear} onChange={e => setEndYear(Number(e.target.value))} className={`${input} mt-1`} /></label>
          <label className="text-sm">Название<input required maxLength={100} value={label} onChange={e => setLabel(e.target.value)} className={`${input} mt-1`} placeholder="2026/27" /></label>
          <label className="text-sm">Матчей на команду<input type="number" min={1} max={60} required value={matches} onChange={e => setMatches(Number(e.target.value))} className={`${input} mt-1`} /></label>
          <button disabled={busy} className={`${action} w-fit sm:col-span-2 lg:col-span-4`}>Создать сезон</button>
        </form>
      </section>
      <section className={panel}><h2 className="text-lg font-semibold">Импорт составов</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Сезон для импорта<select value={seasonId} onChange={e => { setSeasonId(e.target.value); setPreview(null); }} className={`${input} mt-1`}>{seasons.map(season => <option key={season.id} value={season.id}>{season.label}</option>)}</select></label><label className="text-sm">CSV-файл<input type="file" accept=".csv,text/csv" onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); }} className={`${input} mt-1 file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-white`} /></label></div>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy || !file || !seasonId} onClick={() => void upload('preview')} className={action}>Проверить файл</button>{preview && <button type="button" disabled={busy} onClick={() => void upload('commit')} className="rounded-lg border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-300">Подтвердить импорт</button>}</div>
        {preview && <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-900/10 p-4 text-sm"><strong>Проверка пройдена</strong><p className="mt-2">Строк: {preview.total} · клубов: {preview.clubs} · новых клубов: {preview.newClubs} · новых игроков: {preview.newPlayers}</p><p>Новых карточек: {preview.inserted} · обновятся: {preview.updated}</p><p className="mt-2 text-white/55">До подтверждения база не меняется. Повторная загрузка обновит существующие карточки того же сезона.</p></div>}
      </section>
      <section className={panel}><h2 className="text-lg font-semibold">Добавить игрока вручную</h2><p className="mt-1 text-sm text-white/55">Сохранение оставит выбранный клуб и сезон, чтобы вводить игроков по очереди.</p>
        <form onSubmit={e => { e.preventDefault(); void execute(async () => {
          const club = clubs.find(item => item.id === clubChoice);
          const player = { clubName: club?.nameRu || newClub.trim(), clubNameEn: club?.nameEn || newClubEn.trim(), fullName: fullName.trim(), lastName: lastName.trim(), firstName: firstName.trim(), nationality: nationality.trim(), birthYear, mainPosition: position, otherPositions: otherPositions.trim(), rating, primeRating, sourceUrl: sourceUrl.trim() };
          await api('/api/admin/rosters/import', 'POST', { action: 'manual', seasonId, player });
          setFullName(''); setLastName(''); setFirstName(''); setBirthYear(''); setOtherPositions(''); setSourceUrl('');
          setNotice(`${player.fullName} добавлен в ${player.clubName} (${selectedSeason?.label}).`);
          await reload(seasonId); onChanged();
        }); }} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Клуб<select value={clubChoice} onChange={e => setClubChoice(e.target.value)} className={`${input} mt-1`}><option value="__new">Новый клуб</option>{clubs.map(club => <option key={club.id} value={club.id}>{club.nameRu}</option>)}</select></label>
          {clubChoice === '__new' ? <><label className="text-sm">Название клуба<input required value={newClub} onChange={e => setNewClub(e.target.value)} className={`${input} mt-1`} /></label><label className="text-sm">Название клуба на английском<input value={newClubEn} onChange={e => setNewClubEn(e.target.value)} className={`${input} mt-1`} /></label></> : <div />}
          <label className="text-sm">Полное имя<input required value={fullName} onChange={e => setFullName(e.target.value)} className={`${input} mt-1`} placeholder="Имя Фамилия" /></label>
          <label className="text-sm">Фамилия или имя на форме<input required value={lastName} onChange={e => setLastName(e.target.value)} className={`${input} mt-1`} placeholder="Фамилия" /></label>
          <label className="text-sm">Имя<input value={firstName} onChange={e => setFirstName(e.target.value)} className={`${input} mt-1`} /></label>
          <label className="text-sm">Страна<input value={nationality} onChange={e => setNationality(e.target.value)} className={`${input} mt-1`} /></label>
          <label className="text-sm">Год рождения<input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)} className={`${input} mt-1`} /></label>
          <label className="text-sm">Основная позиция<select value={position} onChange={e => setPosition(e.target.value)} className={`${input} mt-1`}>{ALL_POSITIONS.map(pos => <option key={pos}>{pos}</option>)}</select></label>
          <label className="text-sm">Другие позиции через |<input value={otherPositions} onChange={e => setOtherPositions(e.target.value)} className={`${input} mt-1`} placeholder="ЛЗ|ЛФЗ" /></label>
          <label className="text-sm">Рейтинг сезона<input type="number" required min={1} max={100} value={rating} onChange={e => { setRating(Number(e.target.value)); setPrimeRating(Math.max(primeRating, Number(e.target.value))); }} className={`${input} mt-1`} /></label>
          <label className="text-sm">Рейтинг прайм<input type="number" min={1} max={100} value={primeRating} onChange={e => setPrimeRating(Number(e.target.value))} className={`${input} mt-1`} /></label>
          <label className="text-sm sm:col-span-2">Ссылка на источник данных<input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={`${input} mt-1`} placeholder="https://…" /></label>
          <button disabled={busy || !seasonId} className={`${action} w-fit sm:col-span-2`}>Сохранить игрока</button>
        </form>
      </section>
      <section className={panel}><h2 className="text-lg font-semibold">Игроки сезона</h2><div className="mt-4 flex flex-wrap gap-2"><select aria-label="Сезон" className={`${input} w-auto`} value={seasonId} onChange={e => { setSeasonId(e.target.value); setPreview(null); }}>{seasons.map(season => <option key={season.id} value={season.id}>{season.label}</option>)}</select><select aria-label="Клуб" className={`${input} w-auto`} value={clubSeasonId} onChange={e => setClubSeasonId(e.target.value)}>{selectedSeason?.clubs.map(club => <option key={club.id} value={club.id}>{club.name} · {club.players}</option>)}</select></div>
        <div className="mt-4 max-h-[650px] space-y-2 overflow-auto">{roster.map(row => <RosterEditor key={row.id} row={row} busy={busy} onSave={(rating, primeRating, mainPosition) => void execute(async () => { await api('/api/admin/rosters', 'PATCH', { id: row.id, rating, primeRating, mainPosition, otherPositions: row.otherPositions || '' }); setNotice(`Обновлён ${row.player.fullName}`); setRoster((await api<{ players: RosterPlayer[] }>(`/api/club-seasons/${clubSeasonId}/players`)).players); })} />)}{!roster.length && <p className="text-sm text-white/50">В этом клубе пока нет игроков.</p>}</div>
      </section>
    </div>
    <aside className={`${panel} h-fit xl:sticky xl:top-5`}><h2 className="text-lg font-semibold">Правила заполнения</h2><a href="/examples/roster-import-example.csv" download="roster-import-example.csv" className="mt-4 inline-flex rounded-lg border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/10">↓ Скачать заполненный CSV-образец</a><p className="mt-2 text-xs text-white/50">Образец: подтверждённые строки FIFA 10 за 2009 год. Для нового сезона замени их актуальными проверенными данными.</p>
      <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm text-white/75"><li>Выбери сезон перед импортом. Один файл может содержать несколько клубов.</li><li>Сохрани CSV в UTF‑8. Не переименовывай столбцы образца. Поля с запятой заключай в двойные кавычки.</li><li>Обязательны клуб, полное имя, фамилия, основная позиция и рейтинг от 1 до 100.</li><li>Дополнительные позиции указывай через вертикальную черту: <code>ЛЗ|ЛФЗ</code>. Прайм не может быть ниже рейтинга сезона.</li><li>Добавляй ссылку на источник рейтинга. Если имя совпадает с несколькими игроками, укажи существующий <code>playerId</code> в файле.</li><li>Сначала проверь файл, потом подтверди импорт. При ошибке ни одна строка не сохранится; повторный импорт обновит те же карточки.</li></ol>
      <p className="mt-5 text-xs text-white/55">Позиции: {ALL_POSITIONS.join(', ')}. Новый сезон появится в рулетке после заполнения составов. Для симуляции требуется не менее 16 клубов с игроками.</p>
    </aside>
  </div>;
}

function RosterEditor({ row, busy, onSave }: { row: RosterPlayer; busy: boolean; onSave: (rating: number, primeRating: number, mainPosition: string) => void }) {
  const [rating, setRating] = useState(row.rating);
  const [primeRating, setPrimeRating] = useState(row.primeRating);
  const [position, setPosition] = useState(row.mainPosition);
  useEffect(() => { setRating(row.rating); setPrimeRating(row.primeRating); setPosition(row.mainPosition); }, [row.rating, row.primeRating, row.mainPosition]);
  return <div className="grid items-center gap-2 rounded-lg bg-white/5 p-3 text-sm md:grid-cols-[minmax(170px,1fr)_70px_70px_85px_auto]"><span>{row.player.alias || row.player.fullName}</span><input aria-label={`Рейтинг ${row.player.fullName}`} className={input} type="number" min={1} max={100} value={rating} onChange={e => setRating(Number(e.target.value))} /><input aria-label={`Прайм ${row.player.fullName}`} className={input} type="number" min={1} max={100} value={primeRating} onChange={e => setPrimeRating(Number(e.target.value))} /><select aria-label={`Позиция ${row.player.fullName}`} className={input} value={position} onChange={e => setPosition(e.target.value)}>{ALL_POSITIONS.map(pos => <option key={pos}>{pos}</option>)}</select><button className={action} disabled={busy || primeRating < rating} onClick={() => onSave(rating, primeRating, position)}>Сохранить</button></div>;
}
