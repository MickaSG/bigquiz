import React from 'react';
import { SavedPlayer, ACHIEVEMENTS } from '../types/game';

interface LeaderboardProps {
  players: SavedPlayer[];
  onBack: () => void;
  onReset: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ players, onBack, onReset }) => {
  const sorted = [...players].sort((a, b) => b.bestScore - a.bestScore);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            🏆 Classement
          </h1>
          <button onClick={onReset} className="p-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 transition-all text-red-300 text-sm" title="Réinitialiser tous les scores">
            🗑️
          </button>
        </div>

        {/* No games played yet */}
        {sorted.every(p => p.totalGames === 0) && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-white/60 text-lg">Aucun score enregistré</p>
            <p className="text-white/40 text-sm mt-2">Jouez une partie pour apparaître ici !</p>
          </div>
        )}

        {/* Podium for top 3 */}
        {sorted.length >= 3 && sorted[0].totalGames > 0 && (
          <div className="mb-8">
            {/* Podium */}
            <div className="flex items-end justify-center gap-3 mb-6">
              {/* 2nd place */}
              {sorted[1].totalGames > 0 && (
                <div className="flex-1 max-w-[180px] text-center">
                  <div className="text-5xl mb-2">{sorted[1].avatar}</div>
                  <div className="text-white font-bold">{sorted[1].name}</div>
                  <div className="text-2xl font-black text-white mb-2">{sorted[1].bestScore.toLocaleString()}</div>
                  <div className="bg-gradient-to-t from-gray-400/20 to-gray-300/10 rounded-t-xl py-6 border-t-2 border-x-2 border-white/20">
                    <div className="text-4xl">🥈</div>
                  </div>
                </div>
              )}

              {/* 1st place */}
              <div className="flex-1 max-w-[220px] text-center">
                <div className="text-6xl mb-2 animate-bounce" style={{ animationDuration: '3s' }}>{sorted[0].avatar}</div>
                <div className="text-white font-bold">{sorted[0].name}</div>
                <div className="text-3xl font-black bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent mb-2">
                  {sorted[0].bestScore.toLocaleString()}
                </div>
                <div className="bg-gradient-to-t from-yellow-500/30 to-amber-500/20 rounded-t-xl py-10 border-t-2 border-x-2 border-yellow-400/40">
                  <div className="text-5xl">🥇</div>
                </div>
              </div>

              {/* 3rd place */}
              {sorted[2].totalGames > 0 && (
                <div className="flex-1 max-w-[180px] text-center">
                  <div className="text-5xl mb-2">{sorted[2].avatar}</div>
                  <div className="text-white font-bold">{sorted[2].name}</div>
                  <div className="text-2xl font-black text-white mb-2">{sorted[2].bestScore.toLocaleString()}</div>
                  <div className="bg-gradient-to-t from-orange-700/20 to-orange-600/10 rounded-t-xl py-4 border-t-2 border-x-2 border-white/20">
                    <div className="text-4xl">🥉</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Ranking List */}
        <div className="space-y-3">
          {sorted.map((player, i) => {
            const rank = i + 1;
            const accuracy = player.totalAnswered > 0 ? Math.round((player.totalCorrect / player.totalAnswered) * 100) : 0;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            return (
              <div
                key={player.id}
                className={`relative overflow-hidden p-4 rounded-2xl border transition-all ${
                  rank === 1 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 shadow-lg shadow-yellow-500/10' :
                  rank === 2 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30' :
                  rank === 3 ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border-orange-600/30' :
                  'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold text-white shrink-0">
                    {medal}
                  </div>

                  {/* Avatar */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${player.color} flex items-center justify-center text-3xl shrink-0 shadow-lg`}>
                    {player.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-lg">{player.name}</span>
                      {player.emoji && <span className="text-sm">{player.emoji}</span>}
                      {player.totalGames > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                          {player.bestMode}
                        </span>
                      )}
                    </div>

                    {player.totalGames > 0 ? (
                      <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                        <span>🎯 {accuracy}%</span>
                        <span>🔥 {player.bestStreak}</span>
                        <span>🎮 {player.totalGames} partie{player.totalGames > 1 ? 's' : ''}</span>
                        <span>🏅 {player.achievements.length}/{ACHIEVEMENTS.length}</span>
                      </div>
                    ) : (
                      <div className="text-white/30 text-xs mt-1 italic">Pas encore joué</div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black text-white">{player.bestScore.toLocaleString()}</div>
                    <div className="text-[10px] text-white/30">pts</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
