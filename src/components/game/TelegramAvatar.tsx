export default function TelegramAvatar({ username, name, color = '#00C896', size = 56 }: { username?: string | null; name?: string | null; color?: string; size?: number }) {
  const initial = (username?.replace(/^@/, '') || name?.replace(/^@/, '') || '?').charAt(0).toLocaleUpperCase();
  return <span aria-label={username ? `@${username}` : name || 'Игрок'} className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 font-black text-white shadow-md" style={{ width: size, height: size, fontSize: size * .44, backgroundColor: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#00C896' }}>
    {initial}
  </span>;
}
