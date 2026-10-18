export const MINI_APP_URL = 'https://t.me/RPL30_bot?startapp';

export function miniAppLink(startParam?: string | null) {
  return startParam ? `${MINI_APP_URL}=${encodeURIComponent(startParam)}` : MINI_APP_URL;
}
