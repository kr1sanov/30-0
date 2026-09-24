type TelegramLoginPopupOptions = {
  clientId: string;
  origin: string;
  redirectUri: string;
  nonce: string;
  lang?: string;
};

/** Build the Telegram Login SDK popup request, including its required origin parameter. */
export function createTelegramLoginPopupUrl({ clientId, origin, redirectUri, nonce, lang = 'ru' }: TelegramLoginPopupOptions): string {
  const appOrigin = new URL(origin);
  const callback = new URL(redirectUri);
  const localHttp = appOrigin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(appOrigin.hostname);

  if ((!localHttp && appOrigin.protocol !== 'https:') || appOrigin.origin !== origin) {
    throw new Error('Telegram login requires a secure application origin');
  }
  if (callback.origin !== appOrigin.origin || !/^\d+$/.test(clientId) || nonce.length < 32) {
    throw new Error('Invalid Telegram login parameters');
  }

  const authUrl = new URL('https://oauth.telegram.org/auth');
  authUrl.searchParams.set('response_type', 'post_message');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callback.origin + callback.pathname);
  authUrl.searchParams.set('scope', 'openid profile');
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('lang', lang);
  // The official popup SDK omits origin from this request; Telegram answers with "origin required".
  authUrl.searchParams.set('origin', appOrigin.origin);
  return authUrl.toString();
}
