 'use client';
import { useCallback, useEffect, useState } from 'react';
import { useUiLanguage } from '@/hooks/use-ui-translation';
import type { WeeklyChallenge } from '@/lib/weeklyChallenges';
type Issue = WeeklyChallenge & { visibility: string };
export default function AdminChallenges() {
  const language = useUiLanguage();
  const en = language === 'en';
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => { const r = await fetch('/api/admin/challenges', { cache: 'no-store' }); if (!r.ok) throw new Error('Could not load challenges'); setIssues((await r.json()).issues); }, []);
  useEffect(() => { void refresh().catch(e => setError(e.message)); }, [refresh]);
  async function change(id: string, visibility: string) {
    setBusy(true); setError('');
    try { const r = await fetch('/api/admin/challenges', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, visibility }) }); if (!r.ok) throw new Error('Could not save challenge'); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error'); } finally { setBusy(false); }
  }
  return <section className="space-y-3"><h2 className="text-xl font-bold">{en ? 'Challenge publication' : 'Публикация челленджей'}</h2>
    <p className="text-sm text-slate-400">{en ? 'Automatic release: Saturday 12:00 Moscow. Open and Hidden override the schedule, including archived issues.' : 'По расписанию: суббота, 12:00 МСК. Открыть и Скрыть действуют сразу, в том числе для старых заданий.'}</p>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {[...issues].reverse().map(issue => <article key={issue.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><h3 className="font-bold">{en ? issue.titleEn : issue.titleRu}</h3><p className="mt-2 text-sm text-slate-300">{en ? issue.descriptionEn : issue.descriptionRu}</p><p className="my-3 text-xs text-slate-400">{new Date(issue.startsAt).toLocaleString(en ? 'en-GB' : 'ru-RU', { timeZone: 'Europe/Moscow' })} MSK · {issue.visibility}</p><div className="flex flex-wrap gap-2">{(['auto','open','hidden','archived'] as const).map(visibility => <button key={visibility} disabled={busy || visibility === issue.visibility} onClick={() => void change(issue.id, visibility)} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40">{visibility === 'auto' ? (en ? 'Scheduled' : 'По расписанию') : visibility === 'open' ? (en ? 'Open' : 'Открыть') : visibility === 'archived' ? (en ? 'Archive' : 'В архив') : (en ? 'Hidden' : 'Скрыть')}</button>)}</div></article>)}
  </section>;
}
