"use client";
import { useState } from "react";
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
  const direct = publicAvatarUrl(photoUrl);
  const proxy = id
    ? `/api/social/players/${encodeURIComponent(id)}/photo`
    : null;
  const [failures, setFailures] = useState<string[]>([]);
  const source = [direct, proxy].find(
    (url): url is string => !!url && !failures.includes(url),
  );
  const initial = (username?.replace(/^@/, "") || name || "?")
    .charAt(0)
    .toLocaleUpperCase();
  return (
    <span
      aria-label={username ? `@${username}` : name || "Игрок"}
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-slate-700 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      {initial}
      {source && (
        <img
          key={source}
          src={source}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailures((previous) => [...previous, source])}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}
