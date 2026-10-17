'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TelegramLogin from '@/components/game/TelegramLogin';
import { useAutoAuth } from '@/hooks/use-telegram-auth';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import type { WeeklyChallenge } from '@/lib/weeklyChallenges';
import { toast } from 'sonner';

interface ChallengeRun {
  id: string; issueId: string; completed: boolean; succeeded: boolean;
  position: number | null; points: number | null; goalsFor: number | null; createdAt: string;
}
interface ChallengeResponse {
  active: WeeklyChallenge[]; archive: WeeklyChallenge[];
  nextReleaseAt: string | null; archiveUnlockedUntil: string | null;
  archiveProgress: { completedSeasons: number; requiredSeasons: number; distinctModes: number; requiredModes: number }; personal: ChallengeRun[];
  totalCompleted: Record<string, number>;
}

function formatDate(value: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'Europe/Moscow' }).format(new Date(value));
}

export default function ChallengesClient() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');
  const [data, setData] = useState<ChallengeResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  useAutoAuth();

  useEffect(() => {
    setLanguage(document.documentElement.lang === 'en' ? 'en' : 'ru');
    const onChange = () => setLanguage(document.documentElement.lang === 'en' ? 'en' : 'ru');
    window.addEventListener('30-0-language-change', onChange);
    return () => window.removeEventListener('30-0-language-change', onChange);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/challenges', { cache: 'no-store' });
      if (!response.ok) throw new Error('Challenge overview unavailable');
      setData(await response.json());
      setError('');
    } catch { setError('Не удалось загрузить челленджи. Обнови страницу.'); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { setClock(Date.now()); void refresh(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh, isAuthenticated]);

  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  const t = (ru: string, en: string) => language === 'en' ? en : ru;
  const archiveOpen = !!data?.archiveUnlockedUntil && new Date(data.archiveUnlockedUntil).getTime() > clock;
  const grouped = useMemo(() => {
    const months: Array<{ label: string; issues: WeeklyChallenge[] }> = [];
    for (const issue of data?.archive ?? []) {
      const key = issue.startsAt.slice(0, 7);
      let month = months.find(group => group.label === key);
      if (!month) { month = { label: key, issues: [] }; months.push(month); }
      month.issues.push(issue);
    }
    return months;
  }, [data?.archive]);

  async function start(issue: WeeklyChallenge) {
    if (busy) return;
    if (!isAuthenticated) {
      toast.error(t('Сначала войди через Telegram', 'Sign in with Telegram first'));
      document.getElementById('challenge-login')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if ((issue.visibility === 'archived' || new Date(issue.endsAt).getTime() <= clock) && !archiveOpen) return;
    setBusy(true);
    try {
      const unfinished = resultFor(issue).runs.find(run => !run.completed);
      if (unfinished) {
        await useGameStore.getState().loadActiveRunFromCloud(issue.mode, undefined, issue.id, true);
        if (useGameStore.getState().runId === unfinished.id) { router.push(`/?challenge=${encodeURIComponent(issue.id)}`); return; }
      }
      await useGameStore.getState().startStarChallenge(issue.mode, issue.id);
      const state = useGameStore.getState();
      if (!state.runId) throw new Error(language === 'en' ? 'Could not start the challenge. Refresh and try again.' : state.lastDraftError ?? 'Не удалось начать челлендж');
      router.push(`/?challenge=${encodeURIComponent(issue.id)}`);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : t('Ошибка запуска', 'Could not start')); }
    finally { setBusy(false); }
  }

  function resultFor(issue: WeeklyChallenge) {
    const runs = data?.personal.filter(run => run.issueId === issue.id) ?? [];
    return { runs, wins: runs.filter(run => run.succeeded).length };
  }

  return <div className="club-theme-shell min-h-[100dvh] bg-[#0A0A0A] text-white">
    <Header onBack={() => router.push('/')} onHome={() => router.push('/')} onProfile={() => { useGameStore.getState().setScreen('profile'); router.push('/'); }} />
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-9 sm:pt-12">
      <div className="mb-8">
        <h1 className="text-4xl font-black sm:text-5xl">{t('Челленджи', 'Challenges')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9CA3AF] sm:text-base">
          {t('Новые задания каждую субботу в 12:00 МСК. Собери состав, сыграй сезон и забери достижение.', 'New challenges every Saturday at 12:00 Moscow time. Build your XI, play a season and earn an achievement.')}
        </p>
      </div>
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-500/30 p-3 text-red-300">{t(error, 'Could not load challenges. Refresh the page.')}</p>}
      {!data && !error && <p role="status" className="text-[#9CA3AF]">{t('Загружаем челленджи…', 'Loading challenges…')}</p>}
      {data && <>
        <section aria-labelledby="current-challenge-title" className="mb-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="current-challenge-title" className="text-2xl font-black">{t('Активные челленджи', 'Active challenges')}</h2>
            {data.nextReleaseAt && <span className="text-xs text-[#9CA3AF]">{t('Новые', 'Next release')}: {formatDate(data.nextReleaseAt, locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} {t('МСК', 'MSK')}</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.active.map(issue => {
              return <div key={issue.id} className={`overflow-hidden rounded-2xl border p-5 sm:p-6 ${issue.hero === 'vagner' ? 'border-red-500/40 bg-gradient-to-br from-red-950/75 to-blue-950/60' : 'border-sky-500/40 bg-gradient-to-br from-sky-950/70 to-slate-900'}`}>
                <button type="button" disabled={busy} onClick={() => void start(issue)} className="block w-full cursor-pointer text-left disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00C896]">
                  <strong className="block text-xl sm:text-2xl">{language === 'en' ? issue.titleEn : issue.titleRu}</strong>
                  <span className="mt-3 block text-sm leading-6 text-slate-300">{language === 'en' ? issue.descriptionEn : issue.descriptionRu}</span>
                </button>
              </div>;
            })}
          </div>
          <p className="mt-3 text-xs text-[#9CA3AF]">{t('За эту неделю уже сыграно сезонов', 'Challenge seasons played this week')}: {data.active.reduce((sum, issue) => sum + (data.totalCompleted[issue.id] ?? 0), 0)} · {t('Твой прогресс', 'Your progress')}: {data.active.filter(issue => resultFor(issue).wins > 0).length}/{data.active.length}</p>
          {_hasHydrated && !isAuthenticated && <div id="challenge-login" className="mt-5"><TelegramLogin /></div>}
        </section>

        <section aria-labelledby="archive-title">
          <h2 id="archive-title" className="mb-4 text-2xl font-black">{t('Архив челленджей', 'Challenge archive')}</h2>
          {grouped.length > 0 && (archiveOpen ? <p className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{t('Архив открыт до', 'Archive unlocked until')} {formatDate(data.archiveUnlockedUntil!, locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} {t('МСК', 'MSK')}</p>
            : <div className="mb-6 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-5"><strong>{t('Открой архив на 3 дня', 'Unlock the archive for 3 days')}</strong><p className="mt-2 text-sm text-[#b6b4c3]">{t('Заверши 5 сезонов минимум в двух разных режимах. После открытия новые пять сезонов позволят получить доступ снова.', 'Complete 5 seasons across at least two modes. After unlocking, complete another five seasons to earn access again.')}</p><p className="mt-3 text-sm font-bold">{t('Сезоны', 'Seasons')}: {data.archiveProgress.completedSeasons}/5 · {t('Режимы', 'Modes')}: {Math.min(2,data.archiveProgress.distinctModes)}/2</p><progress aria-label={t('Прогресс доступа к архиву', 'Archive access progress')} value={data.archiveProgress.completedSeasons} max={5} className="mt-3 w-full accent-violet-400" /></div>)}
          {grouped.length === 0 && <p className="text-sm text-[#9CA3AF]">{t('Архив появится после следующей субботы.', 'The archive opens after next Saturday.')}</p>}
          {grouped.map(group => <div key={group.label} className="mb-8">
            <h3 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-[.15em] text-[#9CA3AF]">{formatDate(group.issues[0].startsAt, locale, { month: 'long', year: 'numeric' })}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.issues.map(issue => {
              const progress = resultFor(issue);
              return <button type="button" key={issue.id} disabled={!archiveOpen || busy || !isAuthenticated} onClick={() => void start(issue)} className="rounded-2xl border border-white/10 bg-[#141414] p-4 text-left transition hover:border-[#00C896]/50 disabled:cursor-not-allowed disabled:opacity-65">
                <span className="text-xs text-[#9CA3AF]">{formatDate(issue.startsAt, locale, { day: 'numeric', month: 'long' })}</span>
                <strong className="mt-3 block text-base">{language === 'en' ? issue.titleEn : issue.titleRu}</strong>
                <span className="mt-2 block text-xs text-[#9CA3AF]">{progress.wins ? t('Выполнено ✓', 'Completed ✓') : archiveOpen ? t('Играть снова →', 'Play again →') : t('Нужно 5 сезонов в разных режимах', 'Complete 5 seasons in different modes')}</span>
              </button>;
            })}</div>
          </div>)}
        </section>
      </>}
    </main>
    <Footer onHome={() => router.push('/')} onPlay={() => router.push('/')} onProfile={() => { useGameStore.getState().setScreen('profile'); router.push('/'); }} />
  </div>;
}
