import { useCallback, useRef } from 'react';

const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

export function useSound() {
  const lastPlayTime = useRef(0);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15) => {
    if (!audioContext) return;
    const now = Date.now();
    if (now - lastPlayTime.current < 50) return;
    lastPlayTime.current = now;

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch { /* ignore */ }
  }, []);

  const playCorrect = useCallback(() => {
    playTone(523.25, 0.15, 'sine', 0.12);
    setTimeout(() => playTone(659.25, 0.15, 'sine', 0.12), 100);
    setTimeout(() => playTone(783.99, 0.2, 'sine', 0.12), 200);
  }, [playTone]);

  const playWrong = useCallback(() => {
    playTone(300, 0.3, 'sawtooth', 0.08);
    setTimeout(() => playTone(250, 0.4, 'sawtooth', 0.06), 150);
  }, [playTone]);

  const playClick = useCallback(() => {
    playTone(800, 0.05, 'sine', 0.08);
  }, [playTone]);

  const playTick = useCallback(() => {
    playTone(1000, 0.03, 'sine', 0.04);
  }, [playTone]);

  const playStreak = useCallback((streak: number) => {
    const base = 400 + streak * 50;
    playTone(base, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(base * 1.25, 0.1, 'sine', 0.1), 80);
    setTimeout(() => playTone(base * 1.5, 0.15, 'sine', 0.1), 160);
    setTimeout(() => playTone(base * 2, 0.2, 'sine', 0.1), 240);
  }, [playTone]);

  const playLevelUp = useCallback(() => {
    [523, 587, 659, 783, 880, 1046].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.15, 'sine', 0.1), i * 80);
    });
  }, [playTone]);

  const playGameOver = useCallback(() => {
    [400, 350, 300, 250, 200].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'triangle', 0.08), i * 200);
    });
  }, [playTone]);

  return { playCorrect, playWrong, playClick, playTick, playStreak, playLevelUp, playGameOver };
}
