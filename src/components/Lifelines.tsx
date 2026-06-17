import React from 'react';

interface LifelinesProps {
  fiftyFifty: number;
  skipQuestion: number;
  doublePoints: number;
  freezeTime: number;
  onFiftyFifty: () => void;
  onSkip: () => void;
  onDouble: () => void;
  onFreeze: () => void;
  disabled: boolean;
  doubleActive: boolean;
  freezeActive: boolean;
}

export const Lifelines: React.FC<LifelinesProps> = ({
  fiftyFifty, skipQuestion, doublePoints, freezeTime,
  onFiftyFifty, onSkip, onDouble, onFreeze,
  disabled, doubleActive, freezeActive
}) => {
  const lifelines = [
    { icon: '✂️', label: '50/50', count: fiftyFifty, action: onFiftyFifty, active: false },
    { icon: '⏭️', label: 'Passer', count: skipQuestion, action: onSkip, active: false },
    { icon: '×2', label: 'Double', count: doublePoints, action: onDouble, active: doubleActive },
    { icon: '❄️', label: 'Geler', count: freezeTime, action: onFreeze, active: freezeActive },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mt-5">
      <div className="flex justify-center gap-2 md:gap-3">
        {lifelines.map((l, i) => (
          <button
            key={i}
            onClick={l.action}
            disabled={disabled || l.count <= 0 || l.active}
            className={`relative flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all
              ${l.active ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20' :
                l.count <= 0 || disabled ? 'bg-white/5 border-white/5 opacity-30 cursor-not-allowed' :
                'glass-panel hover:bg-white/10 hover:scale-105 cursor-pointer active:scale-95'
              }
            `}
          >
            <span className="text-xl">{l.icon}</span>
            <span className="text-[11px] text-white/60 font-semibold">{l.label}</span>
            {l.count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                {l.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
