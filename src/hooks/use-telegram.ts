'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// =============================================================================
// Telegram Mini Apps SDK — Comprehensive Type Declarations
// Based on https://core.telegram.org/bots/webapps
// =============================================================================

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
}

interface Chat {
  id: number;
  type: 'group' | 'supergroup' | 'private';
  title?: string;
  username?: string;
  photo_url?: string;
}

interface ChatMember {
  user: TelegramUser;
  status: 'owner' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
  is_anonymous?: boolean;
  can_be_edited?: boolean;
  custom_title?: string;
}

interface InitDataUnsafe {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: Chat;
  chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date?: number;
  hash?: string;
}

interface ThemeParams {
  bg_color?: string;
  secondary_bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_text_color?: string;
  [key: string]: string | undefined;
}

interface SafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ContentSafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ViewportData {
  height: number;
  width: number;
  is_state_stable: boolean;
  is_expanded: boolean;
}

interface PopupButton {
  type: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
  id?: string;
  text?: string;
}

interface PopupParams {
  title?: string;
  message: string;
  buttons?: PopupButton[];
}

interface SecondaryButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isProgressVisible: boolean;
  isActive: boolean;
  setText: (text: string) => SecondaryButton;
  show: () => SecondaryButton;
  hide: () => SecondaryButton;
  enable: () => SecondaryButton;
  disable: () => SecondaryButton;
  showProgress: (leaveActive?: boolean) => SecondaryButton;
  hideProgress: () => SecondaryButton;
  onClick: (callback: () => void) => SecondaryButton;
  offClick: (callback: () => void) => SecondaryButton;
}

interface MainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isProgressVisible: boolean;
  isActive: boolean;
  setText: (text: string) => MainButton;
  show: () => MainButton;
  hide: () => MainButton;
  enable: () => MainButton;
  disable: () => MainButton;
  showProgress: (leaveActive?: boolean) => MainButton;
  hideProgress: () => MainButton;
  onClick: (callback: () => void) => MainButton;
  offClick: (callback: () => void) => MainButton;
  setParams: (params: {
    text?: string;
    color?: string;
    textColor?: string;
    isActive?: boolean;
    isProgressVisible?: boolean;
  }) => MainButton;
}

interface BackButton {
  isVisible: boolean;
  show: () => BackButton;
  hide: () => BackButton;
  onClick: (callback: () => void) => BackButton;
  offClick: (callback: () => void) => BackButton;
}

interface SettingsButton {
  isVisible: boolean;
  show: () => SettingsButton;
  hide: () => SettingsButton;
  onClick: (callback: () => void) => SettingsButton;
  offClick: (callback: () => void) => SettingsButton;
}

interface HapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

interface ClosingBehaviour {
  isClosingConfirmationEnabled: boolean;
  enableClosingConfirmation: () => ClosingBehaviour;
  disableClosingConfirmation: () => ClosingBehaviour;
}

interface CloudStorage {
  setItem: (key: string, value: string, callback?: (error?: Error) => void) => void;
  getItem: (key: string, callback: (error: Error | null, value: string | null) => void) => void;
  getKeys: (callback: (error: Error | null, keys: string[]) => void) => void;
  removeItem: (key: string, callback?: (error?: Error) => void) => void;
}

interface BiometricManager {
  isInited: boolean;
  isBiometricAvailable: boolean;
  biometricType: 'finger' | 'face' | 'unknown';
  isAccessRequested: boolean;
  isAccessGranted: boolean;
  isBiometricTokenSaved: boolean;
  deviceId: string;
  init: (callback?: (inited: boolean) => void) => void;
  requestAccess: (params: { reason?: string }, callback?: (granted: boolean) => void) => void;
  authenticate: (params: { reason?: string; biometricToken?: string }, callback?: (authenticated: boolean) => void) => void;
  updateBiometricToken: (token: string, callback?: (updated: boolean) => void) => void;
  openSettings: () => void;
}

