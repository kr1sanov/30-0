export const ADMIN_OWNER_TELEGRAM_ID = '361912433';
export const ADMIN_OWNER_TELEGRAM_USERNAME = 'kr1sanov';

/** The Telegram ID is stable; require the configured username as a second identity check. */
export function isAdminOwnerTelegramIdentity(id: string, username: string | undefined): boolean {
  return id === ADMIN_OWNER_TELEGRAM_ID
    && typeof username === 'string'
    && username.replace(/^@/, '').toLowerCase() === ADMIN_OWNER_TELEGRAM_USERNAME;
}
