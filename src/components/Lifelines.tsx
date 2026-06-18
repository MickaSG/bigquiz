import React from 'react';

interface LifelinesProps {
  fiftyFifty: number;
  skipQuestion: number;
  doublePoints: number;
  freezeTime: number;
  spy: number;
  shield: number;
  secondChance: number;
  publicVote: number;
  onFiftyFifty: () => void;
  onSkip: () => void;
  onDouble: () => void;
  onFreeze: () => void;
  onSpy: () => void;
  onShield: () => void;
  onSecondChance: () => void;
  onPublicVote: () => void;
  disabled: boolean;
  doubleActive: boolean;
  freezeActive: boolean;
  shieldActive: boolean;
  secondChanceActive: boolean;
}

export const Lifelines: React.FC<LifelinesProps> = ({
  fiftyFifty, skipQuestion, doublePoints, freezeTime, spy, shield, secondChance, publicVote,
  onFiftyFifty, onSkip, onDouble, onFreeze, onSpy, onShield, onSecondChance, onPublicVote,
  disabled, doubleActive, freezeActive, shieldActive, secondChanceActive
}) => {
  const lifelines = [
    { icon: '✂️', label: '50/50', count: fiftyFifty, action: onFiftyFifty, active: false },
    { icon: '⏭️', label: 'Passer', count: skipQuestion, action: onSkip, active: false },
    { icon: '×2', label: 'Double', count: doublePoints, action: onDouble, active: doubleActive },
    { icon: '❄️', label: 'Geler', count: freezeTime, action: onFreeze, active: freezeActive },
    { icon: '👁️', label: 'Espion', count: spy, action: onSpy, active: false },
    { icon: '🛡️', label: 'Bouclier', count: shield, action: onShield, active: shieldActive },
    { icon: '🔄', label: '2e Chance', count: secondChance, action: onSecondChance, active: secondChanceActive },
    { icon: '📊', label: 'Public', count: publicVote, action: onPublicVote, active: false },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mt-5">
      <div className="flex justify-center gap-1.5 md:gap-2 flex-wrap">
        {lifelines.map((l, i) => (
          <button
            key={i}
            onClick={l.action}
            disabled={disabled || l.count <= 0 || l.active}
            className={`relative flex flex-col items-center gap-0.5 px-2.5 py-2 md:px-3 md:py-2.5 rounded-xl border transition-all
              ${l.active ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20' :
                l.count <= 0 || disabled ? 'bg-white/5 border-white/5 opacity-30 cursor-not-allowed' :
                'glass-panel hover:bg-white/10 hover:scale-105 cursor-pointer active:scale-95'
              }
            `}
          >
            <span className="text-lg">{l.icon}</span>
            <span className="text-[9px] md:text-[10px] text-white/60 font-semibold leading-tight">{l.label}</span>
            {l.count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center">
                {l.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
