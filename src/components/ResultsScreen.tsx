import React, { useEffect } from 'react';
import { Player, ACHIEVEMENTS } from '../types/game';
import { useConfetti } from '../hooks/useConfetti';

interface ResultsScreenProps {
  player: Player;
  mode: string;
  onPlayAgain: () => void;
  onMenu: () => void;
  newAchievements: string[];
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ player, mode, onPlayAgain, onMenu, newAchievements }) => {
  const { fire, fireStars, fireSides } = useConfetti();
  const accuracy = player.totalAnswered > 0 ? Math.round((player.totalCorrect / player.totalAnswered) * 100) : 0;

  useEffect(() => {
    if (accuracy >= 70) {
      fire();
      setTimeout(fireStars, 500);
      setTimeout(fireSides, 1000);
    }
  }, [accuracy, fire, fireStars, fireSides]);

  const grade =
    accuracy >= 90 ? { emoji: '🏆', text: 'LÉGENDAIRE !', gradient: 'from-yellow-400 to-amber-500' } :
    accuracy >= 70 ? { emoji: '🌟', text: 'EXCELLENT !', gradient: 'from-green-400 to-emerald-500' } :
    accuracy >= 50 ? { emoji: '👍', text: 'PAS MAL !', gradient: 'from-cyan-400 to-blue-500' } :
    accuracy >= 30 ? { emoji: '📚', text: 'PEUT MIEUX FAIRE', gradient: 'from-amber-400 to-orange-500' } :
    { emoji: '💀', text: 'GAME OVER', gradient: 'from-red-400 to-pink-500' };

  const stats = [
    { label: 'Score', value: player.score.toLocaleString(), icon: '⭐' },
    { label: 'Correct', value: `${player.totalCorrect}/${player.totalAnswered}`, icon: '✅' },
    { label: 'Précision', value: `${accuracy}%`, icon: '🎯' },
    { label: 'Série max', value: `${player.maxStreak}`, icon: '🔥' },
    { label: 'Bonus temps', value: `+${player.timeBonus}`, icon: '⏱️' },
    { label: 'Mode', value: mode, icon: '🎮' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="max-w-lg w-full">
        {/* Grade card */}
        <div className="glow-panel rounded-2xl p-6 mb-5 text-center animate-bounce-in">
          <div className="text-7xl mb-2">{grade.emoji}</div>
          <h1 className={`font-title text-3xl bg-gradient-to-r ${grade.gradient} bg-clip-text text-transparent mb-3`}>
            {grade.text}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">{player.avatar}</span>
            <span className="font-title text-xl text-white">{player.name}</span>
          </div>
          <div className="mt-4">
            <div className="font-score text-4xl font-bold text-amber-400">{player.score.toLocaleString()}</div>
            <div className="text-white/40 text-sm">points</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {stats.map((stat, i) => (
            <div key={i} className="glass-panel rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="text-white font-bold text-sm">{stat.value}</div>
              <div className="text-white/40 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Accuracy bar */}
        <div className="glass-panel rounded-xl p-3 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/50 text-sm">Précision</span>
            <span className="text-white font-bold font-score">{accuracy}%</span>
          </div>
          <div className="progress-bar h-3 rounded-full">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${grade.gradient} transition-all duration-1000`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {/* Achievements */}
        {newAchievements.length > 0 && (
          <div className="mb-5">
            <h3 className="text-amber-400 text-sm font-bold mb-3 text-center">🎉 Succès débloqués !</h3>
            <div className="space-y-2">
              {newAchievements.map(id => {
                const ach = ACHIEVEMENTS.find(a => a.id === id);
                if (!ach) return null;
                return (
                  <div key={id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-pulse-glow">
                    <span className="text-2xl">{ach.icon}</span>
                    <div>
                      <div className="text-white font-bold text-sm">{ach.name}</div>
                      <div className="text-white/50 text-xs">{ach.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onMenu} className="btn-secondary flex-1 py-4 rounded-xl text-sm">🏠 Menu</button>
          <button onClick={onPlayAgain} className="btn-primary flex-1 py-4 rounded-xl text-sm">🔄 Rejouer</button>
        </div>
      </div>
    </div>
  );
};
