import React from 'react';
import { SavedPlayer } from '../types/game';

interface PlayerSelectProps {
  players: SavedPlayer[];
  onSelect: (player: SavedPlayer) => void;
}

export const PlayerSelect: React.FC<PlayerSelectProps> = ({ players, onSelect }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '3s' }}>🎮</div>
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent mb-2">
          Qui joue ?
        </h1>
        <p className="text-white/40">Choisissez votre combattant !</p>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => onSelect(player)}
            className="group relative overflow-hidden rounded-3xl p-6 text-left transition-all hover:scale-[1.03] active:scale-95"
          >
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${player.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
            <div className="absolute inset-0 bg-white/5 border-2 border-white/10 rounded-3xl group-hover:border-white/30 transition-all" />

            {/* Content */}
            <div className="relative z-10">
              {/* Avatar */}
              <div className="text-6xl mb-3 group-hover:scale-110 transition-transform duration-300">
                {player.avatar}
              </div>

              {/* Name */}
              <h2 className="text-2xl font-black text-white mb-1">{player.name}</h2>

              {/* Signature emoji */}
              <div className="text-xs text-white/40 flex items-center gap-1 mb-4">
                <span>{player.emoji}</span>
                <span className="uppercase tracking-wider">Le guerrier</span>
              </div>

              {/* Stats */}
              {player.totalGames > 0 ? (
                <div className="space-y-1.5 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Meilleur score</span>
                    <span className="text-white font-bold">{player.bestScore.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Parties jouées</span>
                    <span className="text-white/60">{player.totalGames}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Meilleure série</span>
                    <span className="text-orange-400 font-bold">🔥 {player.bestStreak}</span>
                  </div>
                  {player.bestAccuracy > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40">Meilleure précision</span>
                      <span className="text-emerald-400 font-bold">{player.bestAccuracy}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-white/30 text-sm pt-3 border-t border-white/10 italic">
                  Pas encore de partie 🎯
                </div>
              )}
            </div>

            {/* Hover shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        ))}
      </div>

      {/* Footer info */}
      <div className="mt-8 text-center text-white/30 text-xs">
        💾 Vos meilleurs scores sont sauvegardés automatiquement
      </div>
    </div>
  );
};
