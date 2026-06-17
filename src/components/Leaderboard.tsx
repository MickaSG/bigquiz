import React, { useState } from 'react';
import { LeaderboardEntry } from '../types/game';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onBack: () => void;
  onClear: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, onBack, onClear }) => {
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'accuracy'>('score');

  const filtered = entries
    .filter(e => filter === 'all' || e.mode === filter)
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      return (b.totalCorrect / b.totalAnswered) - (a.totalCorrect / a.totalAnswered);
    });

  const modes = ['all', 'classique', 'survie', 'blitz'];

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
          <button onClick={onClear} className="p-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 transition-all text-red-300 text-sm">
            🗑️
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {modes.map(m => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                ${filter === m ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}
              `}
            >
              {m === 'all' ? '🌐 Tous' : m === 'classique' ? '📝 Classique' : m === 'survie' ? '💀 Survie' : '⚡ Blitz'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-2 mb-6">
          {(['score', 'date', 'accuracy'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${sortBy === s ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-white/40 hover:bg-white/10'}
              `}
            >
              {s === 'score' ? '⭐ Score' : s === 'date' ? '📅 Date' : '🎯 Précision'}
            </button>
          ))}
        </div>

        {/* Entries */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-white/60 text-lg">Aucun score enregistré</p>
            <p className="text-white/40 text-sm mt-2">Jouez une partie pour apparaître ici !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry, i) => {
              const accuracy = entry.totalAnswered > 0 ? Math.round((entry.totalCorrect / entry.totalAnswered) * 100) : 0;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;

              return (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border transition-all ${
                    i === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 shadow-lg shadow-yellow-500/10' :
                    i === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30' :
                    i === 2 ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border-orange-600/30' :
                    'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg font-bold">
                      {typeof medal === 'string' && medal.length > 2 ? medal : <span className="text-2xl">{medal}</span>}
                    </div>
                    <div className="text-2xl">{entry.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{entry.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{entry.mode}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                        <span>🎯 {accuracy}%</span>
                        <span>🔥 {entry.streak}</span>
                        <span>{entry.totalCorrect}/{entry.totalAnswered}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">{entry.score.toLocaleString()}</div>
                      <div className="text-[10px] text-white/30">{new Date(entry.date).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
