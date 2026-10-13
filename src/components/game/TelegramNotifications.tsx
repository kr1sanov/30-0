"use client";
import { Bell, ArrowUpRight } from "lucide-react";
import { useUiTranslation } from "@/hooks/use-ui-translation";
export default function TelegramNotifications() {
  const t = useUiTranslation();
  return (
    <section
      data-no-translate
      className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5"
    >
      <h3 className="font-bold text-white">{t("Уведомления Telegram")}</h3>
      <p className="mt-1 text-sm text-slate-400">
        {t("Выбери нужные уведомления и язык сообщений в боте.")}
      </p>
      <a
        href="https://t.me/RPL30_bot?start=notifications"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-500/40 px-4 text-sm font-semibold text-sky-300 hover:bg-sky-500/10"
      >
        <Bell className="h-4 w-4" />
        {t("Настройки уведомлений")}
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </section>
  );
}
