'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AdminMode, AdminPeriod } from '@/lib/adminInsights';

type Section = 'overview' | 'users' | 'games';
type Person = { id: string; displayName: string; username: string | null; providerId?: string; lastActiveAt?: string | null };
type Insight = {
  range: { label: string; timezone: string }; metrics: Record<string, number | null>;
  modes: { id: string; count: number; completed: number }[];
  chart: { date: string; runs: number }[];
  leaders: { id: string; users: { user: Person; runs: number; wins: number; bestPoints: number | null }[] }[];
  recentRuns: { id: string; createdAt: string; completed: boolean; gameMode: string; challengeIssueId: string | null; wins: number | null; points: number | null; clubFilter: string | null; multiplayerSeat: { roomCode: string } | null; user: Person | null }[];
  recentRooms: { code: string; status: string; createdAt: string; seats: { id: string; name: string; isBot: boolean }[] }[];
};
type UserRow = Person & { provider: string; telegramId: string | null; firstName: string | null; lastName: string | null;
  createdAt: string; lastActiveAt: string | null; lastGameAt: string | null; referralCount: number;
  totalRuns: number; periodRuns: number; completed: number; perfect: number; bestPoints: number | null };
type UserResult = { total: number; page: number; pageSize: number; users: UserRow[] };
type RunRow = { id: string; createdAt: string; completed: boolean; gameMode: string; challengeIssueId: string | null; clubFilter: string | null; formation: string; teamName: string | null;
  wins: number | null; draws: number | null; losses: number | null; points: number | null; position: number | null;
  user: Person | null; multiplayerSeat: { roomCode: string; isBot: boolean; name: string; room: { status: string } } | null };
type RoomRow = { code: string; status: string; createdAt: string; updatedAt: string; maxPlayers: number; seriesRound: number; seriesTargetWins: number;
  host: Person | null; seats: { name: string; isBot: boolean; ready: boolean; user: Person | null }[] };
type GameResult = { total: number; page: number; pageSize: number; runs?: RunRow[]; rooms?: RoomRow[] };

const card = 'rounded-2xl border border-white/10 bg-[#151a18] p-4 sm:p-5';
const control = 'min-h-10 w-full rounded-lg border border-white/15 bg-[#0a100e] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400';
const modeNames: Record<string, string> = { all: 'Все режимы', classic: 'Обычный драфт', single_club: 'Один клуб', challenge: 'Челленджи', multiplayer: 'Мультиплеер' };
const periodNames: Record<AdminPeriod, string> = { today: 'Сегодня', '3d': '3 дня', '7d': '7 дней', '14d': '14 дней', '30d': '30 дней', '90d': '90 дней', all: 'Всё время', custom: 'Свои даты' };
const metricLabels: { id: string; label: string; hint: string }[] = [
  { id: 'totalUsers', label: 'Пользователей всего', hint: 'Зарегистрированные учётные записи' },
  { id: 'newUsers', label: 'Новых пользователей', hint: 'Зарегистрировались за период' },
  { id: 'activeUsers', label: 'Активных пользователей', hint: 'Заходили или начинали игру за период' },
  { id: 'inactiveUsers', label: 'Без активности', hint: 'Нет подтверждённой активности за период' },
  { id: 'uniquePlayers', label: 'Играли', hint: 'Уникальные пользователи с драфтом за период' },
  { id: 'runs', label: 'Создано драфтов', hint: 'Один состав = один драфт' },
  { id: 'completed', label: 'Завершено сезонов', hint: 'Завершённые драфты за период' },
  { id: 'challengeRuns', label: 'Запусков челленджей', hint: 'Все начатые драфты в челленджах за период' },
  { id: 'challengeCompleted', label: 'Сезонов в челленджах', hint: 'Завершённые сезоны в челленджах за период' },
  { id: 'inProgress', label: 'Не завершены', hint: 'Сезон ещё не завершён' },
  { id: 'completionRate', label: 'Доля завершённых', hint: 'От всех созданных драфтов за период' },
  { id: 'perfect', label: 'Результатов 30–0', hint: '30 побед, 0 ничьих и поражений' },
  { id: 'averagePoints', label: 'Средние очки', hint: 'За завершённый сезон' },
  { id: 'averageWins', label: 'Средние победы', hint: 'За завершённый сезон' },
  { id: 'rooms', label: 'Комнат создано', hint: 'Мультиплеерные комнаты за период' },
  { id: 'liveRooms', label: 'Комнат не завершено', hint: 'Текущий статус комнаты, не признак присутствия онлайн' },
];
const defaultMetrics = ['totalUsers', 'newUsers', 'activeUsers', 'uniquePlayers', 'runs', 'completed', 'challengeRuns', 'challengeCompleted', 'completionRate', 'perfect', 'rooms', 'liveRooms'];
const telegramUrl = (username: string | null) => username && /^[a-zA-Z0-9_]{5,32}$/.test(username) ? `https://t.me/${username}` : null;
const name = (user: Person | null) => user ? telegramUrl(user.username)
  ? <a href={telegramUrl(user.username)!} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-300 hover:underline"><strong>{user.displayName}</strong><span className="ml-1 text-emerald-300">@{user.username}</span></a>
  : <strong>{user.displayName}</strong> : <span className="text-white/45">Гость или бот</span>;
