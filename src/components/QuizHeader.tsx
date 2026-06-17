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
  const isLowTime = timeLeft <= 5;

  return (
    <div className="w-full max-w-3xl mx-auto mb-5">
      {/* Top controls */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onQuit} className="btn-secondary !py-2 !px-3 rounded-lg text-xs">✕ Quitter</button>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-sm">{category}</span>
          <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
            difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
            difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400'
          }`}>{difficulty === 'easy' ? 'Facile' : difficulty === 'medium' ? 'Moyen' : 'Difficile'}</span>
        </div>
        <button onClick={onPause} className="btn-secondary !py-2 !px-3 rounded-lg text-xs">❚❚ Pause</button>
      </div>

      {/* HUD Bar */}
      <div className="glow-panel rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Score */}
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <span className="font-score text-xl font-bold text-amber-400">{score.toLocaleString()}</span>
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
              streak >= 10 ? 'bg-gradient-to-r from-pink-500/30 to-amber-500/30 text-amber-300' :
              streak >= 5 ? 'bg-orange-500/20 text-orange-300' : 'bg-red-500/20 text-red-300'
            }`}>
              🔥 {streak}
              {comboMultiplier > 1 && <span className="text-xs opacity-80">×{comboMultiplier.toFixed(1)}</span>}
            </div>
          )}

          {/* Active power-ups */}
          {doubleActive && <span className="text-xs px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 font-bold">×2 PTS</span>}
          {freezeActive && <span className="text-xs px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-300 font-bold">❄️ GEL</span>}

          {/* Lives */}
          {lives !== undefined && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-base ${i < lives ? '' : 'opacity-20'}`}>
                  {i < lives ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          )}

          {/* Question number */}
          <div className="font-score text-sm text-white/60">
            {questionNum}/{totalQuestions}
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="progress-bar h-5 rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isLowTime ? 'bg-gradient-to-r from-red-500 to-pink-500' :
            timePercent > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
            'bg-gradient-to-r from-amber-500 to-yellow-400'
          } ${isLowTime ? 'animate-pulse' : ''}`}
          style={{ width: `${timePercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-score text-xs font-bold relative ${isLowTime ? 'text-white' : 'text-white/90'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>
    </div>
  );
};
