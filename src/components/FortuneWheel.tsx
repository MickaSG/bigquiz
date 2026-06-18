import React, { useState, useCallback } from 'react';
import { PlayerLifelines } from '../types/game';
import { useSound } from '../hooks/useSound';

interface FortuneWheelProps {
  onClose: (prize: Partial<PlayerLifelines> | null) => void;
}

const PRIZES = [
  { label: '✂️ +1 50/50', icon: '✂️', lifelines: { fiftyFifty: 1 }, color: '#00e5ff' },
  { label: '👁️ +1 Espion', icon: '👁️', lifelines: { spy: 1 }, color: '#ff2d78' },
  { label: '🛡️ +1 Bouclier', icon: '🛡️', lifelines: { shield: 1 }, color: '#00e676' },
  { label: '❄️ +1 Gel', icon: '❄️', lifelines: { freezeTime: 1 }, color: '#64b5f6' },
  { label: '×2 +1 Double', icon: '×2', lifelines: { doublePoints: 1 }, color: '#ffd600' },
  { label: '🔄 +1 2e Chance', icon: '🔄', lifelines: { secondChance: 1 }, color: '#b829ff' },
  { label: '⏭️ +1 Passer', icon: '⏭️', lifelines: { skipQuestion: 1 }, color: '#ff8800' },
  { label: '🎁 +1 de tout !', icon: '🎁', lifelines: { fiftyFifty: 1, skipQuestion: 1, doublePoints: 1, freezeTime: 1, spy: 1, shield: 1, secondChance: 1, publicVote: 1 }, color: '#ff00ff' },
  { label: '📊 +1 Public', icon: '📊', lifelines: { publicVote: 1 }, color: '#4caf50' },
  { label: '💀 Rien...', icon: '💀', lifelines: null, color: '#555' },
];

export const FortuneWheel: React.FC<FortuneWheelProps> = ({ onClose }) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const { playClick } = useSound();

  const spin = useCallback(() => {
    if (spinning) return;
    playClick();
    setSpinning(true);
    const prizeIdx = Math.floor(Math.random() * PRIZES.length);
    // 4-6 full rotations + offset to land on prize
    const sliceAngle = 360 / PRIZES.length;
    const extraRotations = (4 + Math.floor(Math.random() * 3)) * 360;
    const targetAngle = extraRotations + (PRIZES.length - prizeIdx) * sliceAngle + sliceAngle / 2;
    setRotation(prev => prev + targetAngle);
    setTimeout(() => {
      setSpinning(false);
      setResult(prizeIdx);
    }, 3500);
  }, [spinning, playClick]);

  const prize = result !== null ? PRIZES[result] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glow-panel rounded-2xl p-6 max-w-sm w-full text-center">
        <h2 className="font-title text-2xl text-white mb-4">🎰 Roue de la Fortune</h2>

        {/* Wheel */}
        <div className="relative w-64 h-64 mx-auto mb-6">
          {/* Arrow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 text-3xl">▼</div>

          {/* Spinning wheel */}
          <div
            className="w-full h-full rounded-full border-4 border-white/20 overflow-hidden relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {PRIZES.map((p, i) => {
              const angle = (360 / PRIZES.length) * i;
              return (
                <div
                  key={i}
                  className="absolute w-full h-full flex items-start justify-center"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div className="mt-4 text-xl" style={{ transform: `rotate(${180 / PRIZES.length}deg)` }}>
                    {p.icon}
                  </div>
                </div>
              );
            })}
            {/* Colored slices background */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full -z-10">
              {PRIZES.map((p, i) => {
                const startAngle = (360 / PRIZES.length) * i - 90;
                const endAngle = startAngle + 360 / PRIZES.length;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const x1 = 100 + 100 * Math.cos(startRad);
                const y1 = 100 + 100 * Math.sin(startRad);
                const x2 = 100 + 100 * Math.cos(endRad);
                const y2 = 100 + 100 * Math.sin(endRad);
                return (
                  <path
                    key={i}
                    d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`}
                    fill={p.color}
                    opacity={0.3}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Result or Spin button */}
        {result !== null ? (
          <div className="animate-bounce-in">
            <div className="text-4xl mb-2">{prize?.icon}</div>
            <p className={`font-title text-xl mb-4 ${prize?.lifelines ? 'text-green-400' : 'text-red-400'}`}>
              {prize?.label}
            </p>
            <button
              onClick={() => onClose(prize?.lifelines || null)}
              className="btn-primary w-full py-4 rounded-xl text-base"
            >
              Continuer
            </button>
          </div>
        ) : (
          <button
            onClick={spin}
            disabled={spinning}
            className={`btn-primary w-full py-4 rounded-xl text-base ${spinning ? 'opacity-50' : 'animate-pulse'}`}
          >
            {spinning ? '🎰 Ça tourne...' : '🎰 Tourner la roue !'}
          </button>
        )}
      </div>
    </div>
  );
};