const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const dateOnly = (value: string) => new Date(`${value}T12:00:00+03:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
const modeOf = (run: { multiplayerSeat: unknown; gameMode: string }) => run.multiplayerSeat ? 'Мультиплеер' : run.gameMode.startsWith('challenge_') ? 'Челленджи' : run.gameMode === 'single_club' ? 'Один клуб' : 'Обычный драфт';
const roomStatus: Record<string, string> = { lobby: 'Лобби', starting: 'Запуск', drafting: 'Драфт идёт', completed: 'Завершена' };

function useAdminData<T>(url: string | null) {
  const [result, setResult] = useState<{ url: string; value: T } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Ошибка загрузки');
      return result as T;
    }).then(value => { setResult({ url, value }); setError(''); }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Ошибка загрузки');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, version]);
  // A fetch is triggered when the URL changes; retain the last result while loading.
  const refresh = () => { setLoading(true); setVersion(value => value + 1); };
  return { data: result?.url === url ? result.value : null, error, loading, refresh };
}

export default function AdminInsights({ section }: { section: Section }) {
  const [period, setPeriod] = useState<AdminPeriod>('14d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState<AdminMode>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [kind, setKind] = useState<'runs' | 'rooms'>('runs');
  const [page, setPage] = useState(1);
  const [leaderMode, setLeaderMode] = useState('classic');
  const [configure, setConfigure] = useState(false);
  const [visible, setVisible] = useState<string[]>(defaultMetrics);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('admin-visible-metrics') ?? 'null');
      if (Array.isArray(saved) && saved.some(id => metricLabels.some(metric => metric.id === id))) setVisible(saved);
    } catch { /* Use defaults. */ }
  }, []);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search), 250); return () => clearTimeout(timer); }, [search]);
  const validCustom = period !== 'custom' || Boolean(from && to && from <= to);
  const query = useMemo(() => {
    if (!validCustom) return null;
    const params = new URLSearchParams({ period, mode });
    if (period === 'custom') { params.set('from', from); params.set('to', to); }
    if (section !== 'overview') {
      params.set('q', debouncedSearch); params.set('status', status); params.set('sort', sort); params.set('page', String(page));
      if (section === 'games') params.set('kind', kind);
    }
    return params.toString();
  }, [period, mode, from, to, validCustom, section, debouncedSearch, status, sort, page, kind]);
  const endpoint = query && `/api/admin/${section === 'overview' ? 'insights' : section}?${query}`;
  const overview = useAdminData<Insight>(section === 'overview' ? endpoint : null);
  const users = useAdminData<UserResult>(section === 'users' ? endpoint : null);
  const games = useAdminData<GameResult>(section === 'games' ? endpoint : null);
  const current = section === 'overview' ? overview : section === 'users' ? users : games;
  const change = (fn: () => void) => { setPage(1); fn(); };
  const updateVisible = (id: string) => setVisible(previous => {
    const next = previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id];
    localStorage.setItem('admin-visible-metrics', JSON.stringify(next));
    return next;
  });
  const max = Math.max(1, ...(overview.data?.chart.map(day => day.runs) ?? []));
  const leaderboard = overview.data?.leaders.find(entry => entry.id === leaderMode)?.users ?? [];
  return <div className="space-y-5">
    <section className={`${card} space-y-4`} aria-label="Фильтры аналитики">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{section === 'overview' ? 'Обзор продукта' : section === 'users' ? 'Пользователи' : 'История игр'}</h2><p className="mt-1 text-xs text-white/50">Периоды и даты — по Москве (UTC+3). Данные доступны только в админке.</p></div><button type="button" onClick={current.refresh} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/10">Обновить ↻</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-white/60">Период<select className={`${control} mt-1`} value={period} onChange={e => change(() => setPeriod(e.target.value as AdminPeriod))}>{Object.entries(periodNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="text-xs text-white/60">Режим<select className={`${control} mt-1`} value={mode} disabled={section === 'games' && kind === 'rooms'} onChange={e => change(() => setMode(e.target.value as AdminMode))}>{Object.entries(modeNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        {period === 'custom' && <><label className="text-xs text-white/60">С<input type="date" className={`${control} mt-1`} value={from} onChange={e => change(() => setFrom(e.target.value))} /></label><label className="text-xs text-white/60">По<input type="date" className={`${control} mt-1`} value={to} onChange={e => change(() => setTo(e.target.value))} /></label></>}
        {section !== 'overview' && <label className="text-xs text-white/60">Поиск<input className={`${control} mt-1`} value={search} onChange={e => change(() => setSearch(e.target.value))} placeholder={section === 'users' ? 'Ник, имя или Telegram ID' : 'Ник, игрок или код'} /></label>}
        {section === 'users' && <><label className="text-xs text-white/60">Активность<select className={`${control} mt-1`} value={status} onChange={e => change(() => setStatus(e.target.value))}><option value="all">Все</option><option value="active">Активные</option><option value="inactive">Без активности</option><option value="new">Новые за период</option></select></label><label className="text-xs text-white/60">Сортировка<select className={`${control} mt-1`} value={sort} onChange={e => change(() => setSort(e.target.value))}><option value="recent">Последняя активность</option><option value="games">Больше всего игр</option><option value="created">Недавно зарегистрированы</option><option value="oldest">Ранние регистрации</option><option value="name">По имени</option></select></label></>}
        {section === 'games' && <><label className="text-xs text-white/60">Статус<select className={`${control} mt-1`} value={status} onChange={e => change(() => setStatus(e.target.value))}><option value="all">Все</option><option value="active">Не завершены</option><option value="completed">Завершены</option>{kind === 'runs' && <option value="perfect">30–0</option>}</select></label><label className="text-xs text-white/60">Сортировка<select className={`${control} mt-1`} value={sort} onChange={e => change(() => setSort(e.target.value))}><option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option>{kind === 'runs' && <><option value="points">Больше очков</option><option value="wins">Больше побед</option></>}</select></label></>}
      </div>
      {section === 'games' && <div role="group" aria-label="Тип записи" className="flex flex-wrap gap-2">{([['runs', 'Драфты и сезоны'], ['rooms', 'Комнаты мультиплеера']] as const).map(([id, label]) => <button type="button" key={id} onClick={() => change(() => { setKind(id); setStatus('all'); setSort('newest'); if (id === 'rooms') setMode('all'); })} className={`rounded-lg px-3 py-2 text-sm ${kind === id ? 'bg-emerald-400 font-semibold text-black' : 'bg-white/5 text-white/70'}`}>{label}</button>)}</div>}
      {!validCustom && <p className="text-sm text-amber-200">Укажи начальную и конечную даты.</p>}
      {current.error && <p role="alert" className="text-sm text-red-300">{current.error}</p>}
      {current.loading && <p role="status" className="text-xs text-emerald-300">Обновляем данные…</p>}
    </section>
    {section === 'overview' && overview.data && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-white/60">{overview.data.range.label} · {modeNames[mode]}</p><button type="button" className="text-sm text-emerald-300 underline" onClick={() => setConfigure(value => !value)}>{configure ? 'Готово' : 'Настроить показатели'}</button></div>
      {configure && <section className={card}><h3 className="mb-3 font-semibold">Показывать в обзоре</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{metricLabels.map(metric => <label key={metric.id} className="flex gap-2 rounded-lg bg-white/5 p-2 text-sm"><input type="checkbox" checked={visible.includes(metric.id)} onChange={() => updateVisible(metric.id)} />{metric.label}</label>)}</div></section>}
      <section aria-label="Продуктовые показатели" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{metricLabels.filter(metric => visible.includes(metric.id)).map(metric => <article key={metric.id} className={card} title={metric.hint}><p className="text-xs text-white/55">{metric.label}</p><p className="mt-2 text-2xl font-bold text-emerald-400 sm:text-3xl">{overview.data!.metrics[metric.id] == null ? '—' : `${overview.data!.metrics[metric.id]}${metric.id === 'completionRate' ? '%' : ''}`}</p><p className="mt-1 text-[11px] leading-snug text-white/40">{metric.hint}</p></article>)}</section>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><section className={card}><h3 className="font-semibold">Созданные драфты по дням</h3><p className="text-xs text-white/45">Для длинного периода график показывает последние 90 дней.</p><div className="mt-5 flex h-44 items-end gap-1 overflow-x-auto pb-5" role="img" aria-label="Количество созданных драфтов по дням">{overview.data.chart.map((day, i) => <div key={day.date} title={`${day.date}: ${day.runs}`} className="group relative flex h-full min-w-[5px] flex-1 items-end"><div className="w-full rounded-t bg-emerald-400/80 transition-colors group-hover:bg-emerald-300" style={{ height: `${Math.max(3, day.runs / max * 100)}%` }} />{(i === 0 || i === overview.data!.chart.length - 1 || (overview.data!.chart.length <= 14 && i % 2 === 0)) && <span className="absolute -bottom-5 left-0 whitespace-nowrap text-[10px] text-white/40">{dateOnly(day.date)}</span>}</div>)}</div></section><section className={card}><h3 className="font-semibold">По режимам</h3><div className="mt-4 space-y-4">{overview.data.modes.filter(entry => mode === 'all' || entry.id === mode).map(entry => <div key={entry.id}><div className="flex justify-between text-sm"><span>{modeNames[entry.id]}</span><strong>{entry.count}</strong></div><div className="mt-2 h-2 rounded bg-white/10"><div className="h-full rounded bg-emerald-400" style={{ width: `${overview.data!.metrics.runs ? entry.count / overview.data!.metrics.runs * 100 : 0}%` }} /></div><p className="mt-1 text-xs text-white/45">Завершено: {entry.completed}</p></div>)}</div></section></div>
      <div className="grid gap-4 lg:grid-cols-2"><section className={card}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Самые активные игроки</h3><select aria-label="Режим лидеров" className="rounded-lg border border-white/15 bg-[#0a100e] px-2 py-1 text-sm" value={leaderMode} onChange={e => setLeaderMode(e.target.value)}>{Object.entries(modeNames).filter(([id]) => id !== 'all').map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div><p className="mt-1 text-xs text-white/45">По числу драфтов за выбранный период</p><div className="mt-4 space-y-2">{leaderboard.length ? leaderboard.map((row, i) => <div key={row.user.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3 text-sm"><span className="min-w-0 truncate"><span className="mr-2 text-white/40">#{i + 1}</span>{name(row.user)}</span><span className="shrink-0 text-emerald-300">{row.runs} игр</span></div>) : <p className="text-sm text-white/45">Пока нет игр в этом режиме за период.</p>}</div></section>
      <section className={card}><h3 className="font-semibold">Последние драфты</h3><div className="mt-4 space-y-2">{overview.data.recentRuns.length ? overview.data.recentRuns.map(run => <div key={run.id} className="flex justify-between gap-3 rounded-lg bg-white/5 p-3 text-sm"><div className="min-w-0"><p className="truncate">{name(run.user)}</p><p className="text-xs text-white/45">{modeOf(run)}{run.challengeIssueId ? ` · ${run.challengeIssueId}` : ""} · {dateTime(run.createdAt)}</p></div><div className="shrink-0 text-right">{run.completed ? `${run.wins ?? 0} побед` : 'В процессе'}<p className="text-xs text-white/45">{run.points == null ? '' : `${run.points} очков`}</p></div></div>) : <p className="text-sm text-white/45">Нет драфтов за период.</p>}</div><h4 className="mt-5 font-semibold">Последние комнаты</h4><div className="mt-2 space-y-2">{overview.data.recentRooms.map(room => <div key={room.code} className="flex justify-between rounded-lg bg-white/5 p-3 text-xs"><span>{room.code} · {room.seats.length} участников</span><span>{roomStatus[room.status] ?? room.status}</span></div>)}</div></section></div>
    </>}
    {section === 'users' && users.data && <section className={card}><div className="mb-3 flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Пользователи · {users.data.total}</h3><span className="text-xs text-white/45">Игры и рекорды — за выбранный период; всего игр — за всё время.</span></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead><tr className="border-b border-white/10 text-xs text-white/45"><th className="p-3">Пользователь</th><th className="p-3">Telegram ID</th><th className="p-3">Регистрация</th><th className="p-3">Последний заход</th><th className="p-3">Последняя игра</th><th className="p-3 text-right">Игры</th><th className="p-3 text-right">За период</th><th className="p-3 text-right">30–0</th></tr></thead><tbody>{users.data.users.map(user => <tr key={user.id} className="border-b border-white/5 hover:bg-white/5"><td className="p-3">{telegramUrl(user.username) ? <a href={telegramUrl(user.username)!} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold hover:text-emerald-300 hover:underline">{user.displayName}<span className="block text-xs text-emerald-300">@{user.username}</span></a> : <><span className="font-semibold">{user.displayName}</span><span className="block text-xs text-emerald-300">{user.provider}</span></>}</td><td className="p-3 font-mono text-xs text-white/60">{user.telegramId ?? '—'}</td><td className="p-3 whitespace-nowrap">{dateTime(user.createdAt)}</td><td className="p-3 whitespace-nowrap">{dateTime(user.lastActiveAt)}</td><td className="p-3 whitespace-nowrap">{dateTime(user.lastGameAt)}</td><td className="p-3 text-right">{user.totalRuns}</td><td className="p-3 text-right">{user.periodRuns} <span className="text-white/40">({user.completed} заверш.)</span></td><td className="p-3 text-right">{user.perfect}</td></tr>)}</tbody></table></div>{!users.data.users.length && <p className="py-8 text-center text-sm text-white/45">По этим фильтрам пользователей нет.</p>}<Pagination total={users.data.total} page={page} pageSize={users.data.pageSize} onPage={setPage} /></section>}
    {section === 'games' && games.data && <section className={card}><h3 className="font-semibold">{kind === 'rooms' ? 'Комнаты' : 'Драфты'} · {games.data.total}</h3><p className="mt-1 text-xs text-white/45">{kind === 'rooms' ? 'Комната может включать несколько драфтов игроков.' : 'Один драфт — один состав; в мультиплеере у каждого участника свой состав.'}</p><div className="mt-4 space-y-2">{kind === 'runs' ? games.data.runs?.map(run => <article key={run.id} className="grid gap-2 rounded-xl border border-white/5 bg-white/[.03] p-3 text-sm sm:grid-cols-[1.5fr_1fr_auto]"><div><p>{run.multiplayerSeat?.isBot ? <strong>{run.multiplayerSeat.name} · бот</strong> : name(run.user)}</p><p className="mt-1 text-xs text-white/50">{modeOf(run)} · {run.challengeIssueId ?? run.clubFilter ?? run.formation}{run.multiplayerSeat && ` · комната ${run.multiplayerSeat.roomCode}`}</p></div><div className="text-xs text-white/60"><p>{dateTime(run.createdAt)}</p><p className="mt-1 font-mono text-[11px]">{run.id}</p></div><div className="sm:text-right"><strong className={run.completed ? 'text-emerald-300' : 'text-amber-200'}>{run.completed ? `${run.wins ?? 0}–${run.draws ?? 0}–${run.losses ?? 0}` : 'В процессе'}</strong><p className="text-xs text-white/55">{run.points == null ? '—' : `${run.points} очков`}{run.position ? ` · ${run.position}-е место` : ''}</p></div></article>) : games.data.rooms?.map(room => <article key={room.code} className="grid gap-2 rounded-xl border border-white/5 bg-white/[.03] p-3 text-sm sm:grid-cols-[1fr_1fr_auto]"><div><strong>Комната {room.code}</strong><p className="mt-1 text-xs text-white/50">Создатель: {name(room.host)}</p><p className="text-xs text-white/45">{room.seriesTargetWins ? `Серия до ${room.seriesTargetWins} побед · раунд ${room.seriesRound}` : 'Одна игра'}</p></div><div><p>{room.seats.length}/{room.maxPlayers} участников</p><p className="mt-1 text-xs text-white/50">{room.seats.map(seat => seat.isBot ? `${seat.name} (бот)` : seat.user?.username ? `@${seat.user.username}` : seat.name).join(', ')}</p></div><div className="sm:text-right"><strong className={room.status === 'completed' ? 'text-emerald-300' : 'text-amber-200'}>{roomStatus[room.status] ?? room.status}</strong><p className="text-xs text-white/50">{dateTime(room.createdAt)}</p></div></article>)}{!games.data.total && <p className="py-8 text-center text-sm text-white/45">По этим фильтрам игр нет.</p>}</div><Pagination total={games.data.total} page={page} pageSize={games.data.pageSize} onPage={setPage} /></section>}
  </div>;
}

function Pagination({ total, page, pageSize, onPage }: { total: number; page: number; pageSize: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return <div className="mt-5 flex items-center justify-between gap-3 text-sm"><button disabled={page <= 1} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-30" onClick={() => onPage(page - 1)}>← Назад</button><span>Страница {page} из {pages}</span><button disabled={page >= pages} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-30" onClick={() => onPage(page + 1)}>Далее →</button></div>;
}
