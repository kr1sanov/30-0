'use client';
import { useSyncExternalStore } from 'react';
import { translateInterface } from '@/lib/enTranslations';
function subscribe(update: () => void) {
  window.addEventListener('30-0-language-change', update);
  return () => window.removeEventListener('30-0-language-change', update);
}
export function useUiTranslation() {
  const language = useSyncExternalStore(subscribe, () => localStorage.getItem('30-0-language') === 'en' ? 'en' : 'ru', () => 'ru');
  return (text: string) => language === 'en' ? translateInterface(text) : text;
}
