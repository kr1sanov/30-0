"use client";
import dynamic from "next/dynamic";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { translateClient } from "@/lib/enTranslations";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import AdminPasswordLogin from "./AdminPasswordLogin";

import AdminOverview from "./AdminOverview";

const AdminPlayers = dynamic(() => import("./AdminPlayers"), {
  loading: () => <p className="p-5 text-sm text-white/50">Загружаем…</p>,
});

const AdminRosterManager = dynamic(() => import("./AdminRosterManager"), {
  loading: () => <p className="p-5 text-sm text-white/50">Загружаем…</p>,
});

const AdminInsights = dynamic(() => import("./AdminInsights"), {
  loading: () => <p className="p-5 text-sm text-white/50">Загружаем…</p>,
});

const AdminOneClub = dynamic(() => import("./AdminOneClub"), {
  loading: () => <p className="p-5 text-sm text-white/50">Загружаем…</p>,
});

const AdminChallenges = dynamic(() => import("./AdminChallenges"), {
  loading: () => <p className="p-5 text-sm text-white/50">Загружаем…</p>,
});

const AdminCampaigns = dynamic(() => import("./AdminCampaigns"), {
  loading: () => <p className="p-5 text-sm text-white/50">Загружаем…</p>,
});

const AdminModeration = dynamic(() => import("./AdminModeration"), {
  loading: () => <p className="p-5 text-sm text-white/50">Загружаем…</p>,
});

const AdminLeaderboard = dynamic(() => import("./AdminLeaderboard"), {
  loading: () => <p className="p-5 text-sm text-white/50">Загружаем…</p>,
});

type Role = "owner" | "admin" | "moderator" | "viewer";
type Account = {
  username: string;
  role: Role;
  mustChangePassword: boolean;
  updatedAt: string;
};
type Dashboard = { username: string; role: Role };
const panel = "rounded-2xl border border-white/10 bg-[#151a18] p-5";
const input =
  "min-h-10 rounded-lg border border-white/10 bg-[#080e0c] px-3 py-2 text-white outline-none focus:border-emerald-500";
const action =
  "rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-[#07110d] hover:bg-emerald-300 disabled:opacity-40";
const roleNames: Record<Role, string> = {
  owner: "Владелец",
  admin: "Администратор",
  moderator: "Модератор",
  viewer: "Просмотр",
};

