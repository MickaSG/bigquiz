import React from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { LeaderboardEntry } from '../types/game';

interface PlayerSelectProps {
  onSelect: (idx: number) => void;
  onLeaderboard: () => void;
  onAchievements: () => void;
}

const PLAYERS = [
  {
    name: 'Micka',
    avatar: '🧠',
    cardType: 'gold' as const,
    position: 'MASTER',
    stats: { QI: 95, SPD: 88, LCK: 77 },
    country: '🇫🇷',
    rating: 94,
  },
  {
    name: 'Pres',
    avatar: '🦊',
    cardType: 'silver' as const,
    position: 'STRAT',
    stats: { QI: 91, SPD: 82, LCK: 85 },
    country: '🇫🇷',
    rating: 91,
  },
  {
    name: 'Bryan',
    avatar: '🐲',
    cardType: 'bronze' as const,
    position: 'TANK',
    stats: { QI: 87, SPD: 93, LCK: 80 },
    country: '🇫🇷',
    rating: 89,
  },
];

export const PlayerSelect: React.FC<PlayerSelectProps> = ({ onSelect, onLeaderboard, onAchievements }) => {
  const [leaderboard] = useLocalStorage<LeaderboardEntry[]>('quiz_leaderboard', []);

  const getPlayerBestScore = (name: string) => {
    const scores = leaderboard.filter(e => e.name === name);
    return scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0;
  };

  const getPlayerGames = (name: string) => {
    return leaderboard.filter(e => e.name === name).length;
  };

  return (
    <div className="min-h-screen bg-main relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-6">
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🕹️</div>
          <h1 className="font-title text-4xl md:text-5xl text-white mb-1 tracking-wide">
            QUIZ<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-amber-400">MASTER</span>
          </h1>
          <p className="text-white/40 text-lg font-medium">Choisis ton joueur</p>
        </div>

        {/* FIFA CARDS */}
        <div className="flex flex-col md:flex-row gap-5 md:gap-6 mb-8 w-full max-w-4xl justify-center items-center">
          {PLAYERS.map((p, idx) => {
            const bestScore = getPlayerBestScore(p.name);
            const games = getPlayerGames(p.name);

            return (
              <button
                key={p.name}
                onClick={() => onSelect(idx)}
                className={`card-${p.cardType} w-[220px] md:w-[240px] rounded-2xl p-1 transition-all duration-300 hover:scale-105 hover:z-10 active:scale-95 cursor-pointer group`}
                style={{ boxShadow: p.cardType === 'gold' ? '0 8px 40px rgba(255, 215, 0, 0.3)' : p.cardType === 'silver' ? '0 8px 40px rgba(192, 192, 208, 0.2)' : '0 8px 40px rgba(205, 127, 50, 0.2)' }}
              >
                <div className="relative rounded-xl overflow-hidden">
                  {/* Rating */}
                  <div className="absolute top-3 left-3 z-10">
                    <div className="font-score text-3xl font-black text-white drop-shadow-lg leading-none">
                      {p.rating}
                    </div>
                    <div className="font-title text-[10px] text-white/80 tracking-widest mt-0.5">{p.position}</div>
                    <div className="text-lg mt-1">{p.country}</div>
                  </div>

                  {/* Avatar zone */}
                  <div className="flex items-center justify-center py-8 pb-4">
                    <div className="text-8xl md:text-9xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      {p.avatar}
                    </div>
                  </div>

                  {/* Name bar */}
                  <div className={`text-center py-2 ${
                    p.cardType === 'gold' ? 'bg-gradient-to-r from-yellow-700/80 via-yellow-500/80 to-yellow-700/80' :
                    p.cardType === 'silver' ? 'bg-gradient-to-r from-gray-600/80 via-gray-400/80 to-gray-600/80' :
                    'bg-gradient-to-r from-amber-800/80 via-amber-600/80 to-amber-800/80'
                  }`}>
                    <div className="font-title text-xl text-white tracking-widest drop-shadow">{p.name.toUpperCase()}</div>
                  </div>

                  {/* Stats */}
                  <div className="px-4 py-3 space-y-1.5">
                    {Object.entries(p.stats).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-white/60 text-xs font-semibold tracking-wider">{key}</span>
                        <div className="flex items-center gap-2 flex-1 ml-3">
                          <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${val >= 90 ? 'bg-green-400' : val >= 80 ? 'bg-yellow-400' : 'bg-orange-400'}`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                          <span className="text-white font-bold text-sm w-6 text-right font-score">{val}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Player record */}
                  <div className={`px-4 py-2 border-t ${
                    p.cardType === 'gold' ? 'border-yellow-600/40' :
                    p.cardType === 'silver' ? 'border-gray-500/40' :
                    'border-amber-700/40'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-white/40">BEST</span>
                        <div className="font-score text-white font-bold">{bestScore > 0 ? bestScore.toLocaleString() : '---'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-white/40">GAMES</span>
                        <div className="font-score text-white font-bold">{games}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom buttons */}
        <div className="flex gap-3 w-full max-w-md">
          <button onClick={onLeaderboard} className="btn-secondary flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            🏆 Classement
          </button>
          <button onClick={onAchievements} className="btn-secondary flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            🏅 Succès
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white/20 text-sm">500 questions · 10 catégories · 3 modes</p>
        </div>
      </div>
    </div>
  );
};


