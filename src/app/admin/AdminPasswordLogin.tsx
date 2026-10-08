'use client';
import { useEffect, useState, type FormEvent } from 'react';

export default function AdminPasswordLogin() {
  const [username, setUsername] = useState('kr1sanov');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changeRequired, setChangeRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/admin/auth/password', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (data.authenticated && data.mustChangePassword) setChangeRequired(true);
    }).catch(() => undefined);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/admin/auth/password', {
        method: changeRequired ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changeRequired ? { currentPassword: password, newPassword } : { username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось войти');
      if (data.mustChangePassword) { setChangeRequired(true); return; }
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка входа'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto my-12 max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 text-center text-white">
    <div className="text-5xl font-black">30<span className="text-[#00C896]">-</span>0</div>
    <h1 className="mt-6 text-2xl font-bold">{changeRequired ? 'Задай новый пароль' : 'Вход в админку'}</h1>
    <p className="mt-3 text-sm text-[#9CA3AF]">{changeRequired ? 'При первом входе смени временный пароль. Новый пароль: минимум 16 символов.' : 'Введи логин и пароль администратора.'}</p>
    <form onSubmit={submit} className="mt-6 space-y-3 text-left">
      {!changeRequired && <label className="block text-sm">Логин<input autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black p-3" /></label>}
      <label className="block text-sm">{changeRequired ? 'Временный пароль' : 'Пароль'}<input type="password" autoComplete={changeRequired ? 'current-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black p-3" /></label>
      {changeRequired && <label className="block text-sm">Новый пароль<input type="password" autoComplete="new-password" minLength={16} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black p-3" /></label>}
      <button disabled={busy} type="submit" className="min-h-12 w-full rounded-xl bg-[#00C896] px-4 font-bold text-black disabled:opacity-40">{busy ? 'Подожди…' : changeRequired ? 'Сменить пароль' : 'Войти'}</button>
    </form>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
  </main>;
}
