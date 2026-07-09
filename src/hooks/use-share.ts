'use client';

import { useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import html2canvas from 'html2canvas-pro';

const BOT_URL = 'https://t.me/RPL30_bot';
const APP_DEEP_LINK = (code: string) => `${BOT_URL}/app?startapp=${code}`;

export function useShare() {
  const { user } = useAuthStore();
  const cardRef = useRef<HTMLDivElement>(null);

  const getInviteUrl = useCallback(() => {
    if (user && user.referralCode) {
      return APP_DEEP_LINK(user.referralCode);
    }
    return BOT_URL;
  }, [user]);

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0A0A0A',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      });
    } catch (err) {
      console.error('Card capture failed:', err);
      return null;
    }
  }, []);

  const shareViaTelegram = useCallback((text: string) => {
    const url = getInviteUrl();
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.openTelegramLink(shareUrl);
        return true;
      } catch {
        // fallback
      }
    }

    // Fallback: open share URL in new tab
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank');
    }
    return true;
  }, [getInviteUrl]);

  const shareImageViaTelegram = useCallback(async (text: string) => {
    const blob = await captureCard();
    if (!blob) {
      // Fallback to text-only share
      shareViaTelegram(text);
      return;
    }

    // Try native share with image
    if (typeof window !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], '30-0-rpl.png', { type: 'image/png' });
      const shareData = { text, files: [file] };
      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          // User cancelled or failed, fallback to Telegram text share
        }
      }
    }

    // Fallback: just share text via Telegram
    shareViaTelegram(text);
  }, [captureCard, shareViaTelegram]);

  const saveImage = useCallback(async () => {
    const blob = await captureCard();
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '30-0-rpl-share.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }, [captureCard]);

  return {
    cardRef,
    getInviteUrl,
    captureCard,
    shareViaTelegram,
    shareImageViaTelegram,
    saveImage,
  };
}
