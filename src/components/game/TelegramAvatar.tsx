"use client";
import { useState } from "react";
export default function TelegramAvatar({
  id,
  username,
  name,
  size = 56,
}: {
  id?: string;
  username?: string | null;
  name?: string | null;
  color?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (username?.replace(/^@/, "") || name || "?")
    .charAt(0)
    .toLocaleUpperCase();
  return (
    <span
      aria-label={username ? `@${username}` : name || "Player"}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-slate-700 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      {id && !failed ? (
        <img
          key={id}
          src={`/api/social/players/${encodeURIComponent(id)}/photo`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
