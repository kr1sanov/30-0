'use client';

import { useState } from 'react';

export default function TelegramAvatar({ id, name, size = 56 }: { id?: string | null; name?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initial = name?.trim().charAt(0).toLocaleUpperCase() || '⚽';
  return <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#00C896]/60 bg-[#0b3e37] font-bold text-white" style={{ width: size, height: size, fontSize: size * .42 }}>
    {id && !failed ? <img src={`/api/social/players/${encodeURIComponent(id)}/photo`} alt={name ? `Фото Telegram: ${name}` : 'Фото Telegram'} width={size} height={size} className="h-full w-full object-cover" onError={() => setFailed(true)} /> : initial}
  </span>;
}
