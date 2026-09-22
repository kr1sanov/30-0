export type TelegramLoginData = Record<string, unknown> & {
  id: string | number;
  first_name: string;
  auth_date: string | number;
  hash: string;
};

/** Minimal client-side shape check. The server still verifies Telegram's HMAC. */
export function isTelegramLoginData(value: unknown): value is TelegramLoginData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return /^[1-9][0-9]{0,15}$/.test(String(data.id ?? ''))
    && typeof data.first_name === 'string'
    && data.first_name.length <= 256
    && Number.isSafeInteger(Number(data.auth_date))
    && /^[a-f0-9]{64}$/i.test(String(data.hash ?? ''));
}
