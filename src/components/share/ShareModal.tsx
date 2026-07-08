'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas-pro';
import { useAuthStore } from '@/store/authStore';

const ACCENT = '#00C896';
const BG = '#0A0A0A';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareText: string;
  cardContent: React.ReactNode;
}

export default function ShareModal({ isOpen, onClose, shareText, cardContent }: ShareModalProps) {
  const { user } = useAuthStore();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const inviteUrl = user?.referralCode
    ? `https://t.me/RPL30_bot/app?startapp=${user.referralCode}`
    : 'https://t.me/RPL30_bot';

  const fullText = `${shareText}\n\n🎮 Попробуй: ${inviteUrl}`;

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

  const handleShareTelegram = useCallback(async () => {
    setIsSharing(true);

    // Try to share with image via native share
    const blob = await captureCard();
    if (blob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], '30-0-rpl.png', { type: 'image/png' });
      const shareData = { text: fullText, files: [file] };
      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          setIsSharing(false);
          onClose();
          return;
        } catch {
          // Cancelled or failed
        }
      }
    }

    // Fallback: Telegram text share with link
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.openTelegramLink(shareUrl);
        setIsSharing(false);
        onClose();
        return;
      } catch { /* fallback */ }
    }

    // Last fallback: open in new tab
    window.open(shareUrl, '_blank');
    setIsSharing(false);
    onClose();
  }, [captureCard, fullText, shareText, inviteUrl, onClose]);

  const handleSaveImage = useCallback(async () => {
    setIsCapturing(true);
    const blob = await captureCard();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '30-0-rpl-share.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setIsCapturing(false);
  }, [captureCard]);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(fullText).then(() => {
      onClose();
    }).catch(() => {});
  }, [fullText, onClose]);

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
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              zIndex: 101, maxHeight: '90vh', overflow: 'auto',
              background: '#141414',
              borderRadius: '20px 20px 0 0',
              borderTop: '1px solid #1f1f1f',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333' }} />
            </div>

            <div style={{ padding: '0 20px 20px' }}>
              {/* Title */}
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 16, textAlign: 'center' }}>
                Поделиться
              </h3>

              {/* Card preview */}
              <div
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid #1f1f1f',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'center',
                  background: BG,
                }}
              >
                <div ref={cardRef} style={{ width: 400, maxWidth: '100%' }}>
                  {cardContent}
                </div>
              </div>

              {/* Share text preview */}
              <div style={{
                background: '#0A0A0A',
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
                border: '1px solid #1f1f1f',
              }}>
                <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>ТЕКСТ СООБЩЕНИЯ</div>
                <pre style={{
                  color: '#9CA3AF', fontSize: 11, lineHeight: 1.5,
                  whiteSpace: 'pre-wrap', margin: 0,
                  maxHeight: 80, overflow: 'auto',
                }}>
                  {fullText}
                </pre>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Telegram share */}
                <button
                  onClick={handleShareTelegram}
                  disabled={isSharing}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 12,
                    background: '#2AABEE', color: '#fff',
                    fontSize: 14, fontWeight: 700,
                    border: 'none', cursor: isSharing ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.02-1.628 4.472-1.636z"/>
                  </svg>
                  {isSharing ? 'Открываю...' : 'Поделиться в Telegram'}
                </button>

                {/* Save image */}
                <button
                  onClick={handleSaveImage}
                  disabled={isCapturing}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 12,
                    background: 'transparent', color: '#9CA3AF',
                    fontSize: 13, fontWeight: 600,
                    border: '1px solid #2a2a2a', cursor: isCapturing ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  📥 {isCapturing ? 'Сохраняю...' : 'Сохранить картинку'}
                </button>

                {/* Copy text */}
                <button
                  onClick={handleCopyText}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 12,
                    background: 'transparent', color: '#64748b',
                    fontSize: 13, fontWeight: 600,
                    border: '1px solid #1f1f1f', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  📋 Скопировать текст
                </button>

                {/* Close */}
                <button
                  onClick={onClose}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 12,
                    background: 'transparent', color: '#4a5568',
                    fontSize: 13, border: 'none', cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
              </div>

              {/* Referral info */}
              {user?.referralCode && (
                <div style={{
                  marginTop: 12, padding: 10, borderRadius: 8,
                  background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`,
                  textAlign: 'center',
                }}>
                  <span style={{ color: ACCENT, fontSize: 10, fontWeight: 600 }}>
                    🎁 Твоя реферальная ссылка: t.me/RPL30_bot/app?startapp={user.referralCode}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
