import { useCallback } from 'react';

export function useConfetti() {
  const fire = useCallback(async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899'],
      });
    } catch { /* ignore */ }
  }, []);

  const fireStars = useCallback(async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      const defaults = { spread: 360, ticks: 50, gravity: 0, decay: 0.94, startVelocity: 30, colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'] };
      confetti({ ...defaults, particleCount: 40, scalar: 1.2, shapes: ['star'] });
      setTimeout(() => confetti({ ...defaults, particleCount: 25, scalar: 0.75, shapes: ['circle'] }), 100);
    } catch { /* ignore */ }
  }, []);

  const fireSides = useCallback(async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
    } catch { /* ignore */ }
  }, []);

  return { fire, fireStars, fireSides };
}