interface WebApp {
  // Identity
  initData: string;
  initDataUnsafe: InitDataUnsafe;

  // Version & platform
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  isClosingConfirmationEnabled: boolean;

  // Layout
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  bottomBarColor: string;
  isVerticalSwipesEnabled: boolean;

  // Safe area
  safeAreaInset: SafeAreaInset;
  contentSafeAreaInset: ContentSafeAreaInset;

  // Buttons
  MainButton: MainButton;
  SecondaryButton: SecondaryButton;
  BackButton: BackButton;
  SettingsButton: SettingsButton;

  // Features
  HapticFeedback: HapticFeedback;
  ClosingBehaviour: ClosingBehaviour;
  CloudStorage: CloudStorage;
  BiometricManager: BiometricManager;

  // Methods
  ready: () => void;
  expand: () => void;
  close: () => void;

  // Theme
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor: (color: string) => void;

  // Closing
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;

  // Swipes
  enableVerticalSwipes: () => void;
  disableVerticalSwipes: () => void;

  // Fullscreen
  requestFullscreen: (callback?: (error?: Error) => void) => void;
  exitFullscreen: (callback?: (error?: Error) => void) => void;

  // Home screen
  addToHomeScreen: () => void;
  checkHomeScreenStatus: (callback: (status: 'unsupported' | 'unknown' | 'added' | 'missed') => void) => void;

  // Alerts & Popups
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showPopup: (params: PopupParams, callback?: (buttonId: string) => void) => void;

  // Links
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;

  // Sharing
  switchInlineQuery: (query: string, choose_chat_types?: Array<'users' | 'bots' | 'groups' | 'channels'>) => void;

  // Events
  onEvent: (eventType: string, callback: (...args: unknown[]) => void) => void;
  offEvent: (eventType: string, callback: (...args: unknown[]) => void) => void;

  // Data
  sendData: (data: string) => void;

