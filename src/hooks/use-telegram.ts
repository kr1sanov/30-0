'use client';

import { useCallback, useEffect, useState } from 'react';

type Inset = { top: number; bottom: number; left: number; right: number };
type Button = {
  setText?: (text: string) => void; onClick?: (handler: () => void) => void;
  offClick?: (handler: () => void) => void; show?: () => void; hide?: () => void;
  enable?: () => void; disable?: () => void;
};
type WebApp = {
  initData?: string; ready?: () => void; expand?: () => void;
  setHeaderColor?: (color: string) => void; setBackgroundColor?: (color: string) => void;
  safeAreaInset?: Inset; contentSafeAreaInset?: Inset;
  BackButton?: Button; MainButton?: Button; SecondaryButton?: Button;
  HapticFeedback?: {
    impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred?: (type: 'success' | 'error' | 'warning') => void;
    selectionChanged?: () => void;
  };
  showAlert?: (message: string, callback?: () => void) => void;
  showConfirm?: (message: string, callback: (confirmed: boolean) => void) => void;
  openTelegramLink?: (url: string) => void;
  enableClosingConfirmation?: () => void; disableClosingConfirmation?: () => void;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
};

export function telegramWebApp(): WebApp | null {
  if (typeof window === 'undefined') return null;
  const app = (window as Window & { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp;
  // The SDK exists in browsers too; signed initData signals a Mini App launch.
  return app?.initData ? app : null;
}

const emptyInset: Inset = { top: 0, bottom: 0, left: 0, right: 0 };

export function TelegramAppSetup() {
  useEffect(() => {
    const app = telegramWebApp();
    if (!app) return;
    app.ready?.();
    app.expand?.();
    app.setHeaderColor?.('#0A0A0A');
    app.setBackgroundColor?.('#0A0A0A');
    const updateInset = () => {
      const inset = app.contentSafeAreaInset ?? app.safeAreaInset ?? emptyInset;
      for (const side of ['top', 'bottom', 'left', 'right'] as const)
        document.documentElement.style.setProperty(`--tg-content-safe-${side}`, `${Math.max(0, inset[side] || 0)}px`);
    };
    updateInset();
    app.onEvent?.('contentSafeAreaChanged', updateInset);
    app.onEvent?.('safeAreaChanged', updateInset);
    return () => {
      app.offEvent?.('contentSafeAreaChanged', updateInset);
      app.offEvent?.('safeAreaChanged', updateInset);
    };
  }, []);
  return null;
}

export function useTelegram() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [safeAreaInset, setSafeAreaInset] = useState<Inset>(emptyInset);
  useEffect(() => {
    const app = telegramWebApp();
    setIsTelegram(Boolean(app));
    if (app) setSafeAreaInset(app.contentSafeAreaInset ?? app.safeAreaInset ?? emptyInset);
  }, []);
  const haptic = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') =>
    telegramWebApp()?.HapticFeedback?.impactOccurred?.(style), []);
  const notify = useCallback((type: 'success' | 'error' | 'warning') =>
    telegramWebApp()?.HapticFeedback?.notificationOccurred?.(type), []);
  const selectionChanged = useCallback(() => telegramWebApp()?.HapticFeedback?.selectionChanged?.(), []);
  const showAlert = useCallback((message: string): Promise<void> => new Promise(resolve => {
    const app = telegramWebApp();
    if (app?.showAlert) app.showAlert(message, resolve);
    else { window.alert(message); resolve(); }
  }), []);
  const showConfirm = useCallback((message: string): Promise<boolean> => new Promise(resolve => {
    const app = telegramWebApp();
    if (app?.showConfirm) app.showConfirm(message, resolve);
    else resolve(window.confirm(message));
  }), []);
  const shareToTelegram = useCallback((message: string, url?: string) => {
    const link = `https://t.me/share/url?url=${encodeURIComponent(url || location.href)}&text=${encodeURIComponent(message)}`;
    const app = telegramWebApp();
    if (app?.openTelegramLink) app.openTelegramLink(link);
    else window.open(link, '_blank', 'noopener,noreferrer');
  }, []);
  const showBackButton = useCallback((handler: () => void) => {
    const button = telegramWebApp()?.BackButton;
    button?.onClick?.(handler); button?.show?.();
  }, []);
  const hideBackButton = useCallback((handler?: () => void) => {
    const button = telegramWebApp()?.BackButton;
    if (handler) button?.offClick?.(handler);
    button?.hide?.();
  }, []);
  const showButton = useCallback((which: 'MainButton' | 'SecondaryButton', handler: () => void) => {
    const button = telegramWebApp()?.[which];
    button?.onClick?.(handler); button?.show?.();
  }, []);
  const hideButton = useCallback((which: 'MainButton' | 'SecondaryButton', handler?: () => void) => {
    const button = telegramWebApp()?.[which];
    if (handler) button?.offClick?.(handler);
    button?.hide?.();
  }, []);
  const updateMainButton = useCallback((opts: Record<string, unknown>) => {
    const button = telegramWebApp()?.MainButton;
    if (typeof opts.text === 'string') button?.setText?.(opts.text);
    if (opts.disabled === true) button?.disable?.();
    else if (opts.disabled === false) button?.enable?.();
  }, []);
  return {
    isTelegram, safeAreaInset, haptic, notify, selectionChanged, showAlert, showConfirm, shareToTelegram,
    showBackButton, hideBackButton,
    showMainButton: (handler: () => void) => showButton('MainButton', handler),
    hideMainButton: (handler?: () => void) => hideButton('MainButton', handler),
    updateMainButton,
    showSecondaryButton: (handler: () => void) => showButton('SecondaryButton', handler),
    hideSecondaryButton: (handler?: () => void) => hideButton('SecondaryButton', handler),
    enableClosingConfirmation: () => telegramWebApp()?.enableClosingConfirmation?.(),
    disableClosingConfirmation: () => telegramWebApp()?.disableClosingConfirmation?.(),
  };
}
