'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas-pro';
import { Metrics } from '@/lib/metrics';

const BG = '#0A0A0A';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareText: string;
  cardContent: React.ReactNode;
}

export default function ShareModal({ isOpen, onClose, shareText, cardContent }: ShareModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleShareNative = useCallback(async () => {
    setIsSharing(true);

    const blob = await captureCard();
    if (blob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], '30-0-rpl.png', { type: 'image/png' });
      const shareData = { text: shareText, files: [file] };
      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          Metrics.shareResult('native');
          setIsSharing(false);
          onClose();
          return;
        } catch {
          // Cancelled or failed
        }
      }
    }

    // Fallback: copy text to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        Metrics.shareResult('clipboard');
      } catch {
        // Clipboard failed
      }
    }

    setIsSharing(false);
    onClose();
  }, [captureCard, shareText, onClose]);

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

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Native share */}
                <button
                  onClick={handleShareNative}
                  disabled={isSharing}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 12,
                    background: 'linear-gradient(135deg, #00C896 0%, #00A67A 100%)',
                    color: '#fff',
                    fontSize: 15, fontWeight: 700,
                    border: 'none', cursor: isSharing ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 15px rgba(0, 200, 150, 0.3)',
                  }}
                >
                  {isSharing ? 'Делимся...' : 'Поделиться'}
                </button>

                {/* Save image */}
                <button
                  onClick={handleSaveImage}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 12,
                    background: 'transparent', color: '#9CA3AF',
                    fontSize: 13, border: '1px solid #2a2a2a', cursor: 'pointer',
                  }}
                >
                  Сохранить картинку
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
