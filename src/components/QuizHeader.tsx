import React from 'react';

interface QuizHeaderProps {
  score: number;
  streak: number;
  questionNum: number;
  totalQuestions: number;
  timeLeft: number;
  maxTime: number;
  category: string;
  difficulty: string;
  comboMultiplier: number;
  lives?: number;
  onPause: () => void;
  onQuit: () => void;
  doubleActive: boolean;
  freezeActive: boolean;
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({
  score, streak, questionNum, totalQuestions, timeLeft, maxTime, category, difficulty,
  comboMultiplier, lives, onPause, onQuit, doubleActive, freezeActive
}) => {
  const timePercent = (timeLeft / maxTime) * 100;
  const timeColor = timeLeft > 10 ? 'bg-emerald-500' : timeLeft > 5 ? 'bg-amber-500' : 'bg-red-500';
  const isLowTime = timeLeft <= 5;

  return (
    <div className="w-full max-w-3xl mx-auto mb-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={onQuit} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white/70 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="text-sm text-white/60">{category}</div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            difficulty === 'easy' ? 'bg-green-500/20 text-green-300' :
            difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
            'bg-red-500/20 text-red-300'
          }`}>{difficulty === 'easy' ? 'Facile' : difficulty === 'medium' ? 'Moyen' : 'Difficile'}</span>
        </div>
        <div className="flex items-center gap-3">
          {doubleActive && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/30 text-yellow-300 animate-pulse">×2 POINTS</span>}
          {freezeActive && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300 animate-pulse">❄️ GEL</span>}
          <button onClick={onPause} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white/70 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" /></svg>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl">⭐</span>
            <span className="text-xl font-bold text-white">{score.toLocaleString()}</span>
          </div>
          {streak > 0 && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
              streak >= 10 ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-300' :
              streak >= 5 ? 'bg-orange-500/20 text-orange-300' :
              'bg-red-500/20 text-red-300'
            } ${streak >= 5 ? 'animate-pulse' : ''}`}>
              <span>🔥</span>
              <span className="font-bold text-sm">{streak}</span>
              {comboMultiplier > 1 && <span className="text-xs ml-1">×{comboMultiplier.toFixed(1)}</span>}
            </div>
          )}
          {lives !== undefined && (
            <div className="flex items-center gap-1">
              {Array.from({ length: lives }).map((_, i) => (
                <span key={i} className="text-lg">❤️</span>
              ))}
              {Array.from({ length: Math.max(0, 3 - lives) }).map((_, i) => (
                <span key={i} className="text-lg opacity-30">🖤</span>
              ))}
            </div>
          )}
        </div>
        <div className="text-white/60 text-sm font-medium">
          {questionNum}/{totalQuestions}
        </div>
      </div>

      {/* Timer bar */}
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeColor} ${isLowTime ? 'animate-pulse' : ''}`}
          style={{ width: `${timePercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[10px] font-bold ${isLowTime ? 'text-white' : 'text-white/80'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-0.5 mt-2 justify-center flex-wrap max-w-full">
        {Array.from({ length: Math.min(totalQuestions, 30) }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i < questionNum - 1 ? 'w-3 bg-emerald-400' :
              i === questionNum - 1 ? 'w-5 bg-white' :
              'w-2 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
