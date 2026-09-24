const TELEGRAM_OAUTH_ORIGIN = 'https://oauth.telegram.org';

/** Add the application origin to Telegram SDK popup URLs, which the current SDK omits. */
export function addTelegramLoginOrigin(authUrl: string | URL, origin: string): string {
  const url = new URL(authUrl);
  const appOrigin = new URL(origin);
  const localHttp = appOrigin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(appOrigin.hostname);

  if (url.origin !== TELEGRAM_OAUTH_ORIGIN || url.pathname !== '/auth') {
    throw new Error('Unexpected Telegram login URL');
  }
  if ((!localHttp && appOrigin.protocol !== 'https:') || appOrigin.origin !== origin) {
    throw new Error('Telegram login requires a secure application origin');
  }

  url.searchParams.set('origin', appOrigin.origin);
  return url.toString();
}
