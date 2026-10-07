'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas-pro';
import { Metrics } from '@/lib/metrics';
import { toast } from 'sonner';
import { localizeShareText } from '@/lib/enTranslations';

const BG = '#0A0A0A';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareText: string;
  runId?: string;
  cardContent: React.ReactNode;
}

export default function ShareModal({ isOpen, onClose, shareText, cardContent, runId }: ShareModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: BG,
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

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/referrals').then(r => r.ok ? r.json() : null).then(data => setInviteUrl(data?.inviteUrl ?? null)).catch(() => setInviteUrl(null));
  }, [isOpen]);
  const ref = inviteUrl ? new URL(inviteUrl).searchParams.get('ref') : null;
  const resultUrl = runId ? `${typeof window !== 'undefined' ? window.location.origin : 'https://30-0.рф'}/share/${runId}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}` : (inviteUrl || 'https://30-0.рф');
  const fullText = `${localizeShareText(shareText).replace(/🎮 Играть: https:\/\/30-0\.рф/g, '').trim()}\n\n${resultUrl}\n🎮 ${inviteUrl || 'https://t.me/RPL30_bot?startapp'}`;
  const handleCopyText = useCallback(async () => {
    try { await navigator.clipboard.writeText(fullText); Metrics.shareResult('clipboard'); toast.success('Текст скопирован'); }
    catch { toast.error('Не удалось скопировать текст'); }
  }, [fullText]);

  const handleSaveImage = useCallback(async () => {
    const blob = await captureCard();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '30-0-rpl-share.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [captureCard]);

  const handleTelegramShare = useCallback(async () => {
    const telegram = (window as Window & {
      Telegram?: { WebApp?: { shareMessage?: (id: string) => void; openTelegramLink?: (link: string) => void } };
    }).Telegram;
    if (runId && telegram?.WebApp?.shareMessage) {
      setIsSharing(true);
      try {
        const response = await fetch('/api/share/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId }) });
        if (response.ok) {
          const { messageId } = await response.json();
          telegram.WebApp.shareMessage(messageId);
          Metrics.shareResult('telegram');
          return;
        }
      } catch { /* fall through to link sharing */ }
      finally { setIsSharing(false); }
    }
    const url = `https://t.me/share/url?url=${encodeURIComponent(resultUrl)}&text=${encodeURIComponent(fullText)}`;
    if (telegram?.WebApp?.openTelegramLink) telegram.WebApp.openTelegramLink(url);
    else window.location.assign(url);
    Metrics.shareResult('telegram');
  }, [runId, resultUrl, fullText]);

  const handleCopyImage = useCallback(async () => {
    setIsSharing(true);
    const blob = await captureCard();
    if (!blob) {
      toast.error('Не удалось создать изображение');
      setIsSharing(false);
      return;
    }
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        Metrics.shareResult('image_clipboard');
        toast.success('Изображение скопировано');
      } else {
        await handleSaveImage();
        toast.info('Браузер сохранил PNG вместо копирования');
      }
    } catch {
      await handleSaveImage();
      toast.info('Копирование недоступно — PNG сохранён');
    } finally {
      setIsSharing(false);
    }
  }, [captureCard, handleSaveImage]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              zIndex: 100, backdropFilter: 'blur(4px)',
            }}
          />
          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Поделиться результатом"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 12, left: 0, right: 0, margin: '0 auto',
              width: 'min(560px, calc(100vw - 20px))', boxSizing: 'border-box',
              zIndex: 101, maxHeight: '90dvh', overflowY: 'auto', overflowX: 'hidden',
              background: '#141414',
              borderRadius: 20,
              border: '1px solid #1f1f1f',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333' }} />
            </div>

            <div style={{ width: '100%', maxWidth: 560, boxSizing: 'border-box', padding: '0 16px 20px', margin: '0 auto' }}>
              {/* Title */}
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 16, textAlign: 'center' }}>
                Поделиться
              </h3>

              {/* Card preview */}
              <div
                style={{
                  height: 230,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid #1f1f1f',
                  marginBottom: 12,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  background: BG,
                }}
              >
                <div style={{ width: 208, height: 228, overflow: 'hidden', position: 'relative', flex: '0 0 auto' }}>
                  <div aria-hidden="true" style={{ width: 400, transform: 'scale(.52)', transformOrigin: 'top left' }}>
                  {cardContent}
                  </div>
                </div>
              </div>
              <div ref={cardRef} aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: 400, pointerEvents: 'none' }}>
                {cardContent}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
                <button onClick={handleTelegramShare} disabled={isSharing} style={{ width: '100%', minHeight: 46, borderRadius: 10, background: '#229ED9', color: '#fff', border: 0, fontWeight: 700, cursor: 'pointer' }}>Поделиться в Telegram</button>
                <button onClick={handleCopyText} style={{ width: '100%', minHeight: 46, borderRadius: 10, background: 'var(--club-primary)', color: 'var(--club-on-primary)', border: 0, fontWeight: 700, cursor: 'pointer' }}>Скопировать текст и ссылку</button>
                <button onClick={handleCopyImage} disabled={isSharing} style={{ width: '100%', minHeight: 44, borderRadius: 10, background: '#1E1E1E', color: '#fff', border: 0, cursor: 'pointer' }}>{isSharing ? 'Готовим изображение…' : 'Скопировать изображение'}</button>
                <button onClick={handleSaveImage} style={{ width: '100%', minHeight: 42, borderRadius: 10, background: 'transparent', color: '#9CA3AF', border: '1px solid #2a2a2a', cursor: 'pointer' }}>Сохранить PNG</button>
                <button onClick={onClose} style={{ width: '100%', minHeight: 36, background: 'transparent', color: '#9CA3AF', border: 0, cursor: 'pointer' }}>Отмена</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
