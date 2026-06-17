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
    { icon: '✂️', label: '50/50', count: fiftyFifty, action: onFiftyFifty, active: false, color: 'from-blue-500 to-cyan-500' },
    { icon: '⏭️', label: 'Passer', count: skipQuestion, action: onSkip, active: false, color: 'from-amber-500 to-yellow-500' },
    { icon: '×2', label: 'Double', count: doublePoints, action: onDouble, active: doubleActive, color: 'from-purple-500 to-pink-500' },
    { icon: '❄️', label: 'Geler', count: freezeTime, action: onFreeze, active: freezeActive, color: 'from-cyan-500 to-blue-500' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mt-4">
      <div className="flex justify-center gap-2 md:gap-3">
        {lifelines.map((l, i) => (
          <button
            key={i}
            onClick={l.action}
            disabled={disabled || l.count <= 0 || l.active}
            className={`relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl border transition-all
              ${l.active ? 'bg-gradient-to-b ' + l.color + ' border-white/30 scale-105 shadow-lg' :
                l.count <= 0 || disabled ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed' :
                'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105 cursor-pointer active:scale-95'
              }
            `}
          >
            <span className="text-xl">{l.icon}</span>
            <span className="text-[10px] text-white/60 font-medium">{l.label}</span>
            {l.count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                {l.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