  // Read text from clipboard
  readTextFromClipboard: (callback: (text: string | null) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

// =============================================================================
// Event types for typed event listeners
// =============================================================================

type TelegramEventType =
  | 'themeChanged'
  | 'viewportChanged'
  | 'mainButtonClicked'
  | 'secondaryButtonClicked'
  | 'backButtonClicked'
  | 'settingsButtonClicked'
  | 'invoiceClosed'
  | 'popupClosed'
  | 'qrTextReceived'
  | 'clipboardTextReceived'
  | 'writeAccessRequested'
  | 'contactRequested'
  | 'biometricManagerInited'
  | 'biometricAuthRequested'
  | 'biometricAccessRequested'
  | 'safeAreaChanged'
  | 'contentSafeAreaChanged'
  | 'fullscreenChanged'
  | 'homeScreenChanged'
  | 'fullscreenError'
  | 'activated'
  | 'deactivated'
  | 'closingConfirmationHidden';

// =============================================================================
// Hook return type
// =============================================================================

export interface UseTelegramReturn {
  // State
  isReady: boolean;
  isTelegram: boolean;
  isExpanded: boolean;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  safeAreaInset: SafeAreaInset;
  contentSafeAreaInset: ContentSafeAreaInset;
  viewportHeight: number;
  platform: string;
  version: string;

  // User info
  user: TelegramUser | undefined;
  startParam: string | undefined;
  chat: Chat | undefined;
  chatType: string | undefined;

  // Haptic feedback
  haptic: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notify: (type: 'success' | 'warning' | 'error') => void;
  selectionChanged: () => void;

  // MainButton
  showMainButton: (text: string, onClick: () => void, options?: { color?: string; textColor?: string }) => void;
  hideMainButton: () => void;
  updateMainButton: (text?: string, options?: { isActive?: boolean; showProgress?: boolean; color?: string; textColor?: string }) => void;

  // SecondaryButton
  showSecondaryButton: (text: string, onClick: () => void) => void;
  hideSecondaryButton: () => void;

  // BackButton
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;

  // Closing behaviour
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;

  // Fullscreen
  requestFullscreen: () => void;
  exitFullscreen: () => void;

  // Alerts & Popups
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  showPopup: (params: PopupParams) => Promise<string>;

  // Sharing
  shareToTelegram: (text: string, url?: string) => void;
  switchInlineQuery: (query: string, chooseChatTypes?: Array<'users' | 'bots' | 'groups' | 'channels'>) => void;

  // Links
  openLink: (url: string, options?: { tryInstantView?: boolean }) => void;
  openTelegramLink: (url: string) => void;

  // CloudStorage
  cloudStorageSetItem: (key: string, value: string) => Promise<void>;
  cloudStorageGetItem: (key: string) => Promise<string | null>;
  cloudStorageGetKeys: () => Promise<string[]>;
  cloudStorageRemoveItem: (key: string) => Promise<void>;

  // Home screen
  addToHomeScreen: () => void;
  checkHomeScreenStatus: () => Promise<string>;

  // Events
  onTelegramEvent: (eventType: TelegramEventType, callback: (...args: unknown[]) => void) => void;
  offTelegramEvent: (eventType: TelegramEventType, callback: (...args: unknown[]) => void) => void;

  // Clipboard
  readTextFromClipboard: () => Promise<string | null>;
}

// =============================================================================
// useTelegram Hook
// =============================================================================

export function useTelegram(): UseTelegramReturn {
  const [isReady, setIsReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const [themeParams, setThemeParams] = useState<ThemeParams>({});
  const [safeAreaInset, setSafeAreaInset] = useState<SafeAreaInset>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState<ContentSafeAreaInset>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [viewportHeight, setViewportHeight] = useState(0);
  const [platform, setPlatform] = useState('');
  const [version, setVersion] = useState('');

  // Ref to track cleanup callbacks for button onClick handlers
  const mainButtonClickRef = useRef<(() => void) | null>(null);
  const secondaryButtonClickRef = useRef<(() => void) | null>(null);
  const backButtonClickRef = useRef<(() => void) | null>(null);

  // Get user info lazily
  const user = typeof window !== 'undefined'
    ? window.Telegram?.WebApp?.initDataUnsafe?.user
    : undefined;

  const isTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;

  const startParam = typeof window !== 'undefined'
    ? window.Telegram?.WebApp?.initDataUnsafe?.start_param
    : undefined;

  const chat = typeof window !== 'undefined'
    ? window.Telegram?.WebApp?.initDataUnsafe?.chat
    : undefined;

  const chatType = typeof window !== 'undefined'
    ? window.Telegram?.WebApp?.initDataUnsafe?.chat_type
    : undefined;

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tg = window.Telegram?.WebApp;
    if (!tg) {
      // Mark ready even outside Telegram so app can function
      Promise.resolve().then(() => setIsReady(true));
      return;
    }

    // Initialize
    tg.ready();
    tg.expand();

    // Set dark theme colors to match app
    try {
      tg.setHeaderColor('#0A0A0A');
      tg.setBackgroundColor('#0A0A0A');
      if (tg.setBottomBarColor) {
        tg.setBottomBarColor('#0A0A0A');
      }
    } catch {
      // Some versions may not support these
    }

    // Read initial state (using microtask to avoid synchronous setState in effect)
    const initialState = {
      expanded: tg.isExpanded ?? false,
      colorScheme: tg.colorScheme ?? 'dark',
      themeParams: tg.themeParams ?? {},
      safeArea: tg.safeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 },
      contentSafeArea: tg.contentSafeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 },
      viewportHeight: tg.viewportHeight ?? 0,
      platform: tg.platform ?? '',
      version: tg.version ?? '',
    };

    Promise.resolve().then(() => {
      setIsExpanded(initialState.expanded);
      setColorScheme(initialState.colorScheme);
      setThemeParams(initialState.themeParams);
      setSafeAreaInset(initialState.safeArea);
      setContentSafeAreaInset(initialState.contentSafeArea);
      setViewportHeight(initialState.viewportHeight);
      setPlatform(initialState.platform);
      setVersion(initialState.version);
    });

    // ── Event Listeners ──

    // Theme changes
    const handleThemeChanged = () => {
      setColorScheme(tg.colorScheme ?? 'dark');
      setThemeParams(tg.themeParams ?? {});
      // Re-apply dark theme colors when Telegram theme changes
      try {
        tg.setHeaderColor('#0A0A0A');
        tg.setBackgroundColor('#0A0A0A');
        if (tg.setBottomBarColor) {
          tg.setBottomBarColor('#0A0A0A');
        }
      } catch {
        // noop
      }
    };
    tg.onEvent('themeChanged', handleThemeChanged);

    // Viewport changes
    const handleViewportChanged = () => {
      setViewportHeight(tg.viewportHeight ?? 0);
      setIsExpanded(tg.isExpanded ?? false);
    };
    tg.onEvent('viewportChanged', handleViewportChanged);

    // Safe area changes
    const handleSafeAreaChanged = () => {
      setSafeAreaInset(tg.safeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 });
    };
    tg.onEvent('safeAreaChanged', handleSafeAreaChanged);

