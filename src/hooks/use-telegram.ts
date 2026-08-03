'use client';

import { useCallback, useRef } from 'react';

/**
 * No-op hook that provides the same API as the former Telegram hook.
 * All Telegram functionality has been removed from the project.
 * This hook exists to avoid breaking game components that reference it.
 */

interface SafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function useTelegram() {
  const selectionChangedRef = useRef(false);

  const haptic = useCallback((_style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    // No-op: haptic feedback removed
  }, []);

  const notify = useCallback((_type: 'success' | 'error' | 'warning') => {
    // No-op
  }, []);

  const showAlert = useCallback(async (_message: string): Promise<void> => {
    // No-op: use browser alert instead if needed
  }, []);

  const showConfirm = useCallback(async (_message: string): Promise<boolean> => {
    return window.confirm(_message);
  }, []);

  const shareToTelegram = useCallback((_text: string, _url?: string) => {
    // No-op
  }, []);

  const selectionChanged = useCallback(() => {
    selectionChangedRef.current = true;
  }, []);

  const showBackButton = useCallback((_handler: () => void) => {}, []);
  const hideBackButton = useCallback(() => {}, []);
  const showMainButton = useCallback((_handler: () => void) => {}, []);
  const hideMainButton = useCallback(() => {}, []);
  const updateMainButton = useCallback((_opts: Record<string, unknown>) => {}, []);
  const enableClosingConfirmation = useCallback(() => {}, []);
  const disableClosingConfirmation = useCallback(() => {}, []);

  const showSecondaryButton = useCallback((_handler: () => void) => {}, []);
  const hideSecondaryButton = useCallback(() => {}, []);

  return {
    isTelegram: false,
    haptic,
    notify,
    showAlert,
    showConfirm,
    shareToTelegram,
    selectionChanged,
    safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 } as SafeAreaInset,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    updateMainButton,
    enableClosingConfirmation,
    disableClosingConfirmation,
    showSecondaryButton,
    hideSecondaryButton,
  };
}
