'use client';

import { useCallback, useRef } from 'react';
import html2canvas from 'html2canvas-pro';

export function useShare() {
  const cardRef = useRef<HTMLDivElement>(null);

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

  const shareViaNative = useCallback(async (text: string) => {
    // Try native share API
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text });
        return true;
      } catch {
        // User cancelled
      }
    }
    return false;
  }, []);

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
    captureCard,
    shareViaNative,
    saveImage,
  };
}