    // Content safe area changes
    const handleContentSafeAreaChanged = () => {
      setContentSafeAreaInset(tg.contentSafeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 });
    };
    tg.onEvent('contentSafeAreaChanged', handleContentSafeAreaChanged);

    // Fullscreen changes
    const handleFullscreenChanged = () => {
      // Could add fullscreen state tracking here if needed
    };
    tg.onEvent('fullscreenChanged', handleFullscreenChanged);

    // Mark ready
    Promise.resolve().then(() => setIsReady(true));

    // Cleanup
    return () => {
      tg.offEvent('themeChanged', handleThemeChanged);
      tg.offEvent('viewportChanged', handleViewportChanged);
      tg.offEvent('safeAreaChanged', handleSafeAreaChanged);
      tg.offEvent('contentSafeAreaChanged', handleContentSafeAreaChanged);
      tg.offEvent('fullscreenChanged', handleFullscreenChanged);
      // Hide buttons on unmount
      try {
        tg.MainButton?.hide();
        tg.SecondaryButton?.hide();
        tg.BackButton?.hide();
      } catch {
        // noop
      }
    };
  }, []);

  // ── Haptic Feedback ──

  const haptic = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  }, []);

  const notify = useCallback((type: 'success' | 'warning' | 'error') => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
  }, []);

  const selectionChanged = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  }, []);

  // ── MainButton ──

  const showMainButton = useCallback((text: string, onClick: () => void, options?: { color?: string; textColor?: string }) => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    // Remove previous click handler
    if (mainButtonClickRef.current) {
      tg.MainButton.offClick(mainButtonClickRef.current);
    }

    mainButtonClickRef.current = onClick;
    tg.MainButton.setText(text);
    tg.MainButton.onClick(onClick);

    if (options?.color) {
      tg.MainButton.setParams({ color: options.color });
    }
    if (options?.textColor) {
      tg.MainButton.setParams({ textColor: options.textColor });
    }

    tg.MainButton.show();
  }, []);

  const hideMainButton = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    if (mainButtonClickRef.current) {
      tg.MainButton.offClick(mainButtonClickRef.current);
      mainButtonClickRef.current = null;
    }
    tg.MainButton.hide();
  }, []);

  const updateMainButton = useCallback((text?: string, options?: { isActive?: boolean; showProgress?: boolean; color?: string; textColor?: string }) => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    if (text) tg.MainButton.setText(text);
    if (options) {
      tg.MainButton.setParams({
        ...(options.color !== undefined ? { color: options.color } : {}),
        ...(options.textColor !== undefined ? { textColor: options.textColor } : {}),
        ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
        ...(options.showProgress !== undefined ? { isProgressVisible: options.showProgress } : {}),
      });
    }
  }, []);

  // ── SecondaryButton ──

  const showSecondaryButton = useCallback((text: string, onClick: () => void) => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.SecondaryButton) return;

    // Remove previous click handler
    if (secondaryButtonClickRef.current) {
      tg.SecondaryButton.offClick(secondaryButtonClickRef.current);
    }

    secondaryButtonClickRef.current = onClick;
    tg.SecondaryButton.setText(text);
    tg.SecondaryButton.onClick(onClick);
    tg.SecondaryButton.show();
  }, []);

  const hideSecondaryButton = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.SecondaryButton) return;

    if (secondaryButtonClickRef.current) {
      tg.SecondaryButton.offClick(secondaryButtonClickRef.current);
      secondaryButtonClickRef.current = null;
    }
    tg.SecondaryButton.hide();
  }, []);

  // ── BackButton ──

  const showBackButton = useCallback((onClick: () => void) => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    // Remove previous click handler
    if (backButtonClickRef.current) {
      tg.BackButton.offClick(backButtonClickRef.current);
    }

    backButtonClickRef.current = onClick;
    tg.BackButton.onClick(onClick);
    tg.BackButton.show();
  }, []);

  const hideBackButton = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    if (backButtonClickRef.current) {
      tg.BackButton.offClick(backButtonClickRef.current);
      backButtonClickRef.current = null;
    }
    tg.BackButton.hide();
  }, []);

  // ── Closing Behaviour ──

  const enableClosingConfirmation = useCallback(() => {
    try {
      window.Telegram?.WebApp?.enableClosingConfirmation();
    } catch {
      // noop
    }
  }, []);

  const disableClosingConfirmation = useCallback(() => {
    try {
      window.Telegram?.WebApp?.disableClosingConfirmation();
    } catch {
      // noop
    }
  }, []);

  // ── Fullscreen ──

  const requestFullscreen = useCallback(() => {
    try {
      window.Telegram?.WebApp?.requestFullscreen?.();
    } catch {
      // Not supported in all versions
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      window.Telegram?.WebApp?.exitFullscreen?.();
    } catch {
      // Not supported in all versions
    }
  }, []);

  // ── Alerts & Popups ──

  const showAlert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.showAlert(message, () => resolve());
      } else {
        // Fallback: use browser alert
        window.alert(message);
        resolve();
      }
    });
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.showConfirm(message, (confirmed: boolean) => resolve(confirmed));
      } else {
        // Fallback: use browser confirm
        resolve(window.confirm(message));
      }
    });
  }, []);

  const showPopup = useCallback((params: PopupParams): Promise<string> => {
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.showPopup(params, (buttonId: string) => resolve(buttonId));
      } else {
        // Fallback: use browser confirm
        const confirmed = window.confirm(`${params.title ? params.title + '\n' : ''}${params.message}`);
        resolve(confirmed ? 'ok' : 'cancel');
      }
    });
  }, []);

  // ── Sharing ──

  const shareToTelegram = useCallback((text: string, url?: string) => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url || 'https://t.me/RPL30_bot/app')}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  }, []);

  const switchInlineQueryFn = useCallback((query: string, chooseChatTypes?: Array<'users' | 'bots' | 'groups' | 'channels'>) => {
    try {
      window.Telegram?.WebApp?.switchInlineQuery(query, chooseChatTypes);
    } catch {
      // Not supported in all contexts
    }
  }, []);

  // ── Links ──

  const openLinkFn = useCallback((url: string, options?: { tryInstantView?: boolean }) => {
    try {
      window.Telegram?.WebApp?.openLink(url, options?.tryInstantView ? { try_instant_view: true } : undefined);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  }, []);

  const openTelegramLinkFn = useCallback((url: string) => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, []);

  // ── CloudStorage ──

  const cloudStorageSetItem = useCallback((key: string, value: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cs = window.Telegram?.WebApp?.CloudStorage;
      if (!cs) {
        // Fallback: use localStorage
        try {
          localStorage.setItem(`tg_cloud_${key}`, value);
          resolve();
        } catch (e) {
          reject(e);
        }
        return;
      }
      cs.setItem(key, value, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }, []);

  const cloudStorageGetItem = useCallback((key: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const cs = window.Telegram?.WebApp?.CloudStorage;
      if (!cs) {
        // Fallback: use localStorage
        try {
          resolve(localStorage.getItem(`tg_cloud_${key}`));
        } catch (e) {
          reject(e);
        }
        return;
      }
      cs.getItem(key, (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
  }, []);

  const cloudStorageGetKeys = useCallback((): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const cs = window.Telegram?.WebApp?.CloudStorage;
      if (!cs) {
        // Fallback: use localStorage
        try {
          const keys = Object.keys(localStorage)
            .filter(k => k.startsWith('tg_cloud_'))
            .map(k => k.replace('tg_cloud_', ''));
          resolve(keys);
        } catch (e) {
          reject(e);
        }
        return;
      }
      cs.getKeys((error, keys) => {
        if (error) reject(error);
        else resolve(keys);
      });
    });
  }, []);

  const cloudStorageRemoveItem = useCallback((key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cs = window.Telegram?.WebApp?.CloudStorage;
      if (!cs) {
        // Fallback: use localStorage
        try {
          localStorage.removeItem(`tg_cloud_${key}`);
          resolve();
        } catch (e) {
          reject(e);
        }
        return;
      }
      cs.removeItem(key, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }, []);

  // ── Home Screen ──

  const addToHomeScreen = useCallback(() => {
    try {
      window.Telegram?.WebApp?.addToHomeScreen?.();
    } catch {
      // Not supported
    }
  }, []);

  const checkHomeScreenStatus = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg?.checkHomeScreenStatus) {
        tg.checkHomeScreenStatus((status) => resolve(status));
      } else {
        resolve('unsupported');
      }
    });
  }, []);

  // ── Events ──

  const onTelegramEvent = useCallback((eventType: TelegramEventType, callback: (...args: unknown[]) => void) => {
    window.Telegram?.WebApp?.onEvent(eventType, callback);
  }, []);

  const offTelegramEvent = useCallback((eventType: TelegramEventType, callback: (...args: unknown[]) => void) => {
    window.Telegram?.WebApp?.offEvent(eventType, callback);
  }, []);

  // ── Clipboard ──

  const readTextFromClipboard = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg?.readTextFromClipboard) {
        tg.readTextFromClipboard((text) => resolve(text));
      } else {
        resolve(null);
      }
    });
  }, []);

  return {
    // State
    isReady,
    isTelegram,
    isExpanded,
    colorScheme,
    themeParams,
    safeAreaInset,
    contentSafeAreaInset,
    viewportHeight,
    platform,
    version,

    // User info
    user,
    startParam,
    chat,
    chatType,

    // Haptic feedback
    haptic,
    notify,
    selectionChanged,

    // MainButton
    showMainButton,
    hideMainButton,
    updateMainButton,

    // SecondaryButton
    showSecondaryButton,
    hideSecondaryButton,

    // BackButton
    showBackButton,
    hideBackButton,

    // Closing behaviour
    enableClosingConfirmation,
    disableClosingConfirmation,

    // Fullscreen
    requestFullscreen,
    exitFullscreen,

    // Alerts & Popups
    showAlert,
    showConfirm,
    showPopup,

    // Sharing
    shareToTelegram,
    switchInlineQuery: switchInlineQueryFn,

    // Links
    openLink: openLinkFn,
    openTelegramLink: openTelegramLinkFn,

    // CloudStorage
    cloudStorageSetItem,
    cloudStorageGetItem,
    cloudStorageGetKeys,
    cloudStorageRemoveItem,

    // Home screen
    addToHomeScreen,
    checkHomeScreenStatus,

    // Events
    onTelegramEvent,
    offTelegramEvent,

    // Clipboard
    readTextFromClipboard,
  };
}

// Export types for use in other files
export type { TelegramUser, Chat, ThemeParams, SafeAreaInset, PopupParams, PopupButton };