async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Ошибка запроса");
  return data as T;
}

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState("overview");
  const [entityId, setEntityId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const update = () => {
      const [next, entity] = window.location.hash.slice(1).split("/");
      setTab(next || "overview");
      setEntityId(entity || "");
      setError("");
      setNotice("");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [issuedPassword, setIssuedPassword] = useState("");
  const [resetPhrase, setResetPhrase] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const load = useCallback(async () => {
    try {
      setDashboard(await api<Dashboard>("/api/admin/session"));
    } catch {
      setDashboard(null);
    } finally {
      setInitializing(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (
      !dashboard ||
      tab !== "access" ||
      !["owner", "admin"].includes(dashboard.role)
    )
      return;
    void api<{ accounts: Account[] }>("/api/admin/access")
      .then((data) => setAccounts(data.accounts))
      .catch((cause) => setError(String(cause)));
  }, [dashboard, tab]);
  async function execute(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }
  if (initializing)
    return (
      <main className="min-h-screen bg-[#09110e] p-8 text-white">
        Загружаем админку…
      </main>
    );
  if (!dashboard)
    return (
      <>
        <div className="p-4">
          <LanguageSwitcher admin />
        </div>
        <AdminPasswordLogin />
      </>
    );
  const role = dashboard.role;
  const canAlias = role !== "viewer";
  const canManage = role === "owner" || role === "admin";
  const tabs = [
    ["overview", "Обзор"],
    ["users", "Пользователи"],
    ["games", "Игры"],
    ["leaderboard", "Рейтинг активности"],
    ["moderation", "Модерация"],
    ["players", "Игроки"],
    ...(canManage
      ? [
          ["one-club", "Один клуб"],
          ["challenges", "Челленджи"],
          ["rosters", "Составы"],
          ["access", "Доступы сотрудников"],
          ["campaigns", "Рассылки"],
        ]
      : []),
    ["settings", "Настройки"],
  ];
  return (
    <main className="min-h-screen bg-[#09110e] px-4 pb-16 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="order-2 ml-auto">
            <LanguageSwitcher admin />
          </div>
          <div className="order-1">
            <p className="text-sm font-semibold text-emerald-400">
              Управление продуктом
            </p>
            <h1 className="mt-1 text-2xl font-bold">30‑0 · Управление</h1>
            <p className="mt-1 text-sm text-white/55">
              {dashboard.username} · {roleNames[role]}
            </p>
          </div>
          <button
            className="order-3 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            onClick={() =>
              void execute(async () => {
                await api("/api/admin/auth/logout", "POST");
                setDashboard(null);
              })
            }
          >
            Выйти
          </button>
        </header>
        <div className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-[#101814] p-3 lg:sticky lg:top-5">
            <label className="block text-sm text-white/60 lg:hidden">
              Раздел админки
              <select
                className={`${input} mt-2 w-full`}
                value={tabs.some(([id]) => id === tab) ? tab : "overview"}
                onChange={(e) => {
                  window.location.hash = e.target.value;
                }}
              >
                {tabs.map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
            <nav
              aria-label="Разделы админки"
              className="hidden space-y-5 lg:block"
            >
              {[
                ["Продукт", ["overview", "users", "games", "leaderboard"]],
                ["База игры", ["players", "rosters", "one-club"]],
                ["Вовлечение", ["challenges", "campaigns"]],
                ["Управление", ["moderation", "access", "settings"]],
              ].map(([group, ids]) => (
                <div key={String(group)}>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                    {group}
                  </p>
                  <div className="space-y-1">
                    {tabs
                      .filter(([id]) => (ids as string[]).includes(id))
                      .map(([id, title]) => (
                        <a
                          key={id}
                          href={`#${id}`}
                          aria-current={tab === id ? "page" : undefined}
                          className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${tab === id ? "bg-emerald-400/15 font-semibold text-emerald-200" : "text-white/65 hover:bg-white/5 hover:text-white"}`}
                        >
                          {title}
                        </a>
                      ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
          <div className="min-w-0 space-y-5">
            {!tabs.some(([id]) => id === tab) && (
              <p className={panel}>
                Раздел недоступен.{" "}
                <a href="#overview" className="text-emerald-300">
                  Перейти к обзору
                </a>
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-sm text-emerald-200"
              >
                {notice}
              </p>
            )}
            {tab === "overview" && <AdminOverview />}
            {["users", "games"].includes(tab) && (
              <AdminInsights key={tab} section={tab as "users" | "games"} />
            )}
            {tab === "players" && (
              <AdminPlayers
                editable={canAlias}
                canMerge={canManage}
                initialPlayerId={entityId}
              />
            )}
            {tab === "rosters" && canManage && (
              <AdminRosterManager onChanged={() => void load()} />
            )}
            {tab === "one-club" && canManage && <AdminOneClub />}
            {tab === "challenges" && canManage && <AdminChallenges />}
            {tab === "access" && canManage && (
              <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
                <section className={`${panel} h-fit`}>
                  <h2 className="text-lg font-semibold">Добавить сотрудника</h2>
                  <form
                    className="mt-4 space-y-3"
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault();
                      void execute(async () => {
                        const created = await api<{
                          temporaryPassword: string;
                        }>("/api/admin/access", "POST", {
                          username: newUsername,
                          role: newRole,
                        });
                        setIssuedPassword(created.temporaryPassword);
                        setNewUsername("");
                        setAccounts(
                          (
                            await api<{ accounts: Account[] }>(
                              "/api/admin/access",
                            )
                          ).accounts,
                        );
                      });
                    }}
                  >
                    <label className="block text-sm">
                      Логин
                      <input
                        required
                        minLength={3}
                        maxLength={50}
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className={`${input} mt-1 w-full`}
                      />
                    </label>
                    <label className="block text-sm">
                      Роль
                      <select
                        className={`${input} mt-1 w-full`}
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as Role)}
                      >
                        <option value="viewer">Просмотр</option>
                        <option value="moderator">Модератор</option>
                        {role === "owner" && (
                          <option value="admin">Администратор</option>
                        )}
                      </select>
                    </label>
                    <button disabled={busy} className={action}>
                      Создать доступ
                    </button>
                  </form>
                  {issuedPassword && (
                    <div className="mt-4 rounded-lg border border-amber-400/40 p-3 text-sm">
                      <strong>Временный пароль (показывается один раз):</strong>
                      <code className="mt-2 block break-all text-amber-200">
                        {issuedPassword}
                      </code>
                      <button
                        onClick={() =>
                          void navigator.clipboard.writeText(issuedPassword)
                        }
                        className="mt-2 underline"
                      >
                        Скопировать
                      </button>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-white/50">
                    При первом входе сотрудник задаст свой пароль.
                  </p>
                </section>
                <section className={panel}>
                  <h2 className="text-lg font-semibold">Права доступа</h2>
                  <p className="mt-1 text-xs text-white/50">
                    Просмотр — статистика и игроки; модератор — также псевдонимы
                    и модерация пользователей; администратор — также составы,
                    рассылки и доступ сотрудников; владелец — общий сброс.
                  </p>
                  <div className="mt-4 space-y-2">
                    {accounts.map((account) => (
                      <div
                        key={account.username}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 p-3 text-sm"
                      >
                        <div className="min-w-32 flex-1">
                          <strong>{account.username}</strong>
                          {account.mustChangePassword && (
                            <p className="text-xs text-amber-200">
                              Ожидает смены пароля
                            </p>
                          )}
                        </div>
                        {account.role === "owner" ? (
                          <span>Владелец</span>
                        ) : (
                          <>
                            <select
                              aria-label={`Роль ${account.username}`}
                              className={input}
                              value={account.role}
                              disabled={
                                busy ||
                                (role !== "owner" && account.role === "admin")
                              }
                              onChange={(e) =>
                                void execute(async () => {
                                  await api("/api/admin/access", "PATCH", {
                                    username: account.username,
                                    role: e.target.value,
                                  });
                                  setAccounts(
                                    (
                                      await api<{ accounts: Account[] }>(
                                        "/api/admin/access",
                                      )
                                    ).accounts,
                                  );
                                })
                              }
                            >
                              <option value="viewer">Просмотр</option>
                              <option value="moderator">Модератор</option>
                              {role === "owner" && (
                                <option value="admin">Администратор</option>
                              )}
                            </select>
                            <button
                              disabled={
                                busy ||
                                (role !== "owner" && account.role === "admin")
                              }
                              onClick={() => {
                                if (
                                  window.confirm(
                                    translateClient(
                                      `Удалить доступ ${account.username}?`,
                                    ),
                                  )
                                )
                                  void execute(async () => {
                                    await api("/api/admin/access", "DELETE", {
                                      username: account.username,
                                    });
                                    setAccounts(
                                      (
                                        await api<{ accounts: Account[] }>(
                                          "/api/admin/access",
                                        )
                                      ).accounts,
                                    );
                                  });
                              }}
                              className="rounded border border-red-700/60 px-3 py-2 text-red-200"
                            >
                              Удалить
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
            {tab === "campaigns" && canManage && <AdminCampaigns />}
            {tab === "moderation" && (
              <AdminModeration
                editable={role !== "viewer"}
                initialUserId={entityId}
              />
            )}
            {tab === "leaderboard" && <AdminLeaderboard />}
            {tab === "settings" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <section className={panel}>
                  <h2 className="text-lg font-semibold">
                    Изменить свой пароль
                  </h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void execute(async () => {
                        await api("/api/admin/auth/password", "PATCH", {
                          currentPassword,
                          newPassword,
                        });
                        setCurrentPassword("");
                        setNewPassword("");
                        setNotice("Пароль обновлён. Старые сеансы завершены.");
                      });
                    }}
                    className="mt-4 space-y-3"
                  >
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      className={`${input} block w-full`}
                      placeholder="Текущий пароль"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <input
                      required
                      type="password"
                      minLength={16}
                      autoComplete="new-password"
                      className={`${input} block w-full`}
                      placeholder="Новый пароль (от 16 символов)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button disabled={busy} className={action}>
                      Сменить пароль
                    </button>
                  </form>
                </section>
                {role === "owner" && (
                  <details className={`${panel} border-red-500/30`}>
                    <summary className="cursor-pointer text-lg font-semibold text-red-200">
                      Сброс прогресса всех пользователей
                    </summary>
                    <p className="mt-2 text-sm text-white/60">
                      Удалит все игры и историю сезонов, очистит статистику и
                      достижения в профилях. Учётные записи и приглашения
                      сохранятся. Действие необратимо.
                    </p>
                    <label className="mt-4 block text-sm">
                      Для подтверждения введи «СБРОСИТЬ ПРОГРЕСС ВСЕХ»
                      <input
                        className={`${input} mt-2 w-full`}
                        value={resetPhrase}
                        onChange={(e) => setResetPhrase(e.target.value)}
                      />
                    </label>
                    <button
                      disabled={
                        busy || resetPhrase !== "СБРОСИТЬ ПРОГРЕСС ВСЕХ"
                      }
                      className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                      onClick={() => {
                        if (
                          window.confirm(
                            translateClient(
                              "Точно удалить прогресс всех пользователей?",
                            ),
                          )
                        )
                          void execute(async () => {
                            const result = await api<{ runsRemoved: number }>(
                              "/api/admin/progress",
                              "POST",
                              { confirm: resetPhrase },
                            );
                            setResetPhrase("");
                            setNotice(
                              `Прогресс сброшен: удалено игр ${result.runsRemoved}.`,
                            );
                            await load();
                          });
                      }}
                    >
                      Сбросить прогресс
                    </button>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
