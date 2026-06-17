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

  const grade = accuracy >= 90 ? { emoji: '🏆', text: 'LÉGENDAIRE !', color: 'from-yellow-400 to-amber-500' } :
    accuracy >= 70 ? { emoji: '🌟', text: 'EXCELLENT !', color: 'from-emerald-400 to-teal-500' } :
    accuracy >= 50 ? { emoji: '👍', text: 'PAS MAL !', color: 'from-blue-400 to-cyan-500' } :
    accuracy >= 30 ? { emoji: '📚', text: 'PEUT MIEUX FAIRE', color: 'from-amber-400 to-orange-500' } :
    { emoji: '💪', text: 'CONTINUE !', color: 'from-red-400 to-pink-500' };

  const stats = [
    { label: 'Score Total', value: player.score.toLocaleString(), icon: '⭐' },
    { label: 'Bonnes Réponses', value: `${player.totalCorrect}/${player.totalAnswered}`, icon: '✅' },
    { label: 'Précision', value: `${accuracy}%`, icon: '🎯' },
    { label: 'Meilleure Série', value: player.maxStreak.toString(), icon: '🔥' },
    { label: 'Bonus Temps', value: `+${player.timeBonus}`, icon: '⏱️' },
    { label: 'Mode', value: mode, icon: '🎮' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Grade */}
        <div className="text-center mb-8 animate-bounce-in">
          <div className="text-7xl mb-3">{grade.emoji}</div>
          <h1 className={`text-4xl font-black bg-gradient-to-r ${grade.color} bg-clip-text text-transparent`}>
            {grade.text}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-3xl">{player.avatar}</span>
            <span className="text-xl text-white font-bold">{player.name}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 text-center"
              style={{ animationDelay: `${i * 100}ms` }}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Accuracy Bar */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Précision</span>
            <span className="text-white font-bold">{accuracy}%</span>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${grade.color} transition-all duration-1000`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {/* New Achievements */}
        {newAchievements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white/60 text-sm font-medium mb-3 text-center">🎉 Nouveaux Succès Débloqués !</h3>
            <div className="space-y-2">
              {newAchievements.map(id => {
                const ach = ACHIEVEMENTS.find(a => a.id === id);
                if (!ach) return null;
                return (
                  <div key={id} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 animate-pulse">
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
          <button
            onClick={onMenu}
            className="flex-1 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-all active:scale-95"
          >
            🏠 Menu
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95"
          >
            🔄 Rejouer
          </button>
        </div>
      </div>
    </div>
  );
};
