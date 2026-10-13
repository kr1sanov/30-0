/** Only public provider image URLs may be exposed or fetched for avatars. */
export function publicAvatarUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed =
      host === "t.me" ||
      host === "telegram.org" ||
      host.endsWith(".telegram.org") ||
      host === "telesco.pe" ||
      host.endsWith(".telesco.pe") ||
      host === "telegram-cdn.org" ||
      host.endsWith(".telegram-cdn.org") ||
      host === "avatars.yandex.net" ||
      host.endsWith(".userapi.com");
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      allowed
      ? url.href
      : null;
  } catch {
    return null;
  }
}
