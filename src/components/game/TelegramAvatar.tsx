"use client";
import { useEffect, useState } from "react";
import { useUiTranslation } from "@/hooks/use-ui-translation";
import { avatarFallback } from "@/lib/avatarFallback";
import { publicAvatarUrl } from "@/lib/avatarUrl";
export default function TelegramAvatar({
  id,
  username,
  name,
  photoUrl,
  size = 56,
}: {
  id?: string;
  username?: string | null;
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
}) {
  const t = useUiTranslation();
  const fallback = avatarFallback(id || username || name || "player");
  const direct = publicAvatarUrl(photoUrl);
  const proxy = id
    ? `/api/social/players/${encodeURIComponent(id)}/photo`
    : null;
  const [failures, setFailures] = useState<string[]>([]);
  const source = [direct, proxy].find(
    (url): url is string => !!url && !failures.includes(url),
  );
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  useEffect(() => {
    if (!source || source === proxy || loadedSource === source) return;
    const timer = window.setTimeout(() => setFailures(previous => [...previous, source]), 8000);
    return () => window.clearTimeout(timer);
  }, [source, proxy, loadedSource]);
  return (
    <span
      role="img"
      aria-label={username ? `@${username.replace(/^@/, "")}` : name || t("Игрок")}
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-slate-700 font-bold text-white"
      style={{ width: size, height: size, background: `linear-gradient(145deg, ${fallback.primary}, ${fallback.secondary})` }}
    >
      <svg aria-hidden="true" viewBox="0 0 64 64" className="h-full w-full text-white/85">
        <circle cx="32" cy="24" r="11" fill="currentColor" />
        <path d="M10 64v-7c0-13 9-21 22-21s22 8 22 21v7" fill="currentColor" />
      </svg>
      {source && (
        <img
          key={source}
          src={source}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSource(source)}
          onError={() => setFailures((previous) => [...previous, source])}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${loadedSource === source ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
