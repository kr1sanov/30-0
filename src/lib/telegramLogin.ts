const TELEGRAM_OIDC_ORIGIN = 'https://oauth.telegram.org';

export type TelegramLoginResult = {
  id_token?: string;
  error?: string;
};

type TelegramLoginOptions = {
  clientId: number;
  nonce: string;
  origin: string;
  pathname: string;
  lang?: string;
};

export function buildTelegramLoginUrl({
  clientId,
  nonce,
  origin,
  pathname,
  lang = 'ru',
}: TelegramLoginOptions) {
  const url = new URL('/auth', TELEGRAM_OIDC_ORIGIN);
  url.searchParams.set('response_type', 'post_message');
  url.searchParams.set('client_id', String(clientId));
  url.searchParams.set('redirect_uri', `${origin}${pathname}`);
  url.searchParams.set('origin', origin);
  url.searchParams.set('scope', 'openid profile');
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('lang', lang);
  return url.toString();
}

export function openTelegramLogin(
  options: Omit<TelegramLoginOptions, 'origin' | 'pathname'>,
  callback: (result: TelegramLoginResult) => void,
) {
  const authUrl = buildTelegramLoginUrl({
    ...options,
    origin: window.location.origin,
    pathname: window.location.pathname,
  });
  const width = 550;
  const height = 650;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);
  const features = `width=${width},height=${height},left=${left},top=${top},status=0,location=0,menubar=0,toolbar=0`;
  let popup: Window | null = null;
  let closeTimer: number | undefined;
  let finished = false;

  const cleanup = () => {
    window.removeEventListener('message', handleMessage);
    if (closeTimer !== undefined) window.clearTimeout(closeTimer);
  };

  const finish = (result: TelegramLoginResult) => {
    if (finished) return;
    finished = true;
    cleanup();
    callback(result);
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== TELEGRAM_OIDC_ORIGIN || event.source !== popup) return;
    let data: unknown = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return; }
    }
    if (!data || typeof data !== 'object' || !('event' in data) || data.event !== 'auth_result') return;
    const payload = data as { result?: unknown; error?: unknown };
    if (typeof payload.result === 'string') finish({ id_token: payload.result });
    else finish({ error: typeof payload.error === 'string' ? payload.error : 'missing_id_token' });
  };

  window.addEventListener('message', handleMessage);
  popup = window.open(authUrl, 'telegram_oidc_login', features);
  if (!popup) {
    finish({ error: 'popup_blocked' });
    return cleanup;
  }
  popup.focus();

  const checkClosed = () => {
    if (finished) return;
    if (!popup || popup.closed) {
      finish({ error: 'popup_closed' });
      return;
    }
    closeTimer = window.setTimeout(checkClosed, 200);
  };
  closeTimer = window.setTimeout(checkClosed, 200);
  return cleanup;
}
