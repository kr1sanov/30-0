'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import AdminPasswordLogin from './AdminPasswordLogin';
import AdminRosterManager from './AdminRosterManager';
import AdminInsights from './AdminInsights';

type Role = 'owner' | 'admin' | 'moderator' | 'viewer';
type Player = { id: string; fullName: string; lastName: string; alias: string | null; _count: { seasons: number } };
type Account = { username: string; role: Role; mustChangePassword: boolean; updatedAt: string };
type Campaign = { id: string; title: string; message: string; cadence: string; enabled: boolean };
type Dashboard = { username: string; role: Role };
const panel = 'rounded-2xl border border-white/10 bg-[#151a18] p-5';
const input = 'min-h-10 rounded-lg border border-white/10 bg-[#080e0c] px-3 py-2 text-white outline-none focus:border-emerald-500';
const action = 'rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-[#07110d] hover:bg-emerald-300 disabled:opacity-40';
const roleNames: Record<Role, string> = { owner: 'Владелец', admin: 'Администратор', moderator: 'Модератор', viewer: 'Просмотр' };

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, cache: 'no-store', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
  return data as T;
}

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<Role>('viewer');
  const [issuedPassword, setIssuedPassword] = useState('');
  const [resetPhrase, setResetPhrase] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [cadence, setCadence] = useState('weekly');
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const load = useCallback(async () => {
    try { setDashboard(await api<Dashboard>('/api/admin/session')); }
    catch { setDashboard(null); }
    finally { setInitializing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dashboard || tab !== 'players') return;
    const timer = setTimeout(() => { void api<{ players: Player[] }>(`/api/admin/players?q=${encodeURIComponent(search)}`).then(data => setPlayers(data.players)).catch(cause => setError(String(cause))); }, 200);
    return () => clearTimeout(timer);
  }, [dashboard, tab, search]);
  useEffect(() => {
    if (!dashboard || tab !== 'access' || !['owner', 'admin'].includes(dashboard.role)) return;
    void api<{ accounts: Account[] }>('/api/admin/access').then(data => setAccounts(data.accounts)).catch(cause => setError(String(cause)));
  }, [dashboard, tab]);
  useEffect(() => {
    if (!dashboard || tab !== 'campaigns') return;
    void api<{ campaigns: Campaign[] }>('/api/admin/campaigns').then(data => setCampaigns(data.campaigns ?? [])).catch(cause => setError(String(cause)));
  }, [dashboard, tab]);
  async function execute(fn: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка'); }
    finally { setBusy(false); }
  }
  if (initializing) return <main className="min-h-screen bg-[#09110e] p-8 text-white">Загружаем админку…</main>;
  if (!dashboard) return <AdminPasswordLogin />;
  const role = dashboard.role;
  const canAlias = role !== 'viewer';
  const canManage = role === 'owner' || role === 'admin';
  const tabs = [['overview', 'Обзор'], ['users', 'Пользователи'], ['games', 'Игры'], ['players', 'Игроки'], ...(canManage ? [['rosters', 'Составы'], ['access', 'Команда'], ['campaigns', 'Рассылки']] : []), ['settings', 'Настройки']];
  return <main className="min-h-screen bg-[#09110e] px-4 pb-16 pt-6 text-white md:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-400">Управление продуктом</p><h1 className="mt-1 text-3xl font-bold">Панель администратора</h1><p className="mt-1 text-sm text-white/55">{dashboard.username} · {roleNames[role]}</p></div><button className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10" onClick={() => void execute(async () => { await api('/api/admin/auth/logout', 'POST'); setDashboard(null); })}>Выйти</button></header>
      <nav aria-label="Разделы админки" className="flex gap-2 overflow-x-auto border-b border-white/10 pb-3">{tabs.map(([id, title]) => <button key={id} onClick={() => { setTab(id); setError(''); setNotice(''); }} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${tab === id ? 'bg-emerald-400 font-semibold text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>{title}</button>)}</nav>
      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-sm text-emerald-200">{notice}</p>}
      {(['overview', 'users', 'games'].includes(tab)) && <AdminInsights key={tab} section={tab as 'overview' | 'users' | 'games'} />}
      {tab === 'players' && <section className={panel}><h2 className="text-lg font-semibold">Псевдонимы игроков</h2><p className="mt-1 text-sm text-white/55">Исходные имя и фамилия сохраняются в базе. Псевдоним используется в новых спинах и на поле.</p><input aria-label="Поиск игрока" className={`${input} mt-5 w-full max-w-md`} placeholder="Имя, фамилия или псевдоним" value={search} onChange={e => setSearch(e.target.value)} /><div className="mt-4 space-y-2">{players.map(player => <PlayerEditor key={player.id} player={player} editable={canAlias} busy={busy} onSave={alias => execute(async () => { const result = await api<{ player: Player }>(`/api/admin/players/${player.id}/alias`, 'PATCH', { alias }); setPlayers(rows => rows.map(row => row.id === player.id ? { ...row, alias: result.player.alias } : row)); setNotice('Псевдоним сохранён'); })} />)}</div><p className="mt-3 text-xs text-white/40">Показаны первые 50 результатов. Уточни поиск для остальных игроков.</p></section>}
      {tab === 'rosters' && canManage && <AdminRosterManager onChanged={() => void load()} />}
      {tab === 'access' && canManage && <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]"><section className={`${panel} h-fit`}><h2 className="text-lg font-semibold">Добавить сотрудника</h2><form className="mt-4 space-y-3" onSubmit={(e: FormEvent) => { e.preventDefault(); void execute(async () => { const created = await api<{ temporaryPassword: string }>('/api/admin/access', 'POST', { username: newUsername, role: newRole }); setIssuedPassword(created.temporaryPassword); setNewUsername(''); setAccounts((await api<{ accounts: Account[] }>('/api/admin/access')).accounts); }); }}><label className="block text-sm">Логин<input required minLength={3} maxLength={50} value={newUsername} onChange={e => setNewUsername(e.target.value)} className={`${input} mt-1 w-full`} /></label><label className="block text-sm">Роль<select className={`${input} mt-1 w-full`} value={newRole} onChange={e => setNewRole(e.target.value as Role)}><option value="viewer">Просмотр</option><option value="moderator">Модератор</option>{role === 'owner' && <option value="admin">Администратор</option>}</select></label><button disabled={busy} className={action}>Создать доступ</button></form>{issuedPassword && <div className="mt-4 rounded-lg border border-amber-400/40 p-3 text-sm"><strong>Временный пароль (показывается один раз):</strong><code className="mt-2 block break-all text-amber-200">{issuedPassword}</code><button onClick={() => void navigator.clipboard.writeText(issuedPassword)} className="mt-2 underline">Скопировать</button></div>}<p className="mt-3 text-xs text-white/50">При первом входе сотрудник задаст свой пароль.</p></section><section className={panel}><h2 className="text-lg font-semibold">Права доступа</h2><p className="mt-1 text-xs text-white/50">Просмотр — статистика и игроки; модератор — также псевдонимы; администратор — также составы, рассылки и доступ сотрудников; владелец — общий сброс.</p><div className="mt-4 space-y-2">{accounts.map(account => <div key={account.username} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 p-3 text-sm"><div className="min-w-32 flex-1"><strong>{account.username}</strong>{account.mustChangePassword && <p className="text-xs text-amber-200">Ожидает смены пароля</p>}</div>{account.role === 'owner' ? <span>Владелец</span> : <><select aria-label={`Роль ${account.username}`} className={input} value={account.role} disabled={busy || (role !== 'owner' && account.role === 'admin')} onChange={e => void execute(async () => { await api('/api/admin/access', 'PATCH', { username: account.username, role: e.target.value }); setAccounts((await api<{ accounts: Account[] }>('/api/admin/access')).accounts); })}><option value="viewer">Просмотр</option><option value="moderator">Модератор</option>{role === 'owner' && <option value="admin">Администратор</option>}</select><button disabled={busy || (role !== 'owner' && account.role === 'admin')} onClick={() => { if (window.confirm(`Удалить доступ ${account.username}?`)) void execute(async () => { await api('/api/admin/access', 'DELETE', { username: account.username }); setAccounts((await api<{ accounts: Account[] }>('/api/admin/access')).accounts); }); }} className="rounded border border-red-700/60 px-3 py-2 text-red-200">Удалить</button></>}</div>)}</div></section></div>}
      {tab === 'campaigns' && canManage && <section className={panel}><h2 className="text-lg font-semibold">Рассылки</h2><p className="mt-1 text-sm text-white/50">Отправка пользователям, включившим уведомления.</p><form onSubmit={e => { e.preventDefault(); void execute(async () => { await api('/api/admin/campaigns', 'POST', { title: campaignTitle, message: campaignMessage, cadence, enabled: false }); setCampaignTitle(''); setCampaignMessage(''); setCampaigns((await api<{ campaigns: Campaign[] }>('/api/admin/campaigns')).campaigns); }); }} className="mt-4 grid gap-3 md:grid-cols-2"><input required className={input} placeholder="Название" value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} /><select value={cadence} onChange={e => setCadence(e.target.value)} className={input}><option value="daily">Ежедневно</option><option value="weekly">Еженедельно</option><option value="monthly">Ежемесячно</option><option value="return">Возврат через 7 дней</option></select><textarea required rows={3} className={`${input} md:col-span-2`} placeholder="Текст сообщения" value={campaignMessage} onChange={e => setCampaignMessage(e.target.value)} /><button disabled={busy} className={`${action} w-fit`}>Создать выключенной</button></form><div className="mt-5 space-y-2">{campaigns.map(campaign => <div key={campaign.id} className="flex flex-wrap justify-between gap-3 rounded-lg bg-white/5 p-3 text-sm"><div><strong>{campaign.title}</strong><p className="text-xs text-white/50">{campaign.cadence} · {campaign.enabled ? 'включена' : 'выключена'}</p></div><div className="flex gap-2"><button className="rounded border border-white/20 px-3 py-1" onClick={() => void execute(async () => { await api('/api/admin/campaigns', 'POST', { ...campaign, enabled: !campaign.enabled }); setCampaigns((await api<{ campaigns: Campaign[] }>('/api/admin/campaigns')).campaigns); })}>{campaign.enabled ? 'Пауза' : 'Включить'}</button><button className="rounded border border-red-700/60 px-3 py-1 text-red-200" onClick={() => { if (window.confirm('Удалить рассылку?')) void execute(async () => { await api('/api/admin/campaigns', 'DELETE', { id: campaign.id }); setCampaigns((await api<{ campaigns: Campaign[] }>('/api/admin/campaigns')).campaigns); }); }}>Удалить</button></div></div>)}</div></section>}
      {tab === 'settings' && <div className="grid gap-4 lg:grid-cols-2"><section className={panel}><h2 className="text-lg font-semibold">Изменить свой пароль</h2><form onSubmit={e => { e.preventDefault(); void execute(async () => { await api('/api/admin/auth/password', 'PATCH', { currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setNotice('Пароль обновлён. Старые сеансы завершены.'); }); }} className="mt-4 space-y-3"><input required type="password" autoComplete="current-password" className={`${input} block w-full`} placeholder="Текущий пароль" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /><input required type="password" minLength={16} autoComplete="new-password" className={`${input} block w-full`} placeholder="Новый пароль (от 16 символов)" value={newPassword} onChange={e => setNewPassword(e.target.value)} /><button disabled={busy} className={action}>Сменить пароль</button></form></section>{role === 'owner' && <section className={`${panel} border-red-500/30`}><h2 className="text-lg font-semibold text-red-200">Сброс прогресса всех пользователей</h2><p className="mt-2 text-sm text-white/60">Удалит все игры и историю сезонов, очистит статистику и достижения в профилях. Учётные записи и приглашения сохранятся. Действие необратимо.</p><label className="mt-4 block text-sm">Для подтверждения введи «СБРОСИТЬ ПРОГРЕСС ВСЕХ»<input className={`${input} mt-2 w-full`} value={resetPhrase} onChange={e => setResetPhrase(e.target.value)} /></label><button disabled={busy || resetPhrase !== 'СБРОСИТЬ ПРОГРЕСС ВСЕХ'} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" onClick={() => { if (window.confirm('Точно удалить прогресс всех пользователей?')) void execute(async () => { const result = await api<{ runsRemoved: number }>('/api/admin/progress', 'POST', { confirm: resetPhrase }); setResetPhrase(''); setNotice(`Прогресс сброшен: удалено игр ${result.runsRemoved}.`); await load(); }); }}>Сбросить прогресс</button></section>}</div>}
    </div>
  </main>;
}

function PlayerEditor({ player, editable, busy, onSave }: { player: Player; editable: boolean; busy: boolean; onSave: (alias: string | null) => void }) {
  const [alias, setAlias] = useState(player.alias ?? '');
  useEffect(() => setAlias(player.alias ?? ''), [player.alias]);
  return <div className="grid gap-2 rounded-lg bg-white/5 p-3 text-sm md:grid-cols-[minmax(180px,1fr)_minmax(160px,1fr)_auto]"><div><strong>{player.fullName}</strong><p className="text-xs text-white/45">Фамилия: {player.lastName} · сезонов в базе: {player._count.seasons}</p></div><input disabled={!editable} value={alias} maxLength={50} onChange={e => setAlias(e.target.value)} aria-label={`Псевдоним ${player.fullName}`} className={input} placeholder="Псевдоним" /><div className="flex gap-2">{editable && <><button disabled={busy || alias.trim() === (player.alias ?? '')} className={action} onClick={() => onSave(alias)}>Сохранить</button>{player.alias && <button disabled={busy} className="rounded border border-white/20 px-3 text-xs" onClick={() => onSave(null)}>Очистить</button>}</>}</div></div>;
}
