'use client';

import { useCallback, useRef, useEffect } from 'react';

// Sound types for the game
export type SoundType = 'spin' | 'spin_result' | 'draft' | 'reroll' | 'goal' | 'victory' | 'click' | 'error';

// Simple oscillator-based sound effects (no audio files needed)
const SOUND_CONFIGS: Record<SoundType, { frequency: number; duration: number; type: OscillatorType; volume: number }> = {
  spin: { frequency: 200, duration: 0.1, type: 'sine', volume: 0.15 },
  spin_result: { frequency: 600, duration: 0.3, type: 'sine', volume: 0.2 },
  draft: { frequency: 500, duration: 0.15, type: 'triangle', volume: 0.15 },
  reroll: { frequency: 300, duration: 0.2, type: 'sawtooth', volume: 0.1 },
  goal: { frequency: 800, duration: 0.4, type: 'sine', volume: 0.2 },
  victory: { frequency: 523, duration: 0.6, type: 'sine', volume: 0.25 },
  click: { frequency: 400, duration: 0.05, type: 'sine', volume: 0.1 },
  error: { frequency: 150, duration: 0.2, type: 'square', volume: 0.1 },
};

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef<boolean>(true);

  useEffect(() => {
    // Check localStorage for sound preference
    const saved = localStorage.getItem('30-0-sound-enabled');
    if (saved !== null) {
      enabledRef.current = saved === 'true';
    }
  }, []);

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const play = useCallback((sound: SoundType) => {
    if (!enabledRef.current) return;

    try {
      const ctx = getContext();
      const config = SOUND_CONFIGS[sound];

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

      // Add frequency variation for more natural sounds
      if (sound === 'victory') {
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.4);
      } else if (sound === 'spin_result') {
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
      } else if (sound === 'goal') {
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.15);
        oscillator.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
      }

      gainNode.gain.setValueAtTime(config.volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration + 0.05);
    } catch {
      // Audio not available, silently fail
    }
  }, [getContext]);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    localStorage.setItem('30-0-sound-enabled', String(enabledRef.current));
    return enabledRef.current;
  }, []);

  const isEnabled = useCallback(() => enabledRef.current, []);

  return { play, toggle, isEnabled };
}
