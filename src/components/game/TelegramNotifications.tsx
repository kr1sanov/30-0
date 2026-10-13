"use client";
import { useEffect, useState } from "react";
import { useUiTranslation } from "@/hooks/use-ui-translation";
import { toast } from "sonner";
import type { NotificationPreferences } from "@/lib/notificationPreferences";
const categories = [
  {
    key: "news",
    title: "Новости проекта",
    description: "Обновления, анонсы и новости проекта.",
  },
  {
    key: "invitations",
    title: "Приглашения в игры",
    description: "Приглашения от твоих друзей.",
  },
  {
    key: "results",
    title: "Результаты игр",
    description: "Итоги сезона с картинкой и ссылкой.",
  },
  {
    key: "friends",
    title: "Заявки в друзья",
    description: "Новые входящие заявки.",
  },
  {
    key: "friend_updates",
    title: "Ответы на заявки",
    description: "Игрок принял твою заявку.",
  },
] as const;
export default function TelegramNotifications() {
  const t = useUiTranslation();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = async () => {
    setError("");
    try {
      const res = await fetch("/api/users/notifications");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrefs(data.preferences);
    } catch (e) {
      setError(t(e instanceof Error ? e.message : "Не удалось загрузить настройки"));
    }
  };
  useEffect(() => {
    void load();
  }, []);
  async function save(key: keyof NotificationPreferences, value: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/users/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrefs(data.preferences);
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Не удалось сохранить настройки"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
      <h3 className="font-bold text-white">
Уведомления Telegram
</h3>
      <p className="mt-1 text-xs text-slate-400">
Настройки общие для профиля и бота. Нажми «Начать» в боте, чтобы получать сообщения.
</p>
      {error ? (
        <div role="alert" className="mt-3 text-sm text-red-300">
          {error}
          <button onClick={load} className="ml-3 min-h-11 underline">
Повторить
</button>
        </div>
      ) : prefs ? (
        <div className="mt-3 divide-y divide-white/10">
          <label className="flex min-h-14 items-center justify-between gap-4">
            <span className="font-semibold">
Получать уведомления
</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-emerald-400"
              checked={prefs.enabled}
              disabled={busy}
              onChange={(e) => save("enabled", e.target.checked)}
            />
          </label>
          {categories.map((c) => (
            <label
              key={c.key}
              className={`flex min-h-16 items-center justify-between gap-4 py-2 ${prefs.enabled ? "" : "opacity-50"}`}
            >
              <span>
                <span className="block text-sm">{c.title}</span>
                <span className="text-xs text-slate-400">{c.description}</span>
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-emerald-400"
                checked={prefs[c.key]}
                disabled={busy || !prefs.enabled}
                onChange={(e) => save(c.key, e.target.checked)}
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="py-4 text-sm text-slate-400">
Загрузка настроек…
</p>
      )}
      <a
        href="https://t.me/RPL30_bot?start=notifications"
        className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-sky-500/40 px-4 text-sm text-sky-300"
      >
Открыть Telegram
</a>
    </section>
  );
}
